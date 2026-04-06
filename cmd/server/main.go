package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"ownned/internal/application/usecase"
	"ownned/internal/infrastructure/config"
	"ownned/internal/infrastructure/db/pg"
	"ownned/internal/infrastructure/serv"
	"ownned/internal/infrastructure/transport/http/handler"
	"ownned/internal/infrastructure/transport/http/middleware"
)

// TODO: move to other place shit
func logRoutes(r chi.Router) {
	methodColors := map[string]string{
		"GET":    "\033[32m", // verde
		"POST":   "\033[34m", // azul
		"PUT":    "\033[33m", // amarillo
		"PATCH":  "\033[33m", // amarillo
		"DELETE": "\033[31m", // rojo
	}

	const (
		reset = "\033[0m"
		bold  = "\033[1m"
	)

	type routeEntry struct {
		methods []string
		path    string
	}
	grouped := make(map[string]*routeEntry)
	order := []string{}

	if err := chi.Walk(r,
		func(method, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
			if _, exists := grouped[route]; !exists {
				grouped[route] = &routeEntry{path: route}
				order = append(order, route)
			}
			grouped[route].methods = append(grouped[route].methods, method)
			return nil
		}); err != nil {
		fmt.Println(err)
		return
	}

	fmt.Println(bold + "registered routes:" + reset)
	for idx, path := range order {
		entry := grouped[path]
		coloredMethods := make([]string, len(entry.methods))
		for i, m := range entry.methods {
			color, ok := methodColors[m]
			if !ok {
				color = "\033[37m"
			}
			coloredMethods[i] = color + bold + m + reset
		}
		fmt.Printf("  %2d. %s%-45s%s %s\n",
			idx+1,
			bold, entry.path, reset,
			strings.Join(coloredMethods, " "),
		)
	}
}

// START POINT BABY
func main() {
	// =========================================================================
	// CONFIG
	// =========================================================================

	cfg := config.LoadEnvConfig()

	// =========================================================================
	// DB
	// =========================================================================

	db, err := pg.
		NewDB(
			cfg.PgDB,
			cfg.PgHost,
			cfg.PgPort,
			cfg.PgUser,
			cfg.PgPassword,
			cfg.PgSsl)
	if err != nil {
		panic(err)
	}
	if err := pg.MigrateUp(db.DB); err != nil {
		panic(err)
	}
	// =========================================================================
	// SERVICES
	// =========================================================================

	lg := slog.New(slog.
		NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	jwtManager := serv.
		NewJWTManagerST(
			[]byte(cfg.SessionSecret),
			time.Hour,
			"ownned")
	pwdHasher := serv.
		NewPwdHasherArgon2(
			cfg.PwdTime,
			cfg.PwdMemKiB,
			cfg.PwdThreads,
			cfg.PwdHashLen,
			cfg.PwdSaltLen)
	storage := serv.
		NewStorageManagerFS(cfg.LocalStorageDir)

	// =========================================================================
	// REPOSITORIES
	// =========================================================================

	usrRepository := pg.
		NewUsrRepository(db)
	usrPwdRepository := pg.
		NewUsrPwdRepository(db)
	nodeRepository := pg.
		NewNodeRepository(db)
	nodeCommentRepository := pg.
		NewNodeCommentRepository(db)
	groupRepository := pg.
		NewGroupRepository(db)
	groupNodeRepository := pg.
		NewGroupNodeRepository(db)
	groupUsrRepository := pg.
		NewGroupUsrRepository(db)
	docRepository := pg.
		NewDocRepository(db)
	unitOfWorkFactory := pg.
		NewUnitOfWorkFactory(db, lg, time.Second*30)

	// =========================================================================
	// MIDLEWARES
	// =========================================================================

	authM := middleware.
		NewAuthMiddleware(jwtManager)

	// =========================================================================
	// GROUPS ROUTES
	// =========================================================================

	getGroup := usecase.
		NewGetGroupUseCase(
			usrRepository,
			nodeRepository,
			groupRepository,
			groupUsrRepository)
	paginateGroup := usecase.
		NewPaginateGroupUseCase(groupRepository)
	updateGroup := usecase.
		// TODO: add swagger doc here
		NewUpdateGroupUseCase(groupRepository)
	createGroup := usecase.
		NewCreateGroupUseCase(unitOfWorkFactory)
	deleteGroup := usecase.
		NewDeleteGroupUseCase(
			groupRepository,
			groupUsrRepository)
	createGroupNode := usecase.
		NewCreateGroupNodeUseCase(
			groupRepository,
			groupNodeRepository,
			groupUsrRepository,
			nodeRepository)
	deleteGroupNode := usecase.
		NewDeleteGroupNodeUseCase(
			groupRepository,
			groupNodeRepository,
			groupUsrRepository)
	upsertGroupUsr := usecase.
		NewUpsertGroupUsrUseCase(
			usrRepository,
			groupUsrRepository)
	deleteGroupUsr := usecase.
		NewDeleteGroupUsrUseCase(
			groupUsrRepository)

	// ROUTES
	groupH := handler.
		NewGroupHandler(
			getGroup,
			paginateGroup,
			createGroup,
			updateGroup,
			deleteGroup,
			createGroupNode,
			deleteGroupNode,
			upsertGroupUsr,
			deleteGroupUsr)
	groupR := chi.NewRouter()

	groupR.Post("/", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(groupH.CreateGroupHandler))

	groupR.Get("/{groupID}", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(groupH.GetGroupHandler))

	groupR.Patch("/{groupID}", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(groupH.UpdateGroupHandler))

	groupR.Get("/paginate", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(groupH.PaginateGroupHandler))

	groupR.Delete("/{groupID}", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(groupH.DeleteGroupHandler))

	groupR.Post("/{groupID}/nodes", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(groupH.CreateGroupNodeHandler))

	groupR.Delete("/{groupID}/nodes/{nodeID}", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(groupH.DeleteGroupNodeHandler))

	groupR.Post("/{groupID}/users", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(groupH.UpsertGroupUsrHandler))

	groupR.Delete("/{groupID}/users/{usrID}", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(groupH.DeleteGroupUsrHandler))

	// =========================================================================
	// USERS ROUTES
	// =========================================================================

	createUsr := usecase.
		NewCreateUsrUseCase(
			usrRepository,
			unitOfWorkFactory,
			pwdHasher,
			lg)
	getUsr := usecase.
		NewGetUsrUseCase(usrRepository)
	getMe := usecase.
		NewGetMeUseCase(usrRepository)
	paginateUsr := usecase.
		NewPaginateUsrUseCase(usrRepository)
	loginUsr := usecase.
		NewLoginUsrUseCase(
			usrRepository,
			usrPwdRepository,
			pwdHasher,
			jwtManager)

	// ROUTES
	usrH := handler.
		NewUsrHandler(
			loginUsr,
			createUsr,
			getMe,
			getUsr,
			paginateUsr,
			handler.UsrHandlerConfig{
				Secure:   cfg.Mode != "local",
				SameSite: http.SameSiteLaxMode,
			})
	usrR := chi.NewRouter()
	usrR.Get("/me", authM.
		IsAuthenticated(usrH.GetMeHandler))
	usrR.Get("/{usrID}", authM.
		IsAuthenticated(usrH.GetUsrHandler))
	usrR.Get("/paginate", authM.
		IsAuthenticated(usrH.PaginateUsrHandler))
	usrR.Post("/", authM.
		IsSuperUsr(usrH.CreateUsrHandler))
	usrR.Post("/login", usrH.LoginUsrHandler)
	usrR.Delete("/logout", usrH.LogoutUsrHandler)

	// =========================================================================
	// NODES ROUTES
	// =========================================================================

	getRoot := usecase.
		NewGetRootNodesUseCase(
			nodeRepository,
			groupRepository,
			lg)
	createFolder := usecase.
		NewCreateFolderUseCase(
			nodeRepository,
			groupUsrRepository)
	getNode := usecase.
		NewGetNodeByIDUseCase(
			nodeRepository,
			docRepository,
			groupUsrRepository,
			lg)

	// NODES
	nodeH := handler.
		NewNodeHandler(
			getRoot,
			createFolder,
			getNode)
	nodeR := chi.NewRouter()
	nodeR.Get("/", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(nodeH.GetRootHandler))
	nodeR.Post("/", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(nodeH.CreateFolderHandler))
	nodeR.Get("/{nodeID}", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(nodeH.GetNodeHandler))

	// =========================================================================
	// NODE COMMENTS
	// =========================================================================

	getNodeComments := usecase.
		NewGetNodeCommentsUseCase(
			nodeRepository,
			nodeCommentRepository,
			groupUsrRepository)
	createNodeComment := usecase.
		NewCreateNodeCommentUseCase(
			nodeRepository,
			nodeCommentRepository,
			groupUsrRepository,
			lg)
	updateNodeComment := usecase.
		NewUpdateNodeCommentUseCase(
			nodeCommentRepository)
	deleteNodeComment := usecase.
		NewDeleteNodeCommentUseCase(
			nodeRepository,
			nodeCommentRepository,
			groupUsrRepository)
	// ROUTES
	nodeCommentH := handler.
		NewNodeCommentHandler(
			getNodeComments,
			createNodeComment,
			updateNodeComment,
			deleteNodeComment)
	nodeCommentR := chi.NewRouter()
	nodeR.Get("/{nodeID}/comments", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(nodeCommentH.GetNodeCommentsHandler))
	nodeR.Post("/{nodeID}/comments", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(nodeCommentH.CreateNodeCommentHandler))
	nodeCommentR.Patch("/{nodeCommentID}", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(nodeCommentH.UpdateNodeCommentHandler))
	nodeCommentR.Delete("/{nodeCommentID}", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(nodeCommentH.DeleteNodeCommentHandler))

	// =========================================================================
	// DOCS ROUTES
	// =========================================================================

	createDoc := usecase.
		NewCreateDocUseCase(
			docRepository,
			nodeRepository,
			groupUsrRepository,
			unitOfWorkFactory,
			storage,
			lg)
	deleteDoc := usecase.
		NewDeleteDocUseCase(
			storage,
			docRepository,
			nodeRepository,
			groupUsrRepository,
			lg)
	downloadDoc := usecase.
		NewDownloadDocUseCase(
			nodeRepository,
			docRepository,
			groupUsrRepository,
			storage)

	// ROUTES
	docH := handler.
		NewDocHandler(
			createDoc,
			deleteDoc,
			downloadDoc)
	docR := chi.NewRouter()
	docR.Post("/", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(docH.CreateDocHandler))
	docR.Delete("/{docID}", authM.
		// TODO: Add swagger doc here
		IsAuthenticated(docH.DeleteDocHandler))
	docR.Get("/{docID}/download", authM.
		// TODO: add swagger doc here
		IsAuthenticated(docH.DownloadDocHandler))

	// =========================================================================
	// SERVER START POINT
	// =========================================================================

	r := chi.NewRouter()
	// TODO: Add swagger doc here
	r.Mount("/api/v1/groups", groupR)
	// TODO: Add swagger doc here
	r.Mount("/api/v1/usrs", usrR)
	// TODO: Add swagger doc here
	r.Mount("/api/v1/nodes", nodeR)
	// TODO: Add swagger doc here
	r.Mount("/api/v1/comments", nodeCommentR)
	// TODO: Add swagger doc here
	r.Mount("/api/v1/docs", docR)

	// =========================================================================
	// SERVE WEB APP
	// =========================================================================

	// Static assets
	r.Handle("/assets/*", http.StripPrefix("/assets/", http.FileServer(http.Dir("web/dist/assets"))))

	// SPA fallback
	r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "web/dist/index.html")
	}))

	logRoutes(r)
	lg.Info("server starting at:", "Mode", cfg.Mode, "port", cfg.Port)
	_ = http.ListenAndServe(fmt.Sprintf(":%d", cfg.Port), r)
}
