package node

import (
	"context"
	"io"
	"log/slog"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/storage"
	"ownned/internal/app/tx"
	"ownned/internal/domain"
)

type BatchNodeTreeTx interface {
	tx.TxCtx
	NodeRepository() NodeRepository
	DocRepository() DocRepository
}

// BatchNodeTreeUseCase creates a hierarchy of nodes and uploads its files.
//
// Files are consumed sequentially through BatchNodeTreeFileIter to keep
// memory usage bounded independently of the total upload size. The use case
// must not require buffering all file contents in memory or staging them
// in temporary files.
//
// The manifest is validated before file contents are processed.
// Failures must abort the operation and trigger cleanup of resources
// and storage objects already created, where applicable.
type BatchNodeTreeUseCase struct {
	group.AccessChecker
	nodes     NodeRepository
	txFactory tx.TxFactory[BatchNodeTreeTx]
	storage   storage.Storage
	log       *slog.Logger
}

func NewBatchNodeTreeUseCase(
	access_checker group.AccessChecker,
	nodes NodeRepository,
	txFactory tx.TxFactory[BatchNodeTreeTx],
	storage storage.Storage,
	mainLogger *slog.Logger,
) *BatchNodeTreeUseCase {
	log := mainLogger.With("usecase", "BatchNodeTreeUseCase")
	return &BatchNodeTreeUseCase{
		AccessChecker: access_checker,
		nodes:         nodes,
		txFactory:     txFactory,
		storage:       storage,
		log:           log,
	}
}

type BatchNodeTreeDocDTO struct {
	RelativePath string `validate:"required"`
	Mimetype     string `validate:"required,max=255"`
	ExpectedSize uint64
}

type BatchNodeTreeFileDTO struct {
	RelativePath string        `validate:"required"`
	File         io.ReadCloser `validate:"required"`
}

// BatchNodeTreeFileIter provides sequential access to files in a batch upload.
//
// Files are consumed one at a time. Implementations must not require all file
// contents to be buffered in memory or persisted to temporary files.
//
// The caller must consume each file before requesting the next one, because
// advancing the iterator may invalidate the previous file reader.
//
// io.EOF indicates that no more files are available.
type BatchNodeTreeFileIter interface {
	Next() (BatchNodeTreeFileDTO, error)
}

// BatchNodeTreeDTO describes a batch hierarchy upload.
//
// Manifest contains the metadata for all files and must be validated before
// consuming Files. Each file yielded by Files must correspond to an entry
// in Manifest, identified by RelativePath.
type BatchNodeTreeDTO struct {
	ParentID domain.NodeID         `validate:"required"`
	Manifest []BatchNodeTreeDocDTO `validate:"required,noempty"`
	Files    BatchNodeTreeFileIter `validate:"required"`
}

func (uc *BatchNodeTreeUseCase) Execute(ctx context.Context, dto BatchNodeTreeDTO) error {
	return apperror.ErrNotImplemented(nil)
}
