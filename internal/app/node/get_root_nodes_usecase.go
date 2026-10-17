package node

import (
	"context"
	"log/slog"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type GetRootNodesUseCase struct {
	nodes  NodeRepository
	groups group.GroupRepository
	log    *slog.Logger
}

func NewGetRootNodesUseCase(
	nodes NodeRepository,
	groups group.GroupRepository,
	mainLogger *slog.Logger,
) *GetRootNodesUseCase {
	log := mainLogger.With("usecase", "GetRootNodesUseCase")
	return &GetRootNodesUseCase{nodes: nodes, groups: groups, log: log}
}

func (uc *GetRootNodesUseCase) Execute(ctx context.Context) ([]domain.Node, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	switch usr.Role {
	case domain.SuperUsrRole:
		return uc.nodes.GetRoot(ctx)

	case domain.LimitedUsrRole, domain.NormalUsrRole:
		groups, err := uc.groups.GetByUsrAssignedID(ctx, usr.ID)
		if err != nil {
			return nil, err
		}

		if len(groups) == 0 {
			return []domain.Node{}, nil
		}

		groupIDs := make([]domain.GroupID, len(groups))
		for i := range groups {
			groupIDs = append(groupIDs, groups[i].ID)
		}

		return uc.nodes.GetRootByGroupIDs(ctx, groupIDs)

	default:
		uc.log.Warn("user role not supported for getting root nodes", "role", usr.Role)
		return nil, apperror.ErrForbidden(nil)
	}
}
