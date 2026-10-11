package usr

import (
	"context"

	"ownned/internal/app/pagination"
	"ownned/internal/domain"
)

type PaginateUsrUseCase struct {
	usrs UsrRepository
}

func NewPaginateUsrUseCase(usrs UsrRepository) *PaginateUsrUseCase {
	return &PaginateUsrUseCase{usrs: usrs}
}

func (uc *PaginateUsrUseCase) Execute(
	ctx context.Context,
	params pagination.PaginationParam,
	role *domain.UsrRole,
) (*pagination.PaginationResult[domain.Usr], error) {
	param := UsrPaginationParam{
		Role:            role,
		PaginationParam: params,
	}

	res, err := uc.usrs.Paginate(ctx, param)
	if err != nil {
		return nil, err
	}

	return res, nil
}
