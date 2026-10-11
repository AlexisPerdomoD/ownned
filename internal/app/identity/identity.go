// identity package ensure access to indentify users
package identity

import (
	"context"
	"ownned/internal/app/apperror"
	"ownned/internal/domain"
)

// usrIdentity is the user identity
type Identity struct {
	ID   domain.UsrID   `json:"usr_id"`
	Role domain.UsrRole `json:"role"`
}

// context keys for user session
type identityKeyType struct{}

// unique instance of usrSessionKeyType to avoid collisions
var identityKey = identityKeyType{}

// Get returns the user identity from the context
func Get(ctx context.Context) (Identity, error) {
	s, ok := ctx.Value(identityKey).(Identity)
	if !ok {
		detail := make(map[string]string)
		detail["reason"] = "invalid casting of expected type *Session"
		return s, apperror.ErrInternal(detail)
	}

	return s, nil
}

// Set sets the identity in the context
func Set(ctx context.Context, identity Identity) context.Context {
	return context.WithValue(ctx, identityKey, identity)
}
