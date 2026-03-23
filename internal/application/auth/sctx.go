package auth

import (
	"context"

	"ownned/pkg/apperror"

	"github.com/google/uuid"
)

// context keys for user session
type usrSessionKeyType struct{}

// unique instance of usrSessionKeyType to avoid collisions
var usrSessionKey = usrSessionKeyType{}

// GetSession returns the session from the context
func GetSession(ctx context.Context) (*JWTAccessPayload, error) {
	session, ok := ctx.Value(usrSessionKey).(*JWTAccessPayload)
	if !ok {
		detail := make(map[string]string)
		detail["reason"] = "invalid casting of expected type *Session"
		return nil, apperror.ErrInternal(detail)
	}

	return session, nil
}

// GetUsrID returns the user ID from the session
func GetUsrID(ctx context.Context) (uuid.UUID, error) {
	session, err := GetSession(ctx)
	if err != nil {
		return uuid.Nil, err
	}

	usrID, err := uuid.Parse(session.UsrID)
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid user ID"
		return uuid.Nil, apperror.ErrInternal(detail)
	}

	return usrID, nil
}

// SetSession sets the session in the context
func SetSession(ctx context.Context, session *JWTAccessPayload) context.Context {
	return context.WithValue(ctx, usrSessionKey, session)
}
