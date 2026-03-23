// Package apperror provides a type for application errors.
package apperror

import "errors"

type AppError struct {
	Kind   error
	Detail map[string]string
}

func (e *AppError) Unwrap() error {
	return e.Kind
}

func (e *AppError) Error() string {
	return e.Kind.Error()
}

var (
	ErrNotFoundInstance        = errors.New("not_found")
	ErrBadRequestInstance      = errors.New("bad_request")
	ErrConflictInstance        = errors.New("conflict")
	ErrUnauthenticatedInstance = errors.New("unauthenticated")
	ErrForbiddenInstance       = errors.New("forbidden")
	ErrAbortedInstance         = errors.New("aborted")
	ErrRateLimitInstance       = errors.New("rate_limit")
	ErrExternalServiceInstance = errors.New("external_service")
	ErrInternalInstance        = errors.New("internal")
	ErrNotImplementedInstance  = errors.New("not_implemented")
	ErrUnknownInstance         = errors.New("unknown")
	ErrIlegalDBStateInstance   = errors.New("illegal_db_state")
)

func ErrNotFound(detail map[string]string) *AppError {
	return &AppError{Kind: ErrNotFoundInstance, Detail: detail}
}

func ErrBadRequest(detail map[string]string) *AppError {
	return &AppError{Kind: ErrBadRequestInstance, Detail: detail}
}

func ErrConflict(detail map[string]string) *AppError {
	return &AppError{Kind: ErrConflictInstance, Detail: detail}
}

func ErrUnauthenticated(detail map[string]string) *AppError {
	return &AppError{Kind: ErrUnauthenticatedInstance, Detail: detail}
}

func ErrForbidden(detail map[string]string) *AppError {
	return &AppError{Kind: ErrForbiddenInstance, Detail: detail}
}

func ErrAborted(detail map[string]string) *AppError {
	return &AppError{Kind: ErrAbortedInstance, Detail: detail}
}

func ErrRateLimit(detail map[string]string) *AppError {
	return &AppError{Kind: ErrRateLimitInstance, Detail: detail}
}

func ErrExternalService(detail map[string]string) *AppError {
	return &AppError{Kind: ErrExternalServiceInstance, Detail: detail}
}

func ErrInternal(detail map[string]string) *AppError {
	return &AppError{Kind: ErrInternalInstance, Detail: detail}
}

func ErrNotImplemented(detail map[string]string) *AppError {
	return &AppError{Kind: ErrNotImplementedInstance, Detail: detail}
}

func ErrUnknown(detail map[string]string) *AppError {
	return &AppError{Kind: ErrUnknownInstance, Detail: detail}
}

func ErrIlegalDBState(detail map[string]string) *AppError {
	return &AppError{Kind: ErrIlegalDBStateInstance, Detail: detail}
}
