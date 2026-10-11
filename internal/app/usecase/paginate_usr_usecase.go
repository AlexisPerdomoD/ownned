package usecase

import (
	"context"

	"ownned/internal/domain"
	"ownned/pkg/helper"
	"ownned/pkg/pagination"
)

type PaginateUsrUseCase struct {
	usrRepository domain.UsrRepository
}

func (uc *PaginateUsrUseCase) Execute(
	ctx context.Context,
	page uint,
	limit uint,
	search string,
	role *domain.UsrRole,
) (*pagination.PaginationResult[domain.Usr], error) {
	param := domain.UsrPaginationParam{
		Role: role,
		PaginationParam: pagination.PaginationParam{
			Page:   page,
			Limit:  limit,
			Search: search,
		},
	}

	res, err := uc.usrRepository.Paginate(ctx, param)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func NewPaginateUsrUseCase(ur domain.UsrRepository) *PaginateUsrUseCase {
	helper.NotNilOrPanic(ur, "UsrRepository")
	return &PaginateUsrUseCase{ur}
}
