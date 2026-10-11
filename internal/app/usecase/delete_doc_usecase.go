package usecase

import (
	"context"
	"fmt"
	"log/slog"

	"ownned/internal/application/dto"
	"ownned/internal/application/storage"
	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type DeleteDocUseCase struct {
	accessChecker
	storage        storage.StorageManager
	docRepository  domain.DocRepository
	nodeRepository domain.NodeRepository
	log            *slog.Logger
}

func (uc *DeleteDocUseCase) Execute(ctx context.Context, docID domain.DocID) (*dto.FileNodeDTO, error) {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return nil, err
	}

	if !usr.Role.CanDeleteDoc() {
		detail := make(map[string]string)
		detail["reason"] = "User can no do this action."
		return nil, apperror.ErrForbidden(detail)
	}

	doc, err := uc.docRepository.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}

	if doc == nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("Doc entity with ID=%s was not found", docID.String())
		return nil, apperror.ErrNotFound(detail)
	}

	node, err := uc.nodeRepository.GetByID(ctx, doc.NodeID)
	if err != nil {
		return nil, err
	}

	if node == nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("Internal state error, node with ID=%s was not found", doc.NodeID.String())
		err := apperror.ErrInternal(detail)
		uc.log.ErrorContext(ctx, "failed to get node by ID", "nodeID", doc.NodeID, "err", err)
		return nil, err
	}

	canDo, err := uc.hasNodeAccessTo(ctx, usr, node.Path, domain.GroupWriteAccess)
	if err != nil {
		uc.log.WarnContext(ctx, "failed to check if user can access node", "nodeID", doc.NodeID, "error", err)
		return nil, err
	}

	if !canDo {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User does not have access to specified node ID=%s", doc.NodeID.String())
		return nil, apperror.ErrForbidden(detail)
	}

	if err := uc.storage.Delete(ctx, doc.ID); err != nil {
		uc.log.WarnContext(ctx, "failed to delete doc from storage", "docID", docID, "err", err)
		return nil, err
	}

	if err := uc.nodeRepository.Delete(ctx, doc.NodeID); err != nil {
		return nil, err
	}

	return &dto.FileNodeDTO{Node: *node, Doc: *doc}, nil
}

func NewDeleteDocUseCase(
	s storage.StorageManager,
	dr domain.DocRepository,
	nr domain.NodeRepository,
	gur domain.GroupUsrRepository,
	mainLogger *slog.Logger,
) *DeleteDocUseCase {
	helper.NotNilOrPanic(s, "StorageManager")
	helper.NotNilOrPanic(dr, "DocRepository")
	helper.NotNilOrPanic(nr, "NodeRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	helper.NotNilOrPanic(mainLogger, "mainLogger")
	log := mainLogger.With("usecase", "DeleteDocUseCase")
	ac := accessChecker{gur}
	return &DeleteDocUseCase{ac, s, dr, nr, log}
}
