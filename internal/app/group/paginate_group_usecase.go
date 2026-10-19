package group

import (
	"context"

	"ownned/internal/app/identity"
	"ownned/internal/app/pagination"
	"ownned/internal/domain"
)

type PaginateGroupUseCase struct {
	groups GroupRepository
}

func NewPaginateGroupUseCase(
	groups GroupRepository,
) *PaginateGroupUseCase {
	return &PaginateGroupUseCase{groups: groups}
}

func (uc *PaginateGroupUseCase) Execute(ctx context.Context, params GroupPaginateParam) (*pagination.PaginationResult[domain.Group], error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	if usr.Role != domain.SuperUsrRole {
		params.UsrID = &usr.ID
	}

	res, err := uc.groups.Paginate(ctx, params)
	if err != nil {
		return nil, err
	}

	return res, nil
}
