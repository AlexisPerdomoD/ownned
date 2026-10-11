package group

import (
	"context"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type DeleteGroupNodeUseCase struct {
	AccessChecker
	groupNodeRepository GroupNodeRepository
}

func NewDeleteGroupNodeUseCase(
	groupNode GroupNodeRepository,
	groupUsr GroupUsrRepository,
) *DeleteGroupNodeUseCase {

	return &DeleteGroupNodeUseCase{
		AccessChecker:       AccessChecker{groupUsr},
		groupNodeRepository: groupNode,
	}
}

func (uc *DeleteGroupNodeUseCase) Execute(
	ctx context.Context,
	groupID domain.GroupID,
	nodeID domain.NodeID) error {

	usr, err := identity.Get(ctx)
	if err != nil {
		return err
	}

	if !usr.Role.CanUnAssignGroupNode() {
		detail := make(map[string]string)
		detail["reason"] = "User can not do this action."
		return apperror.ErrForbidden(detail)
	}

	yes, err := uc.hasGroupAccessTo(ctx, usr, groupID, domain.GroupOwnerAccess)
	if err != nil {
		return err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access enough to group ID=" + groupID.String()
		return apperror.ErrForbidden(detail)
	}

	return uc.groupNodeRepository.Delete(ctx, groupID, nodeID)
}
