package usecase

import (
	"context"

	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type DeleteGroupNodeUseCase struct {
	accessChecker
	groupNodeRepository domain.GroupNodeRepository
}

func (uc *DeleteGroupNodeUseCase) Execute(ctx context.Context, groupID domain.GroupID, nodeID domain.NodeID) error {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return err
	}

	if !usr.Role.CanUnAssignGroupNode() {
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

	return uc.groupNodeRepository.RemoveNode(ctx, groupID, nodeID)
}

func NewDeleteGroupNodeUseCase(
	gr domain.GroupRepository,
	gnr domain.GroupNodeRepository,
	gur domain.GroupUsrRepository,
) *DeleteGroupNodeUseCase {
	helper.NotNilOrPanic(gr, "GroupRepository")
	helper.NotNilOrPanic(gnr, "GroupNodeRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	ac := accessChecker{gur}
	return &DeleteGroupNodeUseCase{ac, gnr}
}
