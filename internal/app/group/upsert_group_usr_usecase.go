package group

import (
	"context"
	"fmt"
	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type UpsertGroupUsrUseCase struct {
	accessChecker
	usrs UsrLookup
}

func NewUpsertGroupUsrUseCase(
	groupUsr GroupUsrRepository,
	usrs UsrLookup,
) *UpsertGroupUsrUseCase {
	return &UpsertGroupUsrUseCase{
		groupUsrs: groupUsr,
		usrs:      usrs,
	}
}

func (uc *UpsertGroupUsrUseCase) Execute(
	ctx context.Context,
	groupID domain.GroupID,
	targetUsrID domain.UsrID,
	access domain.GroupUsrAccess) error {
	usr, err := identity.Get(ctx)
	if err != nil {
		return err
	}

	if !usr.Role.CanAssignGroupUsr() {
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
		detail["reason"] = fmt.Sprintf("User does not have access enough to group to assign users.")
		return apperror.ErrForbidden(detail)
	}

	targetUsr, err := uc.usrs.GetByID(ctx, targetUsrID)
	if err != nil {
		return err
	}

	if targetUsr == nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User does not exist.")
		return apperror.ErrNotFound(detail)
	}

	if yes, reason := access.IsValidAccessToRole(targetUsr.Role); !yes {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("Target user with can not be assigned to group with access=%s because %s", access, reason)
		return apperror.ErrForbidden(detail)
	}

	if targetUsr.Role == domain.SuperUsrRole {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User with ID=%s is a super user and can not be assigned to a group.", targetUsrID)
		return apperror.ErrConflict(detail)
	}

	return uc.groupUsrs.Upsert(ctx, &domain.GroupUsr{
		GroupID: groupID,
		UsrID:   targetUsr.ID,
		Access:  access,
	})
}
