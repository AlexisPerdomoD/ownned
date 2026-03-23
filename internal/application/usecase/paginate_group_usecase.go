package usecase

import (
	"context"

	"ownned/internal/domain"
	"ownned/pkg/helper"
	"ownned/pkg/pagination"
)

type PaginateGroupUseCase struct {
	groupRepository domain.GroupRepository
}

func (uc *PaginateGroupUseCase) Execute(
	ctx context.Context,
	page uint,
	limit uint,
	search string,
	onlyMyGroups bool,
) (*pagination.PaginationResult[domain.Group], error) {
	param := domain.GroupPaginateParam{
		UsrID: nil,
		PaginationParam: pagination.PaginationParam{
			Page:   page,
			Limit:  limit,
			Search: search,
		},
	}

	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return nil, err
	}

	if usr.Role != domain.SuperUsrRole || onlyMyGroups {
		param.UsrID = &usr.ID
	}

	res, err := uc.groupRepository.Paginate(ctx, param)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func NewPaginateGroupUseCase(
	gr domain.GroupRepository,
) *PaginateGroupUseCase {
	helper.NotNilOrPanic(gr, "GroupRepository")
	return &PaginateGroupUseCase{gr}
}
