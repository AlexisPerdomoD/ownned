package main

import (
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
	"ownned/internal/app/usr"
	"ownned/internal/config"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

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

	jwt := cripto.NewJWTManagerST([]byte(cfg.SessionSecret), time.Hour, "ownned")

	pwdHasher := cripto.NewPwdHasherArgon2(
		cfg.PwdTime,
		cfg.PwdMemKiB,
		cfg.PwdThreads,
		cfg.PwdHashLen,
		cfg.PwdSaltLen,
	)

	fileStorage := storageadapter.NewStorageManagerFS(cfg.LocalStorageDir)

	usrs := postgres.NewUsrRepository(db)
	usrPwds := postgres.NewUsrPwdRepository(db)
	nodes := postgres.NewNodeRepository(db)
	nodeComments := postgres.NewNodeCommentRepository(db)
	docs := postgres.NewDocRepository(db)
	groups := postgres.NewGroupRepository(db)
	groupNodes := postgres.NewGroupNodeRepository(db)
	groupUsrs := postgres.NewGroupUsrRepository(db)

	txTimeout := time.Duration(30 * time.Second)
	createGroupTx := postgres.NewCreateGroupTxFactory(db, logger, txTimeout)
	createUsrTx := postgres.NewCreateUsrTxFactory(db, logger, txTimeout)
	createNodeFileTx := postgres.NewCreateNodeFileTxFactory(db, logger, txTimeout)

	// AUTH USECASES
	loginPwd := appauth.NewLoginPwdUseCase(usrs, usrPwds, pwdHasher, jwt)

	am := httpapi.NewAuthMiddleware(jwt)

	// GROUP USECASES
	getGroup := group.NewGetGroupUseCase(groups, groupUsrs, usrs, nodes)
	paginateGroup := group.NewPaginateGroupUseCase(groups)

	createGroup := group.NewCreateGroupUseCase(createGroupTx)
	updateGroup := group.NewUpdateGroupUseCase(groups)
	deleteGroup := group.NewDeleteGroupUseCase(groups, groupUsrs)
	createGroupNode := group.NewCreateGroupNodeUseCase(groupNodes, groupUsrs)
	deleteGroupNode := group.NewDeleteGroupNodeUseCase(groupNodes, groupUsrs)
	upsertGroupUsr := group.NewUpsertGroupUsrUseCase(groupUsrs, usrs)
	deleteGroupUsr := group.NewDeleteGroupUsrUseCase(groupUsrs)

	// USER USECASES
	createUsr := usr.NewCreateUsrUseCase(usrs, createUsrTx, pwdHasher, logger)
	getUsr := usr.NewGetUsrUseCase(usrs)
	getMe := usr.NewGetMeUseCase(usrs)
	paginateUsr := usr.NewPaginateUsrUseCase(usrs)

	// NODE USECASES
	accessChecker := group.NewAccessChecker(groupUsrs)
	getRoot := node.NewGetRootNodesUseCase(accessChecker, nodes, groups, logger)
	getNode := node.NewGetNodeByIDUseCase(accessChecker, nodes, docs, logger)
	paginateNode := node.NewPaginateNodeUseCase(nodes, groups)
	paginateDoc := node.NewPaginateDocUseCase(docs, groups)
	createNodeFolder := node.NewCreateNodeFolderUseCase(accessChecker, nodes)
	createNodeFile := node.NewCreateDocUseCase(
		docs,
		nodes,
		accessChecker,
		createNodeFileTx,
		fileStorage,
		logger,
	)
	deleteNode := node.NewDeleteNodeUseCase(accessChecker, nodes, docs, fileStorage, logger)
	deleteNodeFile := node.NewDeleteDocUseCase(accessChecker, fileStorage, docs, nodes, logger)
	downloadNodeFile := node.NewDownloadDocUseCase(accessChecker, nodes, docs, fileStorage)
	getNodeComments := node.NewGetNodeCommentsUseCase(accessChecker, nodes, nodeComments)
	createNodeComment := node.NewCreateNodeCommentUseCase(accessChecker, nodes, nodeComments, logger)
	updateNodeComment := node.NewUpdateNodeCommentUseCase(nodeComments)
	deleteNodeComment := node.NewDeleteNodeCommentUseCase(accessChecker, nodes, nodeComments)

	// MAIN ROUTER

	r := chi.NewRouter()

	if cfg.Mode == "local" {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   []string{"http://localhost:5173"},
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
			AllowedHeaders:   []string{"Accept", "Content-Type"},
			AllowCredentials: true,
			MaxAge:           300,
		}))
	}

	secure := cfg.Mode != "local"
	sameSite := http.SameSiteStrictMode
	if cfg.Mode == "local" {
		sameSite = http.SameSiteLaxMode
	}

	httpapi.NewAuthHandler(loginPwd, httpapi.AuthHandlerConfig{Secure: secure, SameSite: sameSite}).MountV1(r)

	httpapi.NewGroupHandler(
		getGroup,
		paginateGroup,
		createGroup,
		updateGroup,
		deleteGroup,
		createGroupNode,
		deleteGroupNode,
		upsertGroupUsr,
		deleteGroupUsr,
		am,
	).MountV1(r)

	httpapi.NewUsrHandler(createUsr, getMe, getUsr, paginateUsr, am).MountV1(r)

	httpapi.NewNodeHandler(
		getRoot,
		getNode,
		paginateNode,
		paginateDoc,
		downloadNodeFile,
		createNodeFolder,
		createNodeFile,
		deleteNode,
		deleteNodeFile,
		getNodeComments,
		createNodeComment,
		updateNodeComment,
		deleteNodeComment,
		am,
	).MountV1(r)

	if cfg.ServeWebApp {
		r.Handle("/assets/*", http.StripPrefix("/assets/", http.FileServer(http.Dir("web/dist/assets"))))
		r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, "web/dist/index.html")
		}))
	}

	httpapi.PresentRouter(r)
	logger.Info("server starting", "mode", cfg.Mode, "port", cfg.Port, "serveWebApp", cfg.ServeWebApp)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.Port), r); err != nil {
		logger.Error("server stopped", "err", err)
		os.Exit(1)
	}
}
