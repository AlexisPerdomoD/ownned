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
	"ownned/web"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func main() {
	cfg := config.LoadEnvConfig()
	alog := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	db, err := postgres.NewDB(cfg.PgDB, cfg.PgHost, cfg.PgPort, cfg.PgUser, cfg.PgPassword, cfg.PgSsl)
	if err != nil {
		alog.Error("failed to connect to database", "err", err)
		os.Exit(1)
	}

	defer func() { _ = db.Close() }()
	if err := postgres.MigrateUp(db.DB); err != nil {
		alog.Error("failed to migrate database", "err", err)
		os.Exit(1)
	}

	var (
		jwt       = cripto.NewJWTManagerST([]byte(cfg.SessionSecret), time.Hour, "ownned")
		pwdHasher = cripto.NewPwdHasherArgon2(
			cfg.PwdTime,
			cfg.PwdMemKiB,
			cfg.PwdThreads,
			cfg.PwdHashLen,
			cfg.PwdSaltLen,
		)
	)

	fileStorage := storageadapter.NewStorageManagerFS(cfg.LocalStorageDir)

	var (
		usrs             = postgres.NewUsrRepository(db)
		usrPwds          = postgres.NewUsrPwdRepository(db)
		nodes            = postgres.NewNodeRepository(db)
		nodeComments     = postgres.NewNodeCommentRepository(db)
		docs             = postgres.NewDocRepository(db)
		groups           = postgres.NewGroupRepository(db)
		groupNodes       = postgres.NewGroupNodeRepository(db)
		groupUsrs        = postgres.NewGroupUsrRepository(db)
		createGroupTx    = postgres.NewCreateGroupTxFactory(db, alog, time.Duration(30*time.Second))
		createUsrTx      = postgres.NewCreateUsrTxFactory(db, alog, time.Duration(30*time.Second))
		createNodeFileTx = postgres.NewCreateNodeFileTxFactory(db, alog, time.Duration(30*time.Second))
	)

	// AUTH USECASES
	loginPwd := appauth.NewLoginPwdUseCase(usrs, usrPwds, pwdHasher, jwt)

	am := httpapi.NewAuthMiddleware(jwt)

	// GROUP USECASES
	var (
		getGroup        = group.NewGetGroupUseCase(groups, groupUsrs, usrs, nodes)
		paginateGroup   = group.NewPaginateGroupUseCase(groups)
		createGroup     = group.NewCreateGroupUseCase(createGroupTx)
		updateGroup     = group.NewUpdateGroupUseCase(groups)
		deleteGroup     = group.NewDeleteGroupUseCase(groups, groupUsrs)
		createGroupNode = group.NewCreateGroupNodeUseCase(groupNodes, groupUsrs)
		deleteGroupNode = group.NewDeleteGroupNodeUseCase(groupNodes, groupUsrs)
		upsertGroupUsr  = group.NewUpsertGroupUsrUseCase(groupUsrs, usrs)
		deleteGroupUsr  = group.NewDeleteGroupUsrUseCase(groupUsrs)
	)

	// USER USECASES
	var (
		createUsr   = usr.NewCreateUsrUseCase(usrs, createUsrTx, pwdHasher, alog)
		getUsr      = usr.NewGetUsrUseCase(usrs)
		getMe       = usr.NewGetMeUseCase(usrs)
		paginateUsr = usr.NewPaginateUsrUseCase(usrs)
	)

	// NODE USECASES
	var (
		ac                = group.NewAccessChecker(groupUsrs)
		getRoot           = node.NewGetRootNodesUseCase(ac, nodes, groups, alog)
		getNode           = node.NewGetNodeByIDUseCase(ac, nodes, docs, alog)
		paginateNode      = node.NewPaginateNodeUseCase(nodes, groups)
		paginateDoc       = node.NewPaginateDocUseCase(docs, groups)
		createNodeFolder  = node.NewCreateNodeFolderUseCase(ac, nodes)
		createNodeFile    = node.NewCreateDocUseCase(docs, nodes, ac, createNodeFileTx, fileStorage, alog)
		deleteNode        = node.NewDeleteNodeUseCase(ac, nodes, docs, fileStorage, alog)
		deleteNodeFile    = node.NewDeleteDocUseCase(ac, fileStorage, docs, nodes, alog)
		downloadNodeFile  = node.NewDownloadDocUseCase(ac, nodes, docs, fileStorage)
		getNodeComments   = node.NewGetNodeCommentsUseCase(ac, nodes, nodeComments)
		createNodeComment = node.NewCreateNodeCommentUseCase(ac, nodes, nodeComments, alog)
		updateNodeComment = node.NewUpdateNodeCommentUseCase(nodeComments)
		deleteNodeComment = node.NewDeleteNodeCommentUseCase(ac, nodes, nodeComments)
	)

	// MAIN ROUTER

	r := chi.NewRouter()
	r.Use(httpapi.RequestLogger)

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

	httpapi.NewAuthHandler(
		loginPwd, httpapi.AuthHandlerConfig{Secure: secure, SameSite: sameSite}).
		MountV1(r)
	httpapi.NewGroupHandler(
		getGroup, paginateGroup, createGroup, updateGroup, deleteGroup, createGroupNode, deleteGroupNode, upsertGroupUsr, deleteGroupUsr, am).
		MountV1(r)
	httpapi.NewUsrHandler(
		createUsr, getMe, getUsr, paginateUsr, am).
		MountV1(r)
	httpapi.NewNodeHandler(
		getRoot, getNode, paginateNode, paginateDoc, downloadNodeFile, createNodeFolder, createNodeFile, deleteNode, deleteNodeFile, getNodeComments, createNodeComment, updateNodeComment, deleteNodeComment, am).
		MountV1(r)

	if cfg.ServeWebApp {
		httpapi.RegisterFrontend(r, web.EmbeddedClient)
	}

	httpapi.PresentRouter(r)
	alog.Info("server starting", "mode", cfg.Mode, "port", cfg.Port, "serveWebApp", cfg.ServeWebApp)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.Port), r); err != nil {
		alog.Error("server stopped", "err", err)
		os.Exit(1)
	}
}
