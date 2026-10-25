package httpapi

import (
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

var requestLogger = log.New(os.Stdout, "", log.Ltime)

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startedAt := time.Now()
		wrapped := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)

		defer func() {
			status := wrapped.Status()
			if status == 0 {
				status = http.StatusOK
			}

			requestLogger.Printf("%s %s %s %s",
				colorRequestMethod(r.Method),
				ansiCyan+r.URL.Path+ansiReset,
				colorRequestStatus(status),
				time.Since(startedAt),
			)
		}()

		next.ServeHTTP(wrapped, r)
	})
}

type TokenValidator interface {
	ValidateAccessToken(token string) (*identity.Identity, error)
}

type AuthMiddleware struct {
	tokenValidator TokenValidator
}

func (m *AuthMiddleware) getSessionFromBearer(r *http.Request) (*identity.Identity, error) {
	cookie, err := r.Cookie("session")
	if err != nil {
		if errors.Is(err, http.ErrNoCookie) {
			detail := make(map[string]string)
			detail["reason"] = "session cookie not found"
			return nil, apperror.ErrUnauthenticated(detail)
		}

		return nil, err
	}

	if cookie.Value == "" {
		detail := make(map[string]string)
		detail["reason"] = "invalid session cookie"
		return nil, apperror.ErrUnauthenticated(detail)
	}

	session, err := m.tokenValidator.ValidateAccessToken(cookie.Value)
	if err != nil {
		return nil, err
	}

	return session, nil
}

func (m *AuthMiddleware) IsAuthenticated(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.getSessionFromBearer(r)
		if err != nil {
			resp := errView(err)
			writeJSON(w, resp.Code, resp)
			return
		}

		ctx := identity.Set(r.Context(), *session)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) IsSuperUsr(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.getSessionFromBearer(r)
		if err != nil {
			resp := errView(err)
			writeJSON(w, resp.Code, resp)
			return

		}

		if session.Role != domain.SuperUsrRole {
			resp := errView(apperror.ErrUnauthenticated(nil))
			writeJSON(w, resp.Code, resp)
			return
		}

		ctx := identity.Set(r.Context(), *session)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) IsNotLimitedUsr(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.getSessionFromBearer(r)
		if err != nil {
			resp := errView(err)
			writeJSON(w, resp.Code, resp)
			return
		}

		if session.Role == domain.LimitedUsrRole {
			detail := make(map[string]string)
			detail["reason"] = "user does not have permission to access this resource"
			resp := errView(apperror.ErrForbidden(detail))
			writeJSON(w, resp.Code, resp)
			return
		}

		ctx := identity.Set(r.Context(), *session)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func NewAuthMiddleware(tokenValidator TokenValidator) *AuthMiddleware {
	return &AuthMiddleware{tokenValidator: tokenValidator}
}
