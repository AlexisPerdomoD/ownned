package node

import (
	"cmp"
	"context"
	"fmt"
	"io"
	"log/slog"
	"path/filepath"
	"strings"
	"uuid"

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
	RelativePath      string `validate:"required"`
	Mimetype          string `validate:"required,max=255"`
	ExpectedSizeBytes uint64
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
	yes, err := uc.HasNodeAccessTo(ctx, dto.ParentID, domain.GroupWriteAccess)
	if err != nil {
		return err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have required access to specified node"
		return apperror.ErrForbidden(detail)
	}

	parent, err := uc.nodes.GetByID(ctx, dto.ParentID)
	if err != nil {
		return err
	}

	if parent == nil {
		uc.log.WarnContext(ctx,
			"failed to get node when expected after access check",
			"nodeID", dto.ParentID)
		return apperror.ErrIlegalDBState(nil)
	}

	if parent.Type != domain.FolderNodeType {
		detail := make(map[string]string)
		detail["reason"] = "Parent Node is not a folder"
		return apperror.ErrBadRequest(detail)
	}

	manifestMap := make(map[string]*BatchNodeTreeDocDTO)
	tree := make(map[int][]domain.Node)
	docs := make([]domain.Doc, len(dto.Manifest))

	for i := range dto.Manifest {
		curr := dto.Manifest[i]

		if _, duplicated := manifestMap[curr.RelativePath]; duplicated {
			detail := make(map[string]string)
			detail["reason"] = fmt.Sprintf(
				"Element Path '%s' is found on manifest more than once. Every element must have unique relative path.",
				curr.RelativePath,
			)

			return apperror.ErrBadRequest(detail)
		}

		manifestMap[curr.RelativePath] = &curr

		rPaths := strings.Split(curr.RelativePath, "/")
		currParentPath := parent.Path
		for j := range rPaths {
			isLast := j == len(rPaths)-1
			nodeID := uuid.NewV7()
			path := currParentPath.NewChildPath(nodeID)
			name := rPaths[j]

			n := domain.Node{
				ID:   nodeID,
				Name: name,
				Path: path,
				Type: domain.FolderNodeType,
			}

			if isLast {
				n.Type = domain.FileNodeType
				ext := filepath.Ext(name)
				title := cmp.Or(name[:len(name)-len(ext)], name)

				docs[i] = domain.Doc{
					ID:          uuid.NewV7(),
					NodeID:      nodeID,
					Title:       title,
					Filename:    name,
					MimeType:    curr.Mimetype,
					SizeInBytes: curr.ExpectedSizeBytes,
				}

			} else {
				currParentPath = path
			}

			if tree[i] == nil {
				tree[i] = make([]domain.Node, 0, 1)
			}

			tree[i] = append(tree[i], n)
		}

	}

	return apperror.ErrNotImplemented(nil)
}
