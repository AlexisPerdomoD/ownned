package usecase

import (
	"context"
	"fmt"

	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type UpdateNodeCommentUseCase struct {
	nodeCommentRepository domain.NodeCommentRepository
}

func (uc *UpdateNodeCommentUseCase) Execute(ctx context.Context, commentID domain.NodeCommentID, content string) (*domain.NodeComment, error) {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return nil, err
	}

	comment, err := uc.nodeCommentRepository.GetByID(ctx, commentID)
	if err != nil {
		return nil, err
	}

	if comment == nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("NodeComment with ID=%s was not found", commentID)
		return nil, apperror.ErrNotFound(detail)
	}

	if usr.ID != comment.UsrID {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User with ID=%s does not have access to NodeComment with ID=%s", usr.ID, commentID)
		return nil, apperror.ErrForbidden(detail)
	}

	comment.Content = content

	err = uc.nodeCommentRepository.Update(ctx, comment)
	if err != nil {
		return nil, err
	}

	return comment, nil
}

func NewUpdateNodeCommentUseCase(
	ncr domain.NodeCommentRepository,
) *UpdateNodeCommentUseCase {
	helper.NotNilOrPanic(ncr, "NodeCommentRepository")
	return &UpdateNodeCommentUseCase{ncr}
}
