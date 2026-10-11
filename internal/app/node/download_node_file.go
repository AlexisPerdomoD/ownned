package node

import (
	"context"
	"io"
	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/storage"
	"ownned/internal/domain"
)

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
	cmd storage.DownloadCmd) (*domain.Doc, io.ReadCloser, error) {
	yes, err := uc.HasNodeAccessTo(
		ctx,
		cmd.Key,
		domain.GroupReadOnlyAccess)
	if err != nil {
		return nil, nil, err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "Usr does not have access to download doc"
		return nil, nil, apperror.ErrForbidden(detail)
	}

	doc, err := uc.docs.GetByNodeID(ctx, cmd.Key)
	if err != nil {
		return nil, nil, err
	}

	if doc == nil {
		return nil, nil, apperror.ErrIlegalDBState(nil)
	}

	file, err := uc.storage.Download(ctx, cmd)
	if err != nil {
		return nil, nil, err
	}

	return doc, file, nil
}
