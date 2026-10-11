package usecase

import (
	"context"
	"fmt"

	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type GetNodeCommentsUseCase struct {
	accessChecker
	nodeRepository        domain.NodeRepository
	nodeCommentRepository domain.NodeCommentRepository
}

func (uc *GetNodeCommentsUseCase) Execute(ctx context.Context, nodeID domain.NodeID) ([]domain.NodeComment, error) {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return nil, err
	}

	node, err := uc.nodeRepository.GetByID(ctx, nodeID)
	if err != nil {
		return nil, err
	}

	if node == nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("Node with ID=%s was not found", nodeID)
		return nil, apperror.ErrNotFound(detail)
	}

	canDo, err := uc.hasNodeAccessTo(ctx, usr, node.Path, domain.GroupReadOnlyAccess)
	if err != nil {
		return nil, err
	}

	if !canDo {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User does not have access to specified node ID=%s", nodeID)
		return nil, apperror.ErrForbidden(detail)
	}

	return uc.nodeCommentRepository.GetByNode(ctx, nodeID)
}

func NewGetNodeCommentsUseCase(
	nr domain.NodeRepository,
	ncr domain.NodeCommentRepository,
	gur domain.GroupUsrRepository,
) *GetNodeCommentsUseCase {
	helper.NotNilOrPanic(nr, "NodeRepository")
	helper.NotNilOrPanic(ncr, "NodeCommentRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	ac := accessChecker{gur}
	return &GetNodeCommentsUseCase{ac, nr, ncr}
}
