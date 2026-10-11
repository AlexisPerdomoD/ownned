package group

import (
	"context"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type DeleteGroupUsrUseCase struct {
	accessChecker
}

func NewDeleteGroupUsrUseCase(
	groupUsrs GroupUsrRepository,
) *DeleteGroupUsrUseCase {
	return &DeleteGroupUsrUseCase{
		accessChecker: accessChecker{
			groupUsrs: groupUsrs,
		},
	}
}

func (uc *DeleteGroupUsrUseCase) Execute(
	ctx context.Context,
	groupID domain.GroupID,
	targetUsrID domain.UsrID) error {
	usr, err := identity.Get(ctx)
	if err != nil {
		return err
	}

	if !usr.Role.CanUnAssignGroupUsr() {
		detail := make(map[string]string)
		detail["reason"] = "User can not do this action."
		return apperror.ErrForbidden(detail)
	}

	yes, err := uc.HasGroupAccessTo(ctx, groupID, domain.GroupOwnerAccess)
	if err != nil {
		return err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access enough to group ID=" + groupID.String()
		return apperror.ErrForbidden(detail)
	}

	return uc.groupUsrs.Delete(ctx, groupID, targetUsrID)
}
