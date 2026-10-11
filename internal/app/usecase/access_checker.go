package usecase

import (
	"context"
	"errors"

	"ownned/internal/application/auth"
	"ownned/internal/domain"
	"ownned/pkg/apperror"

	"github.com/google/uuid"
)

// accessChecker is an abstraction to access business logic related
type accessChecker struct {
	groupUsrRepository domain.GroupUsrRepository
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

	if err := ac.groupUsrRepository.HasAccess(ctx, u.ID, pth, accs); err != nil {
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

	accs, err := ac.groupUsrRepository.GetGroupAccess(ctx, u.ID, groupID)
	if err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return false, nil
		}

		return false, err
	}

	return accs.IsEquivalent(reqAccs), nil
}
