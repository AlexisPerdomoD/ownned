package usecase

import (
	"context"
	"fmt"

	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type CreateGroupNodeUseCase struct {
	accessChecker
	groupNodeRepository domain.GroupNodeRepository
	nodeRepository      domain.NodeRepository
}

func (uc *CreateGroupNodeUseCase) Execute(ctx context.Context, groupID domain.GroupID, nodeID domain.NodeID) error {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return err
	}

	if !usr.Role.CanAssignGroupNode() {
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
		detail["reason"] = fmt.Sprintf("User does not have access enough to group ID=%s", groupID)
		return apperror.ErrForbidden(detail)
	}

	node, err := uc.nodeRepository.GetByID(ctx, nodeID)
	if err != nil {
		return err
	}

	if node == nil {
		detail := make(map[string]string)
		detail["reason"] = "Node does not exist with ID=" + nodeID.String()
		return apperror.ErrNotFound(detail)
	}

	hasAccssOnNode, err := uc.hasNodeAccessTo(ctx, usr, node.Path, domain.GroupOwnerAccess)
	if err != nil {
		return err
	}

	if !hasAccssOnNode {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User does not have access enough to node ID=%s", nodeID)
		return apperror.ErrForbidden(detail)
	}

	groupNodes, err := uc.nodeRepository.GetByGroup(ctx, groupID)
	if err != nil {
		return err
	}

	for _, n := range groupNodes {
		if n.ID == nodeID {
			detail := make(map[string]string)
			detail["reason"] = fmt.Sprintf("Node ID=%s is already attached to group ID=%s.", nodeID, groupID)
			return apperror.ErrBadRequest(detail)
		}

		if n.Path.IsParentOf(node.Path) {
			detail := make(map[string]string)
			detail["reason"] = fmt.Sprintf("Node ID=%s is already attached to group ID=%s by a parent.", nodeID, groupID)
			return apperror.ErrBadRequest(detail)
		}
	}

	return uc.groupNodeRepository.Upsert(ctx, &domain.UpsertGroupNode{
		GroupID: groupID,
		NodeID:  nodeID,
	})
}

func NewCreateGroupNodeUseCase(
	gr domain.GroupRepository,
	gnr domain.GroupNodeRepository,
	gur domain.GroupUsrRepository,
	nr domain.NodeRepository,
) *CreateGroupNodeUseCase {
	helper.NotNilOrPanic(gr, "GroupRepository")
	helper.NotNilOrPanic(gnr, "GroupNodeRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	helper.NotNilOrPanic(nr, "NodeRepository")
	ac := accessChecker{gur}
	return &CreateGroupNodeUseCase{ac, gnr, nr}
}
