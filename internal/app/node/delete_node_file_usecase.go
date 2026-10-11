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
	docID domain.DocID) (*domain.Node, *domain.Doc, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, nil, err
	}

	if !usr.Role.CanDeleteDoc() {
		detail := make(map[string]string)
		detail["reason"] = "User can no do this action."
		return nil, nil, apperror.ErrForbidden(detail)
	}

	doc, err := uc.docs.GetByID(ctx, docID)
	if err != nil {
		return nil, nil, err
	}

	if doc == nil {
		detail := make(map[string]string)
		detail["reason"] = "Doc entity was not found"
		return nil, nil, apperror.ErrNotFound(detail)
	}

	node, err := uc.nodes.GetByID(ctx, doc.NodeID)
	if err != nil {
		return nil, nil, err
	}

	yes, err := uc.HasNodeAccessToFromPath(ctx, node.Path, domain.GroupWriteAccess)
	if err != nil {
		uc.log.WarnContext(ctx, "failed to check if user can access node", "nodeID", doc.NodeID, "error", err)
		return nil, nil, err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to specified node"
		return nil, nil, apperror.ErrForbidden(detail)
	}

	if err := uc.nodes.Delete(ctx, doc.NodeID); err != nil {
		return nil, nil, err
	}

	_ = uc.storage.Delete(ctx, doc.ID)

	return node, doc, nil
}
