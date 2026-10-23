package node

import (
	"context"
	"io"
	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/storage"
	"ownned/internal/domain"
)

// DownloadNodeFileInput identifies the document requested by download
// (`GET /api/v1/nodes/docs/{docID}/download`) and the optional HTTP Range
// window resolved by the handler.
//
// Size rules: the storage object key is the file node's ID, never the doc ID
// (see `create_node_file.go`); this use case resolves docID -> node so callers
// can keep using the public doc identifier.
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

func (uc *DownloadNodeFileUseCase) Execute(
	ctx context.Context,
	in DownloadNodeFileInput) (*domain.Doc, io.ReadCloser, error) {
	doc, err := uc.docs.GetByID(ctx, in.DocID)
	if err != nil {
		return nil, nil, err
	}

	if doc == nil {
		detail := make(map[string]string)
		detail["reason"] = "Doc entity was not found"
		return nil, nil, apperror.ErrNotFound(detail)
	}

	// NOTE: the storage object is keyed by the doc's node ID, so the access
	// check and the download must both target that node, not the doc ID.
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
