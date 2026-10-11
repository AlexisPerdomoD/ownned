package group

import (
	"context"
	"errors"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type AccessChecker struct {
	groupUsr GroupUsrRepository
}

func NewAccessChecker(usrGroup GroupUsrRepository) *AccessChecker {
	return &AccessChecker{usrGroup}
}

// hasNodeAccessToFromPath checks if a user has access to a node based on the user's role and the access of the node to the user
func (ac *AccessChecker) hasNodeAccessToFromPath(
	ctx context.Context,
	pth domain.NodePath,
	accs domain.GroupUsrAccess,
) (bool, error) {
	u, err := identity.Get(ctx)
	if err != nil {
		return false, err
	}

	if u.Role == domain.SuperUsrRole {
		return true, nil
	}

	if err := ac.groupUsr.HasAccessFromPath(ctx, u.ID, pth, accs); err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

// hasNodeAccessTo checks if a user has access to a node based on the user's role and the access of the node to the user
func (ac *AccessChecker) hasNodeAccessTo(
	ctx context.Context,
	nodeID domain.NodeID,
	accs domain.GroupUsrAccess,
) (bool, error) {
	u, err := identity.Get(ctx)
	if err != nil {
		return false, err
	}

	if u.Role == domain.SuperUsrRole {
		return true, nil
	}

	if err := ac.groupUsr.HasAccess(ctx, u.ID, nodeID, accs); err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

// hasGroupAccessTo checks if a user has access to a group based on the user's role and the access of the group to the user
func (ac *AccessChecker) hasGroupAccessTo(
	ctx context.Context,
	u identity.Identity,
	groupID domain.GroupID,
	reqAccs domain.GroupUsrAccess,
) (bool, error) {
	if u.Role == domain.SuperUsrRole {
		return true, nil
	}

	accs, err := ac.groupUsr.GetGroupAccess(ctx, u.ID, groupID)
	if err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return false, nil
		}

		return false, err
	}

	return accs.IsEquivalent(reqAccs), nil
}
