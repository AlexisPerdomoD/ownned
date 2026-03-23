package usecase

import (
	"context"

	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type DeleteGroupUsrUseCase struct {
	accessChecker
}

func (uc *DeleteGroupUsrUseCase) Execute(ctx context.Context, groupID domain.GroupID, targetUsrID domain.UsrID) error {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return err
	}

	if !usr.Role.CanUnAssignGroupUsr() {
		detail := make(map[string]string)
		detail["reason"] = "User can not do this action."
		return apperror.ErrForbidden(detail)
	}

	hasAccssOnGroup, err := uc.hasGroupAccessTo(ctx, usr, groupID, domain.GroupOwnerAccess)
	if err != nil {
		return err
	}

	if !hasAccssOnGroup {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access enough to group ID=" + groupID.String()
		return apperror.ErrForbidden(detail)
	}

	return uc.groupUsrRepository.RemoveUsr(ctx, groupID, targetUsrID)
}

func NewDeleteGroupUsrUseCase(
	gur domain.GroupUsrRepository,
) *DeleteGroupUsrUseCase {
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	ac := accessChecker{gur}
	return &DeleteGroupUsrUseCase{ac}
}
