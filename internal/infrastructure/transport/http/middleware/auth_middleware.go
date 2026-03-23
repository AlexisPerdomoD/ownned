package middleware

import (
	"errors"
	"net/http"

	"ownned/internal/application/auth"
	"ownned/internal/domain"
	"ownned/internal/infrastructure/transport/http/encoder"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type AuthMiddleware struct {
	jwtValidator auth.JWTManager
}

func (m *AuthMiddleware) getSessionFromBearer(r *http.Request) (*auth.JWTAccessPayload, error) {
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

	session, err := m.jwtValidator.ValidateAccessToken(cookie.Value)
	if err != nil {
		return nil, err
	}

	return session, nil
}

func (m *AuthMiddleware) IsAuthenticated(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.getSessionFromBearer(r)
		if err != nil {
			_ = encoder.WriteJSONError(w, err)
			return
		}

		ctx := auth.SetSession(r.Context(), session)
		next(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) IsSuperUsr(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.getSessionFromBearer(r)
		if err != nil {
			_ = encoder.WriteJSONError(w, err)
			return
		}

		if session.Role != domain.SuperUsrRole {
			_ = encoder.WriteJSONError(w, apperror.ErrUnauthenticated(nil))
			return
		}

		ctx := auth.SetSession(r.Context(), session)
		next(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) IsNotLimitedUsr(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.getSessionFromBearer(r)
		if err != nil {
			_ = encoder.WriteJSONError(w, err)
			return
		}

		if session.Role == domain.LimitedUsrRole {
			detail := make(map[string]string)
			detail["reason"] = "user does not have permission to access this resource"
			_ = encoder.WriteJSONError(w, apperror.ErrForbidden(detail))
			return
		}

		ctx := auth.SetSession(r.Context(), session)
		next(w, r.WithContext(ctx))
	})
}

func NewAuthMiddleware(jwtValidator auth.JWTManager) *AuthMiddleware {
	helper.NotNilOrPanic(jwtValidator, "jwtValidator")
	return &AuthMiddleware{jwtValidator}
}
