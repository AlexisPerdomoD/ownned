package node

import (
	"context"
	"log/slog"
	"sync"

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

func (uc *GetRootNodesUseCase) Execute(ctx context.Context) ([]NodeDisplay, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	switch usr.Role {

	case domain.SuperUsrRole:
		nodes, err := uc.nodes.GetRoot(ctx)
		if err != nil {
			return nil, err
		}

		resp := make([]NodeDisplay, len(nodes))
		for i := range nodes {
			resp[i] = NodeDisplay{Node: nodes[i], DisplayPath: "/" + nodes[i].Name}
		}

		return resp, nil

	case domain.LimitedUsrRole, domain.NormalUsrRole:
		groups, err := uc.groups.GetByUsrAssignedID(ctx, usr.ID)
		if err != nil {
			return nil, err
		}

		if len(groups) == 0 {
			return []NodeDisplay{}, nil
		}

		groupIDs := make([]domain.GroupID, len(groups))
		for i := range groups {
			groupIDs[i] = groups[i].ID
		}

		nodes, err := uc.nodes.GetRootByGroupIDs(ctx, groupIDs)
		if err != nil {
			return nil, err
		}

		resp := make([]NodeDisplay, len(nodes))
		wg := sync.WaitGroup{}

		for i := range nodes {
			cb := func() {
				node := &resp[i]
				path, err := uc.nodes.GetDisplayPathByID(ctx, node.ID)
				if err != nil {
					uc.log.WarnContext(ctx, "failed to get display path for node",
						"nodeID", node.ID,
						"error", err)
					return
				}

				node.DisplayPath = *path
			}

			wg.Go(cb)
		}

		wg.Wait()
		return resp, nil

	default:
		uc.log.Warn("user role not supported for getting root nodes", "role", usr.Role)
		return nil, apperror.ErrForbidden(nil)
	}
}
