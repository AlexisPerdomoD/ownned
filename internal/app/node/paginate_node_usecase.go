package node

import (
	"context"

	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/app/pagination"
	"ownned/internal/domain"
)

type PaginateNodeUseCase struct {
	nodes  NodeRepository
	groups group.GroupRepository
}

func NewPaginateNodeUseCase(nodes NodeRepository, groups group.GroupRepository) *PaginateNodeUseCase {
	return &PaginateNodeUseCase{nodes: nodes, groups: groups}
}

func (uc *PaginateNodeUseCase) Execute(ctx context.Context, params PaginateNode) (*pagination.PaginationResult[domain.Node], error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	if usr.Role != domain.SuperUsrRole {
		groups, err := uc.groups.GetByUsrAssignedID(ctx, usr.ID)
		if err != nil {
			return nil, err
		}

		if len(groups) == 0 {
			return &pagination.PaginationResult[domain.Node]{
				Data:       make([]domain.Node, 0),
				Page:       params.GetSafePage(),
				Limit:      params.GetSafeLimit(),
				TotalPages: 0,
				TotalCount: 0,
			}, nil
		}

		params.GroupIDs = make([]domain.GroupID, 0, len(groups))
		for i := range groups {
			params.GroupIDs = append(params.GroupIDs, groups[i].ID)
		}
	}

	return uc.nodes.Paginate(ctx, params)
}
