package usecase

import (
	"context"
	"fmt"
	"log/slog"

	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"

	"github.com/google/uuid"
)

type CreateNodeCommentUseCase struct {
	accessChecker
	nodeRepository        domain.NodeRepository
	nodeCommentRepository domain.NodeCommentRepository
	log                   *slog.Logger
}

func (uc *CreateNodeCommentUseCase) Execute(
	ctx context.Context,
	nodeID domain.NodeID,
	content string,
) (*domain.NodeComment, error) {
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
		uc.log.WarnContext(ctx, "failed to check if user can access node", "nodeID", nodeID, "error", err)
		return nil, err
	}

	if !canDo {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User does not have access to specified node ID=%s", nodeID)
		return nil, apperror.ErrForbidden(detail)
	}

	commentID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}
	comment := &domain.NodeComment{
		ID:      commentID,
		NodeID:  node.ID,
		UsrID:   usr.ID,
		Content: content,
	}

	if err = uc.nodeCommentRepository.Create(ctx, comment); err != nil {
		return nil, err
	}

	return comment, nil
}

func NewCreateNodeCommentUseCase(
	nr domain.NodeRepository,
	ncr domain.NodeCommentRepository,
	gur domain.GroupUsrRepository,
	mainLogger *slog.Logger,
) *CreateNodeCommentUseCase {
	helper.NotNilOrPanic(nr, "NodeRepository")
	helper.NotNilOrPanic(ncr, "NodeCommentRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	helper.NotNilOrPanic(mainLogger, "mainLogger")
	log := mainLogger.With("usecase", "CreateNodeCommentUseCase")
	ac := accessChecker{gur}
	return &CreateNodeCommentUseCase{ac, nr, ncr, log}
}
