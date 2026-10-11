package usecase

import (
	"context"

	"ownned/internal/domain"
)

type GetUsrUseCase struct {
	usrRepository domain.UsrRepository
}

func (uc *GetUsrUseCase) Execute(ctx context.Context, usrID domain.UsrID) (*domain.Usr, error) {
	return uc.usrRepository.GetByID(ctx, usrID)
}

func NewGetUsrUseCase(ur domain.UsrRepository) *GetUsrUseCase {
	if ur == nil {
		panic("NewGetUsrUseCase were provided nil dependencies")
	}

	return &GetUsrUseCase{ur}
}
