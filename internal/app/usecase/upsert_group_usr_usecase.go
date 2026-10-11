package usecase

import (
	"context"
	"fmt"

	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type UpsertGroupUsrUseCase struct {
	accessChecker
	usrRepository domain.UsrRepository
}

func (uc *UpsertGroupUsrUseCase) Execute(ctx context.Context, groupID domain.GroupID, targetUsrID domain.UsrID, access domain.GroupUsrAccess) error {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return err
	}

	if !usr.Role.CanAssignGroupUsr() {
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
		detail["reason"] = fmt.Sprintf("User does not have access enough to group ID=%s to assign users.", groupID)
		return apperror.ErrForbidden(detail)
	}

	targetUsr, err := uc.usrRepository.GetByID(ctx, targetUsrID)
	if err != nil {
		return err
	}

	if targetUsr == nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User with ID=%s does not exist.", targetUsrID)
		return apperror.ErrNotFound(detail)
	}

	if isValidAccessToRole, reason := access.IsValidAccessToRole(targetUsr.Role); !isValidAccessToRole {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User with ID=%s can not be assigned to group with access=%s because %s", targetUsrID, access, reason)
		return apperror.ErrForbidden(detail)
	}

	if targetUsr.Role == domain.SuperUsrRole {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User with ID=%s is a super user and can not be assigned to a group.", targetUsrID)
		return apperror.ErrConflict(detail)
	}

	return uc.groupUsrRepository.Upsert(ctx, &domain.UpsertGroupUsr{
		GroupID: groupID,
		UsrID:   targetUsr.ID,
		Access:  access,
	})
}

func NewUpsertGroupUsrUseCase(
	ur domain.UsrRepository,
	gur domain.GroupUsrRepository,
) *UpsertGroupUsrUseCase {
	helper.NotNilOrPanic(ur, "UsrRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	ac := accessChecker{gur}
	return &UpsertGroupUsrUseCase{ac, ur}
}
