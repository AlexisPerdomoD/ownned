package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"ownned/internal/adapter/inbound/httpapi"
	"ownned/internal/adapter/outbound/cripto"
	"ownned/internal/adapter/outbound/postgres"
	storageadapter "ownned/internal/adapter/outbound/storage"
	appauth "ownned/internal/app/auth"
	"ownned/internal/app/group"
	"ownned/internal/app/node"
	"ownned/internal/app/tx"
	"ownned/internal/app/usr"
	"ownned/internal/config"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

type typedTxFactory[T tx.TxCtx] struct {
	inner tx.TxFactory[*postgres.TxRunner]
	adapt func(*postgres.TxRunner) T
}

func (f typedTxFactory[T]) Do(ctx context.Context, fn func(T) error) error {
	return f.inner.Do(ctx, func(runner *postgres.TxRunner) error {
		return fn(f.adapt(runner))
	})
}

type createUsrTxAdapter struct {
	*postgres.TxRunner
}

func (t createUsrTxAdapter) NodeRepository() usr.NodeCreator {
	return t.TxRunner.NodeRepository()
}

func (t createUsrTxAdapter) GroupRepository() usr.GroupCreator {
	return t.TxRunner.GroupRepository()
}

func (t createUsrTxAdapter) GroupUsrRepository() usr.GroupUsrUpsertor {
	return t.TxRunner.GroupUsrRepository()
}

func (t createUsrTxAdapter) GroupNodeRepository() usr.GroupNodeUpsertor {
	return t.TxRunner.GroupNodeRepository()
}

func main() {
	cfg := config.LoadEnvConfig()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	db, err := postgres.NewDB(cfg.PgDB, cfg.PgHost, cfg.PgPort, cfg.PgUser, cfg.PgPassword, cfg.PgSsl)
	if err != nil {
		logger.Error("failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer func() { _ = db.Close() }()
	if err := postgres.MigrateUp(db.DB); err != nil {
		logger.Error("failed to migrate database", "err", err)
		os.Exit(1)
	}

	jwtManager := cripto.NewJWTManagerST([]byte(cfg.SessionSecret), time.Hour, "ownned")
	pwdHasher := cripto.NewPwdHasherArgon2(
		cfg.PwdTime,
		cfg.PwdMemKiB,
		cfg.PwdThreads,
		cfg.PwdHashLen,
		cfg.PwdSaltLen,
	)
	fileStorage := storageadapter.NewStorageManagerFS(cfg.LocalStorageDir)

	usrRepository := postgres.NewUsrRepository(db)
	usrPwdRepository := postgres.NewUsrPwdRepository(db)
	nodeRepository := postgres.NewNodeRepository(db)
	nodeCommentRepository := postgres.NewNodeCommentRepository(db)
	groupRepository := postgres.NewGroupRepository(db)
	groupNodeRepository := postgres.NewGroupNodeRepository(db)
	groupUsrRepository := postgres.NewGroupUsrRepository(db)
	docRepository := postgres.NewDocRepository(db)
	baseTxFactory := postgres.NewUnitOfWorkFactory(db, logger, 30*time.Second)

	usrTxFactory := typedTxFactory[usr.CreateUsrTx]{
		inner: baseTxFactory,
		adapt: func(runner *postgres.TxRunner) usr.CreateUsrTx {
			return createUsrTxAdapter{TxRunner: runner}
		},
	}
	groupTxFactory := typedTxFactory[group.CreateGroupNodeTx]{
		inner: baseTxFactory,
		adapt: func(runner *postgres.TxRunner) group.CreateGroupNodeTx { return runner },
	}
	nodeFileTxFactory := typedTxFactory[node.CreateNodeFileTx]{
		inner: baseTxFactory,
		adapt: func(runner *postgres.TxRunner) node.CreateNodeFileTx { return runner },
	}

	authMiddleware := httpapi.NewAuthMiddleware(jwtManager)

	// Group use cases and routes.
	getGroup := group.NewGetGroupUseCase(groupRepository, groupUsrRepository, usrRepository, nodeRepository)
	paginateGroup := group.NewPaginateGroupUseCase(groupRepository)
	createGroup := group.NewCreateGroupUseCase(groupTxFactory)
	updateGroup := group.NewUpdateGroupUseCase(groupRepository)
	deleteGroup := group.NewDeleteGroupUseCase(groupRepository, groupUsrRepository)
	createGroupNode := group.NewCreateGroupNodeUseCase(groupNodeRepository, groupUsrRepository)
	deleteGroupNode := group.NewDeleteGroupNodeUseCase(groupNodeRepository, groupUsrRepository)
	upsertGroupUsr := group.NewUpsertGroupUsrUseCase(groupUsrRepository, usrRepository)
	deleteGroupUsr := group.NewDeleteGroupUsrUseCase(groupUsrRepository)
	groupHandler := httpapi.NewGroupHandler(
		getGroup,
		paginateGroup,
		createGroup,
		updateGroup,
		deleteGroup,
		createGroupNode,
		deleteGroupNode,
		upsertGroupUsr,
		deleteGroupUsr,
	)
	groupRouter := chi.NewRouter()
	groupRouter.Post("/", authMiddleware.IsAuthenticated(groupHandler.CreateGroupHandler))
	groupRouter.Get("/{groupID}", authMiddleware.IsAuthenticated(groupHandler.GetGroupHandler))
	groupRouter.Patch("/{groupID}", authMiddleware.IsAuthenticated(groupHandler.UpdateGroupHandler))
	groupRouter.Get("/paginate", authMiddleware.IsAuthenticated(groupHandler.PaginateGroupHandler))
	groupRouter.Delete("/{groupID}", authMiddleware.IsAuthenticated(groupHandler.DeleteGroupHandler))
	groupRouter.Post("/{groupID}/nodes", authMiddleware.IsAuthenticated(groupHandler.CreateGroupNodeHandler))
	groupRouter.Delete("/{groupID}/nodes/{nodeID}", authMiddleware.IsAuthenticated(groupHandler.DeleteGroupNodeHandler))
	groupRouter.Post("/{groupID}/users", authMiddleware.IsAuthenticated(groupHandler.UpsertGroupUsrHandler))
	groupRouter.Delete("/{groupID}/users/{usrID}", authMiddleware.IsAuthenticated(groupHandler.DeleteGroupUsrHandler))

	// User and authentication use cases and routes.
	createUsr := usr.NewCreateUsrUseCase(usrRepository, usrTxFactory, pwdHasher, logger)
	getUsr := usr.NewGetUsrUseCase(usrRepository)
	getMe := usr.NewGetMeUseCase(usrRepository)
	paginateUsr := usr.NewPaginateUsrUseCase(usrRepository)
	loginPwd := appauth.NewLoginPwdUseCase(usrRepository, usrPwdRepository, pwdHasher, jwtManager)

	secure := cfg.Mode != "local"
	sameSite := http.SameSiteStrictMode
	if cfg.Mode == "local" {
		sameSite = http.SameSiteLaxMode
	}
	usrHandler := httpapi.NewUsrHandler(createUsr, getMe, getUsr, paginateUsr)
	authHandler := httpapi.NewAuthHandler(loginPwd, httpapi.AuthHandlerConfig{Secure: secure, SameSite: sameSite})
	usrRouter := chi.NewRouter()
	usrRouter.Get("/me", authMiddleware.IsAuthenticated(usrHandler.GetMeHandler))
	usrRouter.Get("/{usrID}", authMiddleware.IsAuthenticated(usrHandler.GetUsrHandler))
	usrRouter.Get("/paginate", authMiddleware.IsAuthenticated(usrHandler.PaginateUsrHandler))
	usrRouter.Post("/", authMiddleware.IsSuperUsr(usrHandler.CreateUsrHandler))
	usrRouter.Post("/login", authHandler.LoginPwdHandler)
	usrRouter.Delete("/logout", authHandler.LogoutUsrHandler)

	// Node, document and comment use cases. Their HTTP handlers share NodeHandler.
	accessChecker := group.NewAccessChecker(groupUsrRepository)
	getRoot := node.NewGetRootNodesUseCase(nodeRepository, groupRepository, logger)
	getNode := node.NewGetNodeByIDUseCase(accessChecker, nodeRepository, docRepository, logger)
	createNodeFolder := node.NewCreateNodeFolderUseCase(accessChecker, nodeRepository)
	createNodeFile := node.NewCreateDocUseCase(
		docRepository,
		nodeRepository,
		accessChecker,
		nodeFileTxFactory,
		fileStorage,
		logger,
	)
	deleteNode := node.NewDeleteNodeUseCase(accessChecker, nodeRepository, docRepository, fileStorage, logger)
	deleteNodeFile := node.NewDeleteDocUseCase(accessChecker, fileStorage, docRepository, nodeRepository, logger)
	downloadNodeFile := node.NewDownloadDocUseCase(accessChecker, nodeRepository, docRepository, fileStorage)
	getNodeComments := node.NewGetNodeCommentsUseCase(accessChecker, nodeRepository, nodeCommentRepository)
	createNodeComment := node.NewCreateNodeCommentUseCase(accessChecker, nodeRepository, nodeCommentRepository, logger)
	updateNodeComment := node.NewUpdateNodeCommentUseCase(nodeCommentRepository)
	deleteNodeComment := node.NewDeleteNodeCommentUseCase(accessChecker, nodeRepository, nodeCommentRepository)
	nodeHandler := httpapi.NewNodeHandler(
		getRoot,
		getNode,
		downloadNodeFile,
		createNodeFolder,
		createNodeFile,
		deleteNode,
		deleteNodeFile,
		getNodeComments,
		createNodeComment,
		updateNodeComment,
		deleteNodeComment,
	)
	nodeRouter := chi.NewRouter()
	nodeRouter.Get("/", authMiddleware.IsAuthenticated(nodeHandler.GetRootHandler))
	nodeRouter.Post("/", authMiddleware.IsAuthenticated(nodeHandler.CreateFolderHandler))
	nodeRouter.Get("/{nodeID}", authMiddleware.IsAuthenticated(nodeHandler.GetNodeHandler))
	nodeRouter.Get("/{nodeID}/comments", authMiddleware.IsAuthenticated(nodeHandler.GetNodeCommentsHandler))
	nodeRouter.Post("/{nodeID}/comments", authMiddleware.IsAuthenticated(nodeHandler.CreateNodeCommentHandler))

	commentRouter := chi.NewRouter()
	commentRouter.Patch("/{nodeCommentID}", authMiddleware.IsAuthenticated(nodeHandler.UpdateNodeCommentHandler))
	commentRouter.Delete("/{nodeCommentID}", authMiddleware.IsAuthenticated(nodeHandler.DeleteNodeCommentHandler))

	docRouter := chi.NewRouter()
	docRouter.Post("/", authMiddleware.IsAuthenticated(nodeHandler.CreateNodeFileHandler))
	docRouter.Delete("/{docID}", authMiddleware.IsAuthenticated(nodeHandler.DeleteDocHandler))
	docRouter.Get("/{docID}/download", authMiddleware.IsAuthenticated(nodeHandler.DownloadNodeFileHandler))

	router := chi.NewRouter()
	if cfg.Mode == "local" {
		router.Use(cors.Handler(cors.Options{
			AllowedOrigins:   []string{"http://localhost:5173"},
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
			AllowedHeaders:   []string{"Accept", "Content-Type"},
			AllowCredentials: true,
			MaxAge:           300,
		}))
	}

	router.Mount("/api/v1/groups", groupRouter)
	router.Mount("/api/v1/usrs", usrRouter)
	router.Mount("/api/v1/nodes", nodeRouter)
	router.Mount("/api/v1/comments", commentRouter)
	router.Mount("/api/v1/docs", docRouter)

	if cfg.ServeWebApp {
		router.Handle("/assets/*", http.StripPrefix("/assets/", http.FileServer(http.Dir("web/dist/assets"))))
		router.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, "web/dist/index.html")
		}))
	}

	logger.Info("server starting", "mode", cfg.Mode, "port", cfg.Port, "serveWebApp", cfg.ServeWebApp)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.Port), router); err != nil {
		logger.Error("server stopped", "err", err)
		os.Exit(1)
	}
}
