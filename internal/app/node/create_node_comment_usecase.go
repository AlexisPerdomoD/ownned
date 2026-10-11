package node

import (
	"context"
	"log/slog"
	"strings"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/domain"

	"github.com/google/uuid"
)

type CreateNodeCommentUseCase struct {
	group.AccessChecker
	nodes        NodeRepository
	nodeComments NodeCommentRepository
	log          *slog.Logger
}

func NewCreateNodeCommentUseCase(
	access_checker group.AccessChecker,
	nodes NodeRepository,
	nodeComments NodeCommentRepository,
	mainLogger *slog.Logger,
) *CreateNodeCommentUseCase {
	log := mainLogger.With("usecase", "CreateNodeCommentUseCase")
	return &CreateNodeCommentUseCase{
		AccessChecker: access_checker,
		nodes:         nodes,
		nodeComments:  nodeComments,
		log:           log,
	}
}

func (uc *CreateNodeCommentUseCase) Execute(
	ctx context.Context,
	nodeID domain.NodeID,
	content string,
) (*domain.NodeComment, error) {
	content = strings.TrimSpace(content)

	if len(content) == 0 {
		detail := map[string]string{"reason": "Comment content is empty"}
		return nil, apperror.ErrBadRequest(detail)
	}

	yes, err := uc.HasNodeAccessTo(ctx, nodeID, domain.GroupReadOnlyAccess)
	if err != nil {
		uc.log.WarnContext(ctx,
			"failed to check if user can access node",
			"nodeID", nodeID,
			"error", err)
		return nil, err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to specified node"
		return nil, apperror.ErrForbidden(detail)
	}

	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	node, err := uc.nodes.GetByID(ctx, nodeID)
	if err != nil {
		return nil, err
	}

	if node == nil {
		uc.log.WarnContext(ctx,
			"failed to get node when expected after access check",
			"nodeID", nodeID)
		return nil, apperror.ErrIlegalDBState(nil)
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

	if err = uc.nodeComments.Create(ctx, comment); err != nil {
		return nil, err
	}

	return comment, nil
}
