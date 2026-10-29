package node

import (
	"cmp"
	"context"
	"io"
	"log/slog"
	"path/filepath"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/app/storage"
	"ownned/internal/app/tx"
	"ownned/internal/domain"
)

type CreateNodeFileTx interface {
	tx.TxCtx
	NodeRepository() NodeRepository
	DocRepository() DocRepository
}

type CreateNodeFileUseCase struct {
	group.AccessChecker
	docs      DocRepository
	nodes     NodeRepository
	txFactory tx.TxFactory[CreateNodeFileTx]
	storage   storage.Storage
	log       *slog.Logger
}

func NewCreateDocUseCase(
	docs DocRepository,
	nodes NodeRepository,
	access_checker group.AccessChecker,
	txFactory tx.TxFactory[CreateNodeFileTx],
	storage storage.Storage,
	mainLogger *slog.Logger,
) *CreateNodeFileUseCase {
	logger := mainLogger.With("usecase", "CreateNodeFileUseCase")
	return &CreateNodeFileUseCase{
		AccessChecker: access_checker,
		docs:          docs,
		nodes:         nodes,
		txFactory:     txFactory,
		storage:       storage,
		log:           logger,
	}
}

type CreateNodeFileDTO struct {
	ParentID     domain.NodeID `validate:"required"`
	Filename     string        `validate:"required,min=1"`
	Description  string        `validate:"max=255"`
	ExpectedSize uint64
	Mimetype     string        `validate:"required,max=255"`
	File         io.ReadCloser `validate:"required"`
}

func (uc *CreateNodeFileUseCase) persist(ctx context.Context, node *domain.Node, doc *domain.Doc) error {
	err := uc.txFactory.Do(ctx, func(t CreateNodeFileTx) error {
		if err := t.NodeRepository().Create(t.Ctx(), node); err != nil {
			return err
		}

		if err := t.DocRepository().Create(t.Ctx(), doc); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		_ = uc.storage.Delete(ctx, node.ID)
		return err
	}

	return nil
}

func (uc *CreateNodeFileUseCase) Execute(ctx context.Context, dto CreateNodeFileDTO) (*FileNode, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	if !usr.Role.CanCreateNode() || !usr.Role.CanCreateDoc() {
		detail := make(map[string]string)
		detail["reason"] = "user does not have permission to create documents"
		return nil, apperror.ErrForbidden(detail)
	}

	folder, err := uc.nodes.GetByID(ctx, dto.ParentID)
	if err != nil {
		return nil, err
	}

	if folder == nil {
		detail := make(map[string]string)
		detail["reason"] = "Folder was not found."
		return nil, apperror.ErrNotFound(detail)
	}

	if folder.Type != domain.FolderNodeType {
		detail := make(map[string]string)
		detail["reason"] = "ParentID does not point to a folder."
		return nil, apperror.ErrBadRequest(detail)
	}

	yes, err := uc.HasNodeAccessToFromPath(ctx, folder.Path, domain.GroupWriteAccess)
	if err != nil {
		uc.log.WarnContext(ctx, "failed to check if user can access node", "nodeID", folder.ID, "error", err)
		return nil, err
	}
	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to specified folder to create documents"
		return nil, apperror.ErrForbidden(detail)
	}

	docID := uuid.NewV7()

	nodeID := uuid.NewV7()
	path := folder.Path.NewChildPath(nodeID)

	uploadCommand := storage.UploadCmd{
		Key:          nodeID,
		MaxSizeBytes: dto.ExpectedSize,
		File:         dto.File,
	}

	size, err := uc.storage.Put(ctx, uploadCommand)
	if err != nil {
		return nil, err
	}

	ext := filepath.Ext(dto.Filename)
	title := dto.Filename[:len(dto.Filename)-len(ext)]

	node := &domain.Node{
		ID:          nodeID,
		UsrID:       &usr.ID,
		Type:        domain.FileNodeType,
		Description: dto.Description,
		Name:        dto.Filename,
		Path:        path,
	}
	doc := &domain.Doc{
		ID:          docID,
		NodeID:      nodeID,
		MimeType:    dto.Mimetype,
		Title:       cmp.Or(title, dto.Filename),
		Filename:    dto.Filename,
		Description: dto.Description,
		SizeInBytes: size,
	}

	if err := uc.persist(ctx, node, doc); err != nil {
		return nil, err
	}
	var displayPath string
	if path, _ := uc.nodes.GetDisplayPathByID(ctx, node.ID); path != nil {
		displayPath = *path
	}

	return &FileNode{
		Node:        *node,
		Doc:         *doc,
		DisplayPath: displayPath,
	}, nil
}
