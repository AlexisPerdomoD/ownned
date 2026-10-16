package httpapi

import (
	"net/http"
	"time"

	"ownned/internal/app/auth"

	"github.com/go-chi/chi/v5"
)

type AuthHandlerConfig struct {
	Secure   bool
	SameSite http.SameSite
}

type AuthHandler struct {
	loginPwd *auth.LoginPwdUseCase
	cfg      AuthHandlerConfig
}

func NewAuthHandler(loginPwd *auth.LoginPwdUseCase, cfg AuthHandlerConfig) *AuthHandler {
	return &AuthHandler{
		loginPwd: loginPwd,
		cfg:      cfg,
	}
}

func (c *AuthHandler) LoginPwdHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()

	body, err := parseJSON[auth.LoginPwdDTO](r.Body, validationStruct)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	sessionToken, usr, err := c.loginPwd.Execute(r.Context(), *body)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
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

	writeJSON(w, http.StatusCreated, UsrViewFromDomain(usr))
}

func (c *AuthHandler) LogoutUsrHandler(w http.ResponseWriter, r *http.Request) {
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
	writeJSON(w, http.StatusOK, resp)
}

// MountV1 mounts the AuthHandler to the given parent chi.Router .
// The path is /api/v1/auth
func (c *AuthHandler) MountV1(p chi.Router) {
	r := chi.NewRouter()

	r.Post("/login", c.LoginPwdHandler)

	r.Delete("/logout", c.LogoutUsrHandler)

	p.Mount("/api/v1/auth", r)
}
