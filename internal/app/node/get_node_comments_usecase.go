package node

import (
	"context"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/domain"
)

type GetNodeCommentsUseCase struct {
	group.AccessChecker
	nodeComments NodeCommentRepository
}

func NewGetNodeCommentsUseCase(
	accessChecker group.AccessChecker,
	nodes NodeRepository,
	nodeComments NodeCommentRepository,
) *GetNodeCommentsUseCase {
	return &GetNodeCommentsUseCase{
		AccessChecker: accessChecker,
		nodeComments:  nodeComments,
	}
}

func (uc *GetNodeCommentsUseCase) Execute(ctx context.Context, nodeID domain.NodeID) ([]domain.NodeComment, error) {
	yes, err := uc.HasNodeAccessTo(ctx, nodeID, domain.GroupReadOnlyAccess)
	if err != nil {
		return nil, err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to specified node"
		return nil, apperror.ErrForbidden(detail)
	}

	return uc.nodeComments.GetByNode(ctx, nodeID)
}
