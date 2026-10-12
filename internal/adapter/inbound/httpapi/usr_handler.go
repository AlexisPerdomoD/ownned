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
}

func NewUsrHandler(
	createUsr *usr.CreateUsrUseCase,
	getMe *usr.GetMeUseCase,
	getUsr *usr.GetUsrUseCase,
	paginateUsr *usr.PaginateUsrUseCase,
) *UsrHandler {
	return &UsrHandler{
		createUsr:   createUsr,
		getMe:       getMe,
		getUsr:      getUsr,
		paginateUsr: paginateUsr,
	}
}

func (c *UsrHandler) GetMeHandler(w http.ResponseWriter, r *http.Request) {
	usr, err := c.getMe.Execute(r.Context())
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, UsrViewFromDomain(usr))
}

func (c *UsrHandler) GetUsrHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusOK, UsrViewFromDomain(usr))
}

func (c *UsrHandler) PaginateUsrHandler(w http.ResponseWriter, r *http.Request) {
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

	// resp := res.Map(UsrViewFromDomain)
	writeJSON(w,
		http.StatusOK,
		paginationMap(res, UsrViewFromDomain))
}

func (c *UsrHandler) CreateUsrHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusCreated, UsrViewFromDomain(usr))
}
