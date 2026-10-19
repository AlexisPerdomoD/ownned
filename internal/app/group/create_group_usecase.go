package group

import (
	"context"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/app/tx"
	"ownned/internal/domain"
)

type CreateGroupDTO struct {
	Name        string `json:"name" validate:"required,min=1,max=255,excludes=\\/"`
	Description string `json:"description" validate:"max=1000"`
}

type CreateGroupTx interface {
	tx.TxCtx

	GroupRepository() GroupRepository
	GroupUsrRepository() GroupUsrRepository
}

type CreateGroupUseCase struct {
	txFactory tx.TxFactory[CreateGroupTx]
}

func NewCreateGroupUseCase(txFactory tx.TxFactory[CreateGroupTx]) *CreateGroupUseCase {
	return &CreateGroupUseCase{txFactory}
}

func (uc *CreateGroupUseCase) Execute(ctx context.Context, args CreateGroupDTO) (*domain.Group, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	if !usr.Role.CanCreateGroup() {
		detail := make(map[string]string)
		detail["reason"] = "Usr does not have permission to do this action."
		return nil, apperror.ErrForbidden(detail)
	}

	groupID := uuid.NewV7()

	group := &domain.Group{
		ID:          groupID,
		UsrID:       &usr.ID,
		Name:        args.Name,
		Description: args.Description,
	}

	groupUsr := &domain.GroupUsr{
		GroupID: group.ID,
		UsrID:   usr.ID,
		Access:  domain.GroupOwnerAccess,
	}

	if err := uc.txFactory.Do(ctx, func(t CreateGroupTx) error {
		if err := t.GroupRepository().Create(t.Ctx(), group); err != nil {
			return err
		}

		if err := t.GroupUsrRepository().Upsert(t.Ctx(), groupUsr); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return group, nil
}
