package node

import (
	"context"
	"log/slog"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/app/storage"
	"ownned/internal/domain"
)

type DeleteNodeFileUseCase struct {
	group.AccessChecker
	storage storage.Storage
	docs    DocRepository
	nodes   NodeRepository
	log     *slog.Logger
}

func NewDeleteDocUseCase(
	access_checker group.AccessChecker,
	storage storage.Storage,
	docs DocRepository,
	nodes NodeRepository,
	mainLogger *slog.Logger,
) *DeleteNodeFileUseCase {
	log := mainLogger.With("usecase", "DeleteDocUseCase")
	return &DeleteNodeFileUseCase{
		AccessChecker: access_checker,
		storage:       storage,
		docs:          docs,
		nodes:         nodes,
		log:           log,
	}
}

func (uc *DeleteNodeFileUseCase) Execute(
	ctx context.Context,
	docID domain.DocID,
) (*FileNode, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	if !usr.Role.CanDeleteDoc() {
		detail := make(map[string]string)
		detail["reason"] = "User can no do this action."
		return nil, apperror.ErrForbidden(detail)
	}

	doc, err := uc.docs.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}

	if doc == nil {
		detail := make(map[string]string)
		detail["reason"] = "Doc entity was not found"
		return nil, apperror.ErrNotFound(detail)
	}

	yes, err := uc.HasNodeAccessTo(ctx, doc.NodeID, domain.GroupWriteAccess)
	if err != nil {
		uc.log.WarnContext(ctx, "failed to check if user can access node", "nodeID", doc.NodeID, "error", err)
		return nil, err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to specified node"
		return nil, apperror.ErrForbidden(detail)
	}

	node, err := uc.nodes.GetByID(ctx, doc.NodeID)
	if err != nil {
		return nil, err
	}

	var displayPath string
	if path, _ := uc.nodes.GetDisplayPathByID(ctx, node.ID); path != nil {
		displayPath = *path
	}

	if err := uc.nodes.Delete(ctx, doc.NodeID); err != nil {
		return nil, err
	}

	// NOTE: the storage object is keyed by the doc's node ID, not the doc ID.
	_ = uc.storage.Delete(ctx, doc.NodeID)

	return &FileNode{
		Node:        *node,
		Doc:         *doc,
		DisplayPath: displayPath,
	}, nil
}
