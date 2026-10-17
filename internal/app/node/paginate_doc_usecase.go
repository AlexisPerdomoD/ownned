package node

import (
	"context"

	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/app/pagination"
	"ownned/internal/domain"
)

type PaginateDocUseCase struct {
	docs   DocRepository
	groups group.GroupRepository
}

func NewPaginateDocUseCase(docs DocRepository, groups group.GroupRepository) *PaginateDocUseCase {
	return &PaginateDocUseCase{docs: docs, groups: groups}
}

func (uc *PaginateDocUseCase) Execute(ctx context.Context, params PaginateDoc) (*pagination.PaginationResult[domain.Doc], error) {
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
			return &pagination.PaginationResult[domain.Doc]{
				Data:       make([]domain.Doc, 0),
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

	return uc.docs.Paginate(ctx, params)
}
