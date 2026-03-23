package usecase

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"ownned/internal/application/storage"
	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/concurrent"
	"ownned/pkg/helper"
)

type DeleteNodeUseCase struct {
	accessChecker
	nodeRepository domain.NodeRepository
	docRepository  domain.DocRepository
	storage        storage.StorageManager
	log            *slog.Logger
}

func (uc *DeleteNodeUseCase) Execute(ctx context.Context, nodeID domain.NodeID) error {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return err
	}

	if usr.Role != domain.LimitedUsrRole {
		return apperror.ErrForbidden(map[string]string{"error": "usr does not have access to do this action"})
	}

	node, err := uc.nodeRepository.GetByID(ctx, nodeID)
	if err != nil {
		return err
	}

	if node == nil {
		return apperror.ErrNotFound(map[string]string{"error": "node was not found by id=" + nodeID.String()})
	}

	canDo, err := uc.hasNodeAccessTo(ctx, usr, node.Path, domain.GroupWriteAccess)
	if err != nil {
		uc.log.WarnContext(ctx, "failed to check if user can access node", "nodeID", nodeID, "error", err)
		return err
	}

	if !canDo {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User does not have access to specified node ID=%s", nodeID.String())
		return apperror.ErrForbidden(detail)
	}

	docs, err := uc.docRepository.GetAllFromPath(ctx, node.Path)
	if err != nil {
		return err
	}

	// IS EXPECTED TO NODE DELETIONS TO DELETE EVERY CHILDREN AND ALSO DOCS ASSOCIATE ON CASCADE
	if err := uc.nodeRepository.Delete(ctx, node.ID); err != nil {
		return err
	}

	if len(docs) > 0 {
		// IS EXPECTED TO DELETE DOCS STATICS ON BACKGROUND ASYNC
		go uc.deleteDocsAsync(docs)
	}

	return nil
}

func (uc *DeleteNodeUseCase) deleteDocsAsync(docs []domain.Doc) {
	logger := uc.log.With("scope", "deleteDocsAsync")
	storage := uc.storage
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	defer func() {
		if r := recover(); r != nil {
			logger.Error("panic at deleteDocsAsync", "recover", r)
		}
	}()

	deletions := concurrent.MapConcurrent(
		docs,
		func(doc domain.Doc) (*domain.Doc, error) { return &doc, storage.Delete(ctx, doc.ID.String()) },
		20,
	)

	for _, deletion := range deletions {
		if deletion.IsOk() {
			continue
		}

		logger.Warn("failed to delete doc from storage",
			"docID", deletion.Value.ID,
			"docTitle", deletion.Value.Title,
			"nodeID", deletion.Value.NodeID,
			"err", deletion.Error,
		)
	}
}

func NewDeleteNodeUseCase(
	nr domain.NodeRepository,
	dr domain.DocRepository,
	gur domain.GroupUsrRepository,
	storage storage.StorageManager,
	mainLogger *slog.Logger,
) *DeleteNodeUseCase {
	helper.NotNilOrPanic(nr, "NodeRepository")
	helper.NotNilOrPanic(dr, "DocRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	helper.NotNilOrPanic(storage, "StorageManager")
	helper.NotNilOrPanic(mainLogger, "mainLogger")
	ac := accessChecker{gur}
	logger := mainLogger.With("usecase", "DeleteNodeUseCase")

	return &DeleteNodeUseCase{ac, nr, dr, storage, logger}
}
