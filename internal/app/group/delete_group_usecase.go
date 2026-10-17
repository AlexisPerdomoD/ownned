package group

import (
	"context"
	"fmt"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type DeleteGroupUseCase struct {
	accessChecker
	group GroupRepository
}

func NewDeleteGroupUseCase(group GroupRepository, groupUsr GroupUsrRepository) *DeleteGroupUseCase {
	return &DeleteGroupUseCase{
		groupUsrs: groupUsr,
		group:     group,
	}
}

func (uc *DeleteGroupUseCase) Execute(
	ctx context.Context,
	groupID domain.GroupID,
) (*domain.Group, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	if !usr.Role.CanDeleteGroup() {
		detail := make(map[string]string)
		detail["reason"] = "User can not do this action."
		return nil, apperror.ErrForbidden(detail)
	}

	group, err := uc.group.GetByID(ctx, groupID)
	if err != nil {
		return nil, err
	}

	if group == nil {
		detail := make(map[string]string)
		detail["reason"] = "Group does not exist with ID=" + groupID.String()
		return nil, apperror.ErrNotFound(detail)
	}

	yes, err := uc.HasGroupAccessTo(ctx, group.ID, domain.GroupOwnerAccess)
	if err != nil {
		return nil, err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User does not have access to specified group")
		return nil, apperror.ErrForbidden(detail)
	}

	if err := uc.group.Delete(ctx, group.ID); err != nil {
		return nil, err
	}

	return group, nil
}
