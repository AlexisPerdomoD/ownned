package usr

import (
	"context"

	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type GetMeUseCase struct {
	usrs UsrRepository
}

func (uc *GetMeUseCase) Execute(ctx context.Context) (*domain.Usr, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	return uc.usrs.GetByID(ctx, usr.ID)
}

func NewGetMeUseCase(usrs UsrRepository) *GetMeUseCase {
	return &GetMeUseCase{usrs: usrs}
}
