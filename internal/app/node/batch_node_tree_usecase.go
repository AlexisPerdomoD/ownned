package node

import (
	"cmp"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"path/filepath"
	"strings"
	"sync"
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

type BatchNodeTreeCfg struct {
	BackgroundCleanup              bool
	BackgroundCleanupParallelCount int
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
	cfg       BatchNodeTreeCfg
}

func NewBatchNodeTreeUseCase(
	access_checker group.AccessChecker,
	nodes NodeRepository,
	txFactory tx.TxFactory[BatchNodeTreeTx],
	storage storage.Storage,
	mainLogger *slog.Logger,
	cfg BatchNodeTreeCfg,
) *BatchNodeTreeUseCase {
	log := mainLogger.With("usecase", "BatchNodeTreeUseCase")
	return &BatchNodeTreeUseCase{
		AccessChecker: access_checker,
		nodes:         nodes,
		txFactory:     txFactory,
		storage:       storage,
		log:           log,
		cfg:           cfg,
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

func (uc *BatchNodeTreeUseCase) processCleanStorage(keys []uuid.UUID) {
	cb := func() {
		workers := max(min(uc.cfg.BackgroundCleanupParallelCount, len(keys)), 1)
		jobs := make(chan uuid.UUID)
		wg := sync.WaitGroup{}
		ctx := context.Background()

		for range workers {
			wg.Go(func() {
				for key := range jobs {
					if err := uc.storage.Delete(ctx, key); err != nil {
						uc.log.ErrorContext(ctx, "Some error happend while deleting file",
							"err",
							err)
					}
				}
			})
		}

		for i := range keys {
			jobs <- keys[i]
		}

		close(jobs)
		wg.Wait()
	}

	if !uc.cfg.BackgroundCleanup {
		cb()
		return
	}

	go cb()
}

func (uc *BatchNodeTreeUseCase) processManifest(p *domain.Node, man []BatchNodeTreeDocDTO) (map[string]*domain.Doc, map[string]bool, []domain.Node, error) {
	docs := make(map[string]*domain.Doc)
	nodes := make([]domain.Node, 0, len(man))
	resolved := make(map[string]bool)

	for i := range man {
		curr := man[i]

		if _, duplicated := docs[curr.RelativePath]; duplicated {
			detail := make(map[string]string)
			detail["reason"] = fmt.Sprintf(
				"Element Path '%s' is found on manifest more than once. Every element must have unique relative path.",
				curr.RelativePath,
			)

			return nil, nil, nil, apperror.ErrBadRequest(detail)
		}

		rPaths := strings.Split(curr.RelativePath, "/")
		currParentPath := p.Path
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

				docs[curr.RelativePath] = &domain.Doc{
					ID:          uuid.NewV7(),
					NodeID:      nodeID,
					Title:       title,
					Filename:    name,
					MimeType:    curr.Mimetype,
					SizeInBytes: curr.ExpectedSizeBytes,
				}

				resolved[curr.RelativePath] = false

			} else {
				currParentPath = path
			}

			nodes = append(nodes, n)
		}

	}

	return docs, resolved, nodes, nil
}

func (uc *BatchNodeTreeUseCase) processUpload(
	ctx context.Context,
	files BatchNodeTreeFileIter,
	docMap map[string]*domain.Doc,
	resolvedMap map[string]bool,
) error {
	for {
		f, err := files.Next()
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}

			return err
		}

		doc, ok := docMap[f.RelativePath]
		if !ok {
			detail := map[string]string{"reason": fmt.Sprintf("file with define path '%s' is not present on manifest.", f.RelativePath)}
			err := apperror.ErrBadRequest(detail)
			return err
		}

		if _, err = uc.storage.Put(ctx, storage.UploadCmd{
			Key:          doc.NodeID,
			MaxSizeBytes: doc.SizeInBytes,
			File:         f.File,
		}); err != nil {
			return err
		}

		resolvedMap[f.RelativePath] = true
	}

	for k, done := range resolvedMap {
		if !done {
			detail := map[string]string{"reason": fmt.Sprintf("Path '%s' on manifest was not resolved", k)}
			return apperror.ErrBadRequest(detail)
		}
	}

	return nil
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

	docMap, resolvedMap, nodes, err := uc.processManifest(parent, dto.Manifest)
	if err != nil {
		return err
	}

	if err := uc.processUpload(ctx, dto.Files, docMap, resolvedMap); err != nil {

		// preallocate more capacity here is better than reallocating slice from resize in this case
		keys := make([]uuid.UUID, 0, len(docMap))

		for path, doc := range docMap {
			if resolvedMap[path] {
				keys = append(keys, doc.NodeID)
			}
		}

		uc.processCleanStorage(keys)
		return err
	}

	if err := uc.txFactory.Do(ctx, func(db BatchNodeTreeTx) error {
		if err := db.NodeRepository().CreateAll(ctx, nodes); err != nil {
			return err
		}

		docs := make([]domain.Doc, 0, len(docMap))
		for _, doc := range docMap {
			docs = append(docs, *doc)
		}

		if err := db.DocRepository().CreateAll(ctx, docs); err != nil {
			return err
		}

		return nil
	}); err != nil {

		keys := make([]uuid.UUID, 0, len(docMap))
		for _, doc := range docMap {
			keys = append(keys, doc.NodeID)
		}

		uc.processCleanStorage(keys)
		return err
	}

	return nil
}
