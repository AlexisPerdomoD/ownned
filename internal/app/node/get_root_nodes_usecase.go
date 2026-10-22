package node

import (
	"context"
	"log/slog"
	"sync"

	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type GetRootNodesUseCase struct {
	group.AccessChecker
	nodes  NodeRepository
	groups group.GroupRepository
	log    *slog.Logger
}

func NewGetRootNodesUseCase(
	access_checker group.AccessChecker,
	nodes NodeRepository,
	groups group.GroupRepository,
	mainLogger *slog.Logger,
) *GetRootNodesUseCase {
	log := mainLogger.With("usecase", "GetRootNodesUseCase")
	return &GetRootNodesUseCase{
		AccessChecker: access_checker,
		nodes:         nodes,
		groups:        groups,
		log:           log,
	}
}

func (uc *GetRootNodesUseCase) Execute(ctx context.Context) ([]NodeDisplay, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

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

	resp := make([]NodeDisplay, 0, len(nodes))
	wg := sync.WaitGroup{}

	for i := range nodes {
		resp = append(resp, NodeDisplay{Node: nodes[i]})
		display := &resp[i]

		wg.Go(func() {
			access, err := uc.GetNodeAccess(ctx, display.ID)
			if err != nil {
				uc.log.WarnContext(ctx, "failed to get access for node",
					"nodeID", display.ID,
					"error", err)
				return
			}

			display.access = access

			path, err := uc.nodes.GetDisplayPathByID(ctx, display.ID)
			if err != nil {
				uc.log.WarnContext(ctx, "failed to get display path for node",
					"nodeID", display.ID,
					"error", err)
				return
			}

			display.DisplayPath = *path
		})

	}

	wg.Wait()
	return resp, nil
}
