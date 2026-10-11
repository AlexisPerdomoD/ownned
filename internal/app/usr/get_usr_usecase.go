package usr

import (
	"context"

	"ownned/internal/domain"
)

type GetUsrUseCase struct {
	usrs UsrRepository
}

func (uc *GetUsrUseCase) Execute(ctx context.Context, usrID domain.UsrID) (*domain.Usr, error) {
	return uc.usrs.GetByID(ctx, usrID)
}

func NewGetUsrUseCase(usrs UsrRepository) *GetUsrUseCase {
	return &GetUsrUseCase{usrs: usrs}
}
