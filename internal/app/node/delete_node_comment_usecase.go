package node

import (
	"context"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type DeleteNodeCommentUseCase struct {
	group.AccessChecker
	nodes        NodeRepository
	nodeComments NodeCommentRepository
}

func NewDeleteNodeCommentUseCase(
	accessChecker group.AccessChecker,
	nodes NodeRepository,
	nodeComments NodeCommentRepository,
) *DeleteNodeCommentUseCase {
	return &DeleteNodeCommentUseCase{
		AccessChecker: accessChecker,
		nodes:         nodes,
		nodeComments:  nodeComments,
	}
}

func (uc *DeleteNodeCommentUseCase) Execute(ctx context.Context, commentID domain.NodeCommentID) (*domain.NodeComment, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	comment, err := uc.nodeComments.GetByID(ctx, commentID)
	if err != nil {
		return nil, err
	}

	if comment == nil {
		detail := make(map[string]string)
		detail["reason"] = "NodeComment was not found"
		return nil, apperror.ErrNotFound(detail)
	}

	if usr.Role != domain.SuperUsrRole && usr.ID != comment.UsrID {
		detail := make(map[string]string)
		detail["reason"] = "does not have access to specified NodeComment"
		return nil, apperror.ErrForbidden(detail)
	}

	err = uc.nodeComments.Delete(ctx, comment.ID)
	if err != nil {
		return nil, err
	}

	return comment, nil
}
