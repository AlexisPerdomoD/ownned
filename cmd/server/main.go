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

	_ = chi.Walk(r, func(method, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
		if _, exists := grouped[route]; !exists {
			grouped[route] = &routeEntry{path: route}
			order = append(order, route)
		}
		grouped[route].methods = append(grouped[route].methods, method)
		return nil
	})

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

// start point baby
func main() {
	cfg := config.LoadEnvConfig()
	// DB
	db, err := pg.NewDB(
		cfg.PgDB,
		cfg.PgHost,
		cfg.PgPort,
		cfg.PgUser,
		cfg.PgPassword,
		cfg.PgSsl,
	)
	if err != nil {
		panic(err)
	}
	if err := pg.MigrateUp(db.DB); err != nil {
		panic(err)
	}

	// SERVICES
	lg := slog.New(slog.
		NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	jwtManager := serv.NewJWTManagerST(
		[]byte(cfg.SessionSecret),
		time.Hour,
		"ownned")
	pwdHasher := serv.NewPwdHasherArgon2(
		cfg.PwdTime,
		cfg.PwdMemKiB,
		cfg.PwdThreads,
		cfg.PwdHashLen,
		cfg.PwdSaltLen)
	storage := serv.NewStorageManagerFS(cfg.LocalStorageDir)

	// MIDLEWARES
	authM := middleware.NewAuthMiddleware(jwtManager)

	usrRepository := pg.NewUsrRepository(db)
	usrPwdRepository := pg.NewUsrPwdRepository(db)
	nodeRepository := pg.NewNodeRepository(db)
	nodeCommentRepository := pg.NewNodeCommentRepository(db)
	groupRepository := pg.NewGroupRepository(db)
	groupUsrRepository := pg.NewGroupUsrRepository(db)
	docRepository := pg.NewDocRepository(db)
	unitOfWorkFactory := pg.NewUnitOfWorkFactory(db, lg, time.Second*30)

	// GROUPS
	getGroup := usecase.
		NewGetGroupUseCase(
			usrRepository,
			nodeRepository,
			groupRepository,
			groupUsrRepository)
	paginateGroup := usecase.
		NewPaginateGroupUseCase(groupRepository)
	createGroup := usecase.
		NewCreateGroupUseCase(unitOfWorkFactory)
	deleteGroup := usecase.
		NewDeleteGroupUseCase(
			groupRepository,
			groupUsrRepository)

	// GROUPS ROUTES
	groupH := handler.
		NewGroupHandler(
			getGroup,
			paginateGroup,
			createGroup,
			deleteGroup)
	groupR := chi.NewRouter()

	groupR.Post("/", authM.
		IsAuthenticated(groupH.CreateGroupHandler))

	groupR.Get("/{groupID}", authM.
		IsAuthenticated(groupH.GetGroupHandler))

	groupR.Get("/paginate", authM.
		IsAuthenticated(groupH.PaginateGroupHandler))

	groupR.Delete("/{groupID}", authM.
		IsAuthenticated(groupH.DeleteGroupHandler))

	// USERS
	createUsr := usecase.
		NewCreateUsrUseCase(
			usrRepository,
			unitOfWorkFactory,
			pwdHasher,
			lg)
	getUsr := usecase.
		NewGetUsrUseCase(usrRepository)
	paginateUsr := usecase.
		NewPaginateUsrUseCase(usrRepository)
	loginUsr := usecase.
		NewLoginUsrUseCase(
			usrRepository,
			usrPwdRepository,
			pwdHasher,
			jwtManager)
	// USR ROUTES
	usrH := handler.
		NewUsrHandler(
			loginUsr,
			createUsr,
			getUsr,
			paginateUsr,
			handler.UsrHandlerConfig{
				Secure:   cfg.Mode != "local",
				SameSite: http.SameSiteLaxMode,
			})
	usrR := chi.NewRouter()
	usrR.Get("/{usrID}", authM.
		IsAuthenticated(usrH.GetUsrHandler))
	usrR.Post("/", authM.
		IsSuperUsr(usrH.CreateUsrHandler))
	usrR.Get("/paginate", authM.
		IsAuthenticated(usrH.PaginateUsrHandler))
	usrR.Post("/login", usrH.LoginUsrHandler)
	usrR.Delete("/logout", usrH.LogoutUsrHandler)

	// NODES
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
	// NODES ROUTES
	nodeH := handler.
		NewNodeHandler(
			getRoot,
			createFolder,
			getNode)
	nodeR := chi.NewRouter()
	nodeR.Get("/", authM.
		IsAuthenticated(nodeH.GetRootHandler))
	nodeR.Post("/", authM.
		IsAuthenticated(nodeH.CreateFolderHandler))
	nodeR.Get("/{nodeID}", authM.
		IsAuthenticated(nodeH.GetNodeHandler))

	// NODE COMMENTS
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
	// NODE COMMENTS ROUTES
	nodeCommentH := handler.
		NewNodeCommentHandler(
			getNodeComments,
			createNodeComment,
			updateNodeComment,
			deleteNodeComment)
	nodeCommentR := chi.NewRouter()
	nodeR.Get("/{nodeID}/comments", authM.
		IsAuthenticated(nodeCommentH.GetNodeCommentsHandler))
	nodeR.Post("/{nodeID}/comments", authM.
		IsAuthenticated(nodeCommentH.CreateNodeCommentHandler))
	nodeCommentR.Patch("/{nodeCommentID}", authM.
		IsAuthenticated(nodeCommentH.UpdateNodeCommentHandler))
	nodeCommentR.Delete("/{nodeCommentID}", authM.
		IsAuthenticated(nodeCommentH.DeleteNodeCommentHandler))

	// DOCS
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

	// DOCS ROUTES
	docH := handler.
		NewDocHandler(
			createDoc,
			deleteDoc)
	docR := chi.NewRouter()
	docR.Post("/", authM.
		IsAuthenticated(docH.CreateDocHandler))
	docR.Delete("/{docID}", authM.
		IsAuthenticated(docH.DeleteDocHandler))

	// SERVER ROUTES
	r := chi.NewRouter()
	r.Mount("/api/v1/groups", groupR)
	r.Mount("/api/v1/usrs", usrR)
	r.Mount("/api/v1/nodes", nodeR)
	r.Mount("/api/v1/comments", nodeCommentR)
	r.Mount("/api/v1/docs", docR)

	logRoutes(r)
	lg.Info("server starting at:", "Mode", cfg.Mode, "port", cfg.Port)
	_ = http.ListenAndServe(fmt.Sprintf(":%d", cfg.Port), r)
}
