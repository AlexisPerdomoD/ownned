package group

import (
	"context"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type CreateGroupNodeUseCase struct {
	accessChecker
	groupNodeRepository GroupNodeRepository
}

func NewCreateGroupNodeUseCase(
	groupNode GroupNodeRepository,
	groupUsr GroupUsrRepository,
) *CreateGroupNodeUseCase {
	return &CreateGroupNodeUseCase{
		accessChecker:       accessChecker{groupUsr},
		groupNodeRepository: groupNode,
	}
}

func (uc *CreateGroupNodeUseCase) Execute(
	ctx context.Context,
	groupID domain.GroupID,
	nodeID domain.NodeID,
) error {
	usr, err := identity.Get(ctx)
	if err != nil {
		return err
	}

	if !usr.Role.CanAssignGroupNode() {
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
		detail["reason"] = "Must have access to group as owner to assign node to group"
		return apperror.ErrForbidden(detail)
	}

	yes, err = uc.HasNodeAccessTo(ctx, nodeID, domain.GroupOwnerAccess)
	if err != nil {
		return err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "Must have access to node as owner to assign node to an ownned group"
		return apperror.ErrForbidden(detail)
	}

	return uc.groupNodeRepository.Upsert(ctx, &domain.GroupNode{
		GroupID: groupID,
		NodeID:  nodeID,
	})
}
