package httpapi

import (
	"net/http"
	"strconv"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/pagination"
	"ownned/internal/app/usr"
	"ownned/internal/domain"

	"github.com/go-chi/chi/v5"
)

type UsrHandler struct {
	createUsr   *usr.CreateUsrUseCase
	getMe       *usr.GetMeUseCase
	getUsr      *usr.GetUsrUseCase
	paginateUsr *usr.PaginateUsrUseCase
	am          *AuthMiddleware
}

func NewUsrHandler(
	createUsr *usr.CreateUsrUseCase,
	getMe *usr.GetMeUseCase,
	getUsr *usr.GetUsrUseCase,
	paginateUsr *usr.PaginateUsrUseCase,
	am *AuthMiddleware,
) *UsrHandler {
	return &UsrHandler{
		createUsr:   createUsr,
		getMe:       getMe,
		getUsr:      getUsr,
		paginateUsr: paginateUsr,
		am:          am,
	}
}

func (c *UsrHandler) getMeHandler(w http.ResponseWriter, r *http.Request) {
	usr, err := c.getMe.Execute(r.Context())
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, usrViewFromDomain(usr))
}

func (c *UsrHandler) getUsrHandler(w http.ResponseWriter, r *http.Request) {
	usrID, err := uuid.Parse(chi.URLParam(r, "usrID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid uuid provided"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	usr, err := c.getUsr.Execute(r.Context(), usrID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, usrViewFromDomain(usr))
}

func (c *UsrHandler) paginateUsrHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	var page, limit uint
	var role *domain.UsrRole
	search := q.Get("search")
	if rawpage, err := strconv.ParseUint(q.Get("page"), 10, 32); err == nil {
		page = uint(rawpage)
	}

	if rawlimit, err := strconv.ParseUint(q.Get("limit"), 10, 32); err == nil {
		limit = uint(rawlimit)
	}

	if rawrole := domain.UsrRole(q.Get("role")); rawrole.IsValid() {
		role = &rawrole
	}

	res, err := c.paginateUsr.Execute(
		r.Context(),
		pagination.PaginationParam{
			Page:   page,
			Limit:  limit,
			Search: search,
		},
		role)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, res.Map(usrViewFromDomain))
}

func (c *UsrHandler) createUsrHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()

	body, err := parseJSON[usr.CreateUsrDTO](r.Body, validationStruct)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	usr, err := c.createUsr.Execute(r.Context(), *body)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusCreated, usrViewFromDomain(usr))
}

// MountV1 mounts the UsrHandler to the given parent chi.Router .
// The path is /api/v1/usrs
func (c *UsrHandler) MountV1(p chi.Router) {
	r := chi.NewRouter()

	r.With(c.am.IsAuthenticated).Get("/me", c.getMeHandler)

	r.With(c.am.IsAuthenticated).Get("/{usrID}", c.getUsrHandler)

	r.With(c.am.IsAuthenticated).Get("/paginate", c.paginateUsrHandler)

	r.With(c.am.IsSuperUsr).Post("/", c.createUsrHandler)

	p.Mount("/api/v1/usrs", r)
}
