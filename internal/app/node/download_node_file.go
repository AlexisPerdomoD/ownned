package node

import (
	"context"
	"io"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/storage"
	"ownned/internal/domain"
)

type DownloadNodeFileInput struct {
	DocID  domain.DocID
	Offset uint64
	Limit  uint64
}

type DownloadNodeFileUseCase struct {
	group.AccessChecker
	nodes   NodeRepository
	docs    DocRepository
	storage storage.Storage
}

func NewDownloadDocUseCase(
	access_checker group.AccessChecker,
	nodes NodeRepository,
	docs DocRepository,
	storage storage.Storage,
) *DownloadNodeFileUseCase {
	return &DownloadNodeFileUseCase{
		AccessChecker: access_checker,
		nodes:         nodes,
		docs:          docs,
		storage:       storage,
	}
}

func (uc *DownloadNodeFileUseCase) Execute(ctx context.Context, in DownloadNodeFileInput) (*domain.Doc, io.ReadCloser, error) {
	doc, err := uc.docs.GetByID(ctx, in.DocID)
	if err != nil {
		return nil, nil, err
	}

	if doc == nil {
		detail := make(map[string]string)
		detail["reason"] = "Doc entity was not found"
		return nil, nil, apperror.ErrNotFound(detail)
	}

	yes, err := uc.HasNodeAccessTo(
		ctx,
		doc.NodeID,
		domain.GroupReadOnlyAccess)
	if err != nil {
		return nil, nil, err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "Usr does not have access to download doc"
		return nil, nil, apperror.ErrForbidden(detail)
	}

	file, err := uc.storage.Download(ctx, storage.DownloadCmd{
		Key:    doc.NodeID,
		Offset: in.Offset,
		Limit:  in.Limit,
	})
	if err != nil {
		return nil, nil, err
	}

	return doc, file, nil
}
