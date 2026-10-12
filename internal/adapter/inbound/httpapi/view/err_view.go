package view

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/go-playground/validator/v10"

	"ownned/internal/application/auth"
	"ownned/pkg/apperror"
)

type ErrView struct {
	Code    int               `json:"code"`
	Message string            `json:"message"`
	Detail  map[string]string `json:"detail"`
}

func ValidationError(err validator.ValidationErrors) *ErrView {
	detail := make(map[string]string)

	for _, fe := range err {
		detail[fe.Field()] = fmt.Sprintf("failed on %s, %s", fe.Tag(), fe.Error())
	}

	return &ErrView{
		Code:    http.StatusUnprocessableEntity,
		Message: "validation failed",
		Detail:  detail,
	}
}

func AppError(err *apperror.AppError) *ErrView {
	switch err.Kind {
	case apperror.ErrNotFoundInstance:
		return &ErrView{
			Code:    http.StatusNotFound,
			Message: "resource not found",
			Detail:  err.Detail,
		}

	case apperror.ErrBadRequestInstance:
		return &ErrView{
			Code:    http.StatusBadRequest,
			Message: "bad request",
			Detail:  err.Detail,
		}

	case apperror.ErrConflictInstance:
		return &ErrView{
			Code:    http.StatusConflict,
			Message: "conflict",
			Detail:  err.Detail,
		}

	case apperror.ErrForbiddenInstance:
		return &ErrView{
			Code:    http.StatusForbidden,
			Message: "forbidden",
			Detail:  err.Detail,
		}

	case apperror.ErrUnauthenticatedInstance:
		return &ErrView{
			Code:    http.StatusUnauthorized,
			Message: "unauthenticated",
			Detail:  err.Detail,
		}

	case apperror.ErrRateLimitInstance:
		return &ErrView{
			Code:    http.StatusTooManyRequests,
			Message: "too many requests",
			Detail:  err.Detail,
		}

	case apperror.ErrInternalInstance:
		return &ErrView{
			Code:    http.StatusInternalServerError,
			Message: "internal error",
			Detail:  err.Detail,
		}
	case apperror.ErrNotImplementedInstance:
		return &ErrView{
			Code:    http.StatusNotImplemented,
			Message: "not implemented yet :(",
			Detail:  err.Detail,
		}

	default:
		return &ErrView{
			Code:    http.StatusInternalServerError,
			Message: "unknown error",
			Detail:  err.Detail,
		}
	}
}

var eLog = slog.With("error handler")

func Err(err error) *ErrView {
	if err == nil {
		eLog.Warn("empty error provided", "stack", debug.Stack())
		return &ErrView{}
	}

	if errors.Is(err, auth.ErrExpiredToken) || errors.Is(err, auth.ErrInvalidToken) {
		detail := make(map[string]string)
		detail["reason"] = err.Error()
		return &ErrView{
			Code:    http.StatusUnauthorized,
			Message: "invalid credentials",
			Detail:  detail,
		}
	}

	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		view := AppError(appErr)
		if view.Code >= 500 {
			eLog.Error("error happened", "err", err, "stack", debug.Stack())
		}
		return view
	}

	var validationErrors validator.ValidationErrors
	if errors.As(err, &validationErrors) {
		return ValidationError(validationErrors)
	}

	eLog.Error("unexpected error happened", "err", err, "stack", debug.Stack())

	return &ErrView{
		Code:    http.StatusInternalServerError,
		Message: "unexpected error",
	}
}
