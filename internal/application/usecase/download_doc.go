package usecase

import (
	"context"
	"io"

	"ownned/internal/application/storage"
	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type DownloadDocUseCase struct {
	accessChecker
	nodeRepository domain.NodeRepository
	docRepository  domain.DocRepository
	storage        storage.StorageManager
}

func (uc *DownloadDocUseCase) Execute(
	ctx context.Context, docID domain.DocID,
) (*domain.Doc, io.ReadCloser, error) {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return nil, nil, err
	}

	doc, err := uc.docRepository.GetByID(ctx, docID)
	if err != nil {
		return nil, nil, err
	}

	if doc == nil {
		detail := make(map[string]string)
		detail["reason"] = "Doc was not found by the given ID=" + docID.String()
		return nil, nil, apperror.ErrNotFound(detail)
	}

	node, err := uc.nodeRepository.GetByID(ctx, doc.NodeID)
	if err != nil {
		return nil, nil, err
	}

	if node == nil {
		return nil, nil, apperror.ErrIlegalDBState(nil)
	}

	hasAccessTo, err := uc.hasNodeAccessTo(
		ctx,
		usr,
		node.Path,
		domain.GroupReadOnlyAccess)
	if err != nil {
		return nil, nil, err
	}

	if !hasAccessTo {
		detail := make(map[string]string)
		detail["reason"] = "Usr does not have access to download doc"
		return nil, nil, apperror.ErrForbidden(detail)
	}

	file, err := uc.storage.Download(ctx, doc.ID.String())
	if err != nil {
		return nil, nil, err
	}

	return doc, file, nil
}

func NewDownloadDocUseCase(
	nr domain.NodeRepository,
	dr domain.DocRepository,
	gur domain.GroupUsrRepository,
	st storage.StorageManager,
) *DownloadDocUseCase {
	helper.NotNilOrPanic(nr, "NodeRepository")
	helper.NotNilOrPanic(dr, "DocRepository")
	helper.NotNilOrPanic(gur, "GroupUseRepository")
	helper.NotNilOrPanic(st, "StorageManager")
	ac := accessChecker{gur}
	return &DownloadDocUseCase{
		accessChecker:  ac,
		nodeRepository: nr,
		docRepository:  dr,
		storage:        st,
	}
}
