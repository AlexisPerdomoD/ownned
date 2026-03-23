package usecase

import (
	"context"
	"errors"

	"ownned/internal/application/auth"
	"ownned/internal/domain"
	"ownned/pkg/apperror"

	"github.com/google/uuid"
)

// usrIdentity is the user identity
type usrIdentity struct {
	ID   domain.UsrID
	Role domain.UsrRole
}

// getUsrIdentity returns the user identity from the context
func getUsrIdentity(ctx context.Context) (i usrIdentity, err error) {
	s, err := auth.GetSession(ctx)
	if err != nil {
		return i, err
	}

	usrID, err := uuid.Parse(s.UsrID)
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid user ID"
		return i, apperror.ErrInternal(detail)
	}

	if !s.Role.IsValid() {
		detail := make(map[string]string)
		detail["reason"] = "invalid user role"
		return i, apperror.ErrForbidden(detail)
	}

	i.ID = usrID
	i.Role = s.Role
	return i, nil
}

// accessChecker is an abstraction to access business logic related
type accessChecker struct {
	gur domain.GroupUsrRepository
}

// hasNodeAccessTo checks if a user has access to a node based on the user's role and the access of the node to the user
func (ac *accessChecker) hasNodeAccessTo(
	ctx context.Context,
	u usrIdentity,
	pth domain.NodePath,
	accs domain.GroupUsrAccess,
) (bool, error) {
	if u.Role == domain.SuperUsrRole {
		return true, nil
	}

	if err := ac.gur.HasAccess(ctx, u.ID, pth, accs); err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

// hasGroupAccessTo checks if a user has access to a group based on the user's role and the access of the group to the user
func (ac *accessChecker) hasGroupAccessTo(
	ctx context.Context,
	u usrIdentity,
	groupID domain.GroupID,
	reqAccs domain.GroupUsrAccess,
) (bool, error) {
	if u.Role == domain.SuperUsrRole {
		return true, nil
	}

	accs, err := ac.gur.GetGroupAccess(ctx, u.ID, groupID)
	if err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return false, nil
		}

		return false, err
	}

	return accs.IsEquivalent(reqAccs), nil
}
