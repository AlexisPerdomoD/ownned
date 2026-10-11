package node

import (
	"context"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type UpdateNodeCommentUseCase struct {
	nodeComments NodeCommentRepository
}

func NewUpdateNodeCommentUseCase(
	nodeComments NodeCommentRepository,
) *UpdateNodeCommentUseCase {
	return &UpdateNodeCommentUseCase{
		nodeComments: nodeComments,
	}
}

func (uc *UpdateNodeCommentUseCase) Execute(ctx context.Context, commentID domain.NodeCommentID, content string) (*domain.NodeComment, error) {
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
		detail["reason"] = "NodeCommentwas not found"
		return nil, apperror.ErrNotFound(detail)
	}

	if usr.ID != comment.UsrID {
		detail := make(map[string]string)
		detail["reason"] = "only the owner of the NodeComment can update it"
		return nil, apperror.ErrForbidden(detail)
	}

	comment.Content = content

	err = uc.nodeComments.Update(ctx, comment)
	if err != nil {
		return nil, err
	}

	return comment, nil
}
