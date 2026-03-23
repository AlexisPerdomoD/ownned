package usecase

import (
	"context"
	"fmt"

	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type DeleteNodeCommentUseCase struct {
	accessChecker
	nodeRepository        domain.NodeRepository
	nodeCommentRepository domain.NodeCommentRepository
}

func (uc *DeleteNodeCommentUseCase) Execute(ctx context.Context, commentID domain.NodeCommentID) (*domain.NodeComment, error) {
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

	if usr.Role != domain.SuperUsrRole && usr.ID != comment.UsrID {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User with ID=%s does not have access to NodeComment with ID=%s", usr.ID, commentID)
		return nil, apperror.ErrForbidden(detail)
	}

	err = uc.nodeCommentRepository.Delete(ctx, comment.ID)
	if err != nil {
		return nil, err
	}

	return comment, nil
}

func NewDeleteNodeCommentUseCase(
	nr domain.NodeRepository,
	ncr domain.NodeCommentRepository,
	gur domain.GroupUsrRepository,
) *DeleteNodeCommentUseCase {
	helper.NotNilOrPanic(nr, "NodeRepository")
	helper.NotNilOrPanic(ncr, "NodeCommentRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	ac := accessChecker{gur}
	return &DeleteNodeCommentUseCase{ac, nr, ncr}
}
