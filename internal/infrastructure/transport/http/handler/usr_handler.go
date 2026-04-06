package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"ownned/internal/application/usecase"
	"ownned/internal/domain"
	"ownned/internal/infrastructure/transport/http/decoder"
	"ownned/internal/infrastructure/transport/http/encoder"
	"ownned/internal/infrastructure/transport/http/view"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type UsrHandlerConfig struct {
	Secure   bool
	SameSite http.SameSite
}

type UsrHandler struct {
	loginUsr    *usecase.LoginUsrUseCase
	createUsr   *usecase.CreateUsrUseCase
	getMe       *usecase.GetMeUseCase
	getUsr      *usecase.GetUsrUseCase
	paginateUsr *usecase.PaginateUsrUseCase
	cfg         UsrHandlerConfig
}

func (c *UsrHandler) GetMeHandler(w http.ResponseWriter, r *http.Request) {
	usr, err := c.getMe.Execute(r.Context())
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusOK, view.UsrViewFromDomain(usr))
}

func (c *UsrHandler) GetUsrHandler(w http.ResponseWriter, r *http.Request) {
	usrID, err := uuid.Parse(chi.URLParam(r, "usrID"))
	if err != nil {
		detail := make(map[string]string)
		detail["usrID"] = "invalid uuid provided"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	usr, err := c.getUsr.Execute(r.Context(), usrID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusOK, view.UsrViewFromDomain(usr))
}

func (c *UsrHandler) PaginateUsrHandler(w http.ResponseWriter, r *http.Request) {
	var page, limit uint
	var search string
	var role *domain.UsrRole

	q := r.URL.Query()

	if rawpage, err := strconv.ParseUint(q.Get("page"), 10, 32); err == nil {
		page = uint(rawpage)
	}

	if rawlimit, err := strconv.ParseUint(q.Get("limit"), 10, 32); err == nil {
		limit = uint(rawlimit)
	}

	if rawsearch := q.Get("search"); rawsearch != "" {
		search = rawsearch
	}

	if rawrole := domain.UsrRole(q.Get("role")); rawrole.IsValid() {
		role = &rawrole
	}

	res, err := c.paginateUsr.Execute(
		r.Context(), page, limit, search, role)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w,
		http.StatusOK,
		view.PaginationResultViewFromDomain(res, view.UsrViewFromDomain))
}

func (c *UsrHandler) CreateUsrHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()

	body, err := decoder.CreateUsrDTOFromJSON(r.Body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	ctx := r.Context()
	usr, err := c.createUsr.Execute(ctx, *body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusCreated, view.UsrViewFromDomain(usr))
}

func (c *UsrHandler) LoginUsrHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()

	body, err := decoder.LoginUsrDTOFromJSON(r.Body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	sessionToken, usr, err := c.loginUsr.Execute(r.Context(), *body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    sessionToken,
		HttpOnly: true,
		Secure:   c.cfg.Secure,
		SameSite: c.cfg.SameSite,
		Path:     "/",
		MaxAge:   3600,
	})

	_ = encoder.WriteJSON(w, http.StatusCreated, view.UsrViewFromDomain(usr))
}

func (c *UsrHandler) LogoutUsrHandler(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   c.cfg.Secure,
		SameSite: c.cfg.SameSite,
	})

	resp := make(map[string]string)
	resp["message"] = "logged out properly"
	_ = encoder.WriteJSON(w, http.StatusOK, resp)
}

func NewUsrHandler(
	lu *usecase.LoginUsrUseCase,
	cu *usecase.CreateUsrUseCase,
	gm *usecase.GetMeUseCase,
	gu *usecase.GetUsrUseCase,
	pu *usecase.PaginateUsrUseCase,
	cfg UsrHandlerConfig,
) *UsrHandler {
	helper.NotNilOrPanic(lu, "LoginUsrUseCase")
	helper.NotNilOrPanic(cu, "CreateUsrUseCase")
	helper.NotNilOrPanic(gm, "GetMeUseCase")
	helper.NotNilOrPanic(gu, "GetUsrUseCase")
	helper.NotNilOrPanic(pu, "PaginateUsrUseCase")
	return &UsrHandler{lu, cu, gm, gu, pu, cfg}
}
