package usecase

import (
	"context"

	"ownned/internal/domain"
	"ownned/pkg/helper"
)

type GetMeUseCase struct {
	usrRepository domain.UsrRepository
}

func (uc *GetMeUseCase) Execute(ctx context.Context) (*domain.Usr, error) {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return nil, err
	}

	return uc.usrRepository.GetByID(ctx, usr.ID)
}

func NewGetMeUseCase(ur domain.UsrRepository) *GetMeUseCase {
	helper.NotNilOrPanic(ur, "UsrRepository")
	return &GetMeUseCase{ur}
}
