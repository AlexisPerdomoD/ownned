package group

import (
	"context"
	"errors"

	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type AccessChecker interface {
	// HasNodeAccessToFromPath checks if a user has access to a node based on the user's role and the access of the node to the user
	HasNodeAccessToFromPath(ctx context.Context, pth domain.NodePath, accs domain.GroupUsrAccess) (bool, error)

	// HasNodeAccessTo checks if a user has access to a node based on the user's role and the access of the node to the user
	HasNodeAccessTo(ctx context.Context, nodeID domain.NodeID, accs domain.GroupUsrAccess) (bool, error)

	// GetNodeAccess returns the highest access level of a node to a user if the user has access to the node, nil otherwise
	GetNodeAccess(ctx context.Context, nodeID domain.NodeID) (*domain.GroupUsrAccess, error)

	// HasGroupAccessTo checks if a user has access to a group based on the user's role and the access of the group to the user
	HasGroupAccessTo(ctx context.Context, groupID domain.GroupID, req domain.GroupUsrAccess) (bool, error)
}

type accessChecker struct {
	groupUsrs GroupUsrRepository
}

func NewAccessChecker(usrGroup GroupUsrRepository) AccessChecker {
	return &accessChecker{usrGroup}
}

func (ac *accessChecker) HasNodeAccessToFromPath(ctx context.Context, pth domain.NodePath, accs domain.GroupUsrAccess) (bool, error) {
	u, err := identity.Get(ctx)
	if err != nil {
		return false, err
	}

	if err := ac.groupUsrs.HasAccessFromPath(ctx, u.ID, pth, accs); err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

func (ac *accessChecker) HasNodeAccessTo(ctx context.Context, nodeID domain.NodeID, accs domain.GroupUsrAccess) (bool, error) {
	u, err := identity.Get(ctx)
	if err != nil {
		return false, err
	}

	if err := ac.groupUsrs.HasAccess(ctx, u.ID, nodeID, accs); err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

func (ac *accessChecker) GetNodeAccess(ctx context.Context, nodeID domain.NodeID) (*domain.GroupUsrAccess, error) {
	u, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	access, err := ac.groupUsrs.GetNodeAccess(ctx, u.ID, nodeID)
	if err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return nil, nil
		}

		return nil, err
	}

	return &access, nil
}

// HasGroupAccessTo checks if a user has access to a group based on the user's role and the access of the group to the user
func (ac *accessChecker) HasGroupAccessTo(ctx context.Context, groupID domain.GroupID, reqAccs domain.GroupUsrAccess) (bool, error) {
	u, err := identity.Get(ctx)
	if err != nil {
		return false, err
	}

	accs, err := ac.groupUsrs.GetGroupAccess(ctx, u.ID, groupID)
	if err != nil {
		if errors.Is(err, domain.ErrNoAccess) {
			return false, nil
		}

		return false, err
	}

	return accs.IsEquivalent(reqAccs), nil
}
