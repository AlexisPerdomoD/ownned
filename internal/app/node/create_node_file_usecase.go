package node

import (
	"context"
	"io"
	"log/slog"
	"path/filepath"

	"github.com/google/uuid"
	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/app/storage"
	"ownned/internal/app/tx"
	"ownned/internal/domain"
)

type CreateDocDTO struct {
	ParentID     domain.NodeID `json:"parentID" validate:"required"`
	Filename     string        `json:"filename" validate:"required,min=1"`
	Description  string        `json:"description" validate:"max=255"`
	ExpectedSize uint64        `json:"size" validate:"required,gte=0"`
	Mimetype     string        `json:"mimetype" validate:"required,max=255"`
	File         io.ReadCloser `json:"file" validate:"required"` // TODO: revisar ciclo de vida de File como argumento
}

type CreateDocTx interface {
	tx.TxCtx
	NodeRepository() NodeRepository
	DocRepository() DocRepository
}

type CreateDocUseCase struct {
	group.AccessChecker
	docs      DocRepository
	nodes     NodeRepository
	txFactory tx.TxFactory[CreateDocTx]
	storage   storage.Storage
	logger    *slog.Logger
}

func NewCreateDocUseCase(
	docs DocRepository,
	nodes NodeRepository,
	access_checker group.AccessChecker,
	txFactory tx.TxFactory[CreateDocTx],
	storage storage.Storage,
	mainLogger *slog.Logger,
) *CreateDocUseCase {
	logger := mainLogger.With("usecase", "CreateDocUseCase")
	return &CreateDocUseCase{
		AccessChecker: access_checker,
		docs:          docs,
		nodes:         nodes,
		txFactory:     txFactory,
		storage:       storage,
		logger:        logger,
	}
}

func (uc *CreateDocUseCase) Execute(ctx context.Context, dto CreateDocDTO) (*domain.Node, *domain.Doc, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, nil, err
	}

	if !usr.Role.CanCreateNode() || !usr.Role.CanCreateDoc() {
		detail := make(map[string]string)
		detail["reason"] = "user does not have permission to create documents"
		return nil, nil, apperror.ErrForbidden(detail)
	}

	folder, err := uc.nodes.GetByID(ctx, dto.ParentID)
	if err != nil {
		return nil, nil, err
	}

	if folder == nil {
		detail := make(map[string]string)
		detail["reason"] = "Folder was not found."
		return nil, nil, apperror.ErrNotFound(detail)
	}

	if folder.Type != domain.FolderNodeType {
		detail := make(map[string]string)
		detail["reason"] = "ParentID does not point to a folder."
		return nil, nil, apperror.ErrBadRequest(detail)
	}

	yes, err := uc.HasNodeAccessToFromPath(ctx, folder.Path, domain.GroupWriteAccess)
	if err != nil {
		uc.logger.WarnContext(ctx, "failed to check if user can access node", "nodeID", folder.ID, "error", err)
		return nil, nil, err
	}
	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to specified folder to create documents"
		return nil, nil, apperror.ErrForbidden(detail)
	}

	nodeID, err := uuid.NewV7()
	if err != nil {
		return nil, nil, err
	}

	docID, err := uuid.NewV7()
	if err != nil {
		return nil, nil, err
	}

	path, err := folder.Path.NewChildPath(nodeID)
	if err != nil {
		return nil, nil, err
	}

	uploadCommand := storage.UploadCmd{
		Key:          nodeID,
		MaxSizeBytes: dto.ExpectedSize,
		File:         dto.File,
	}

	size, err := uc.storage.Put(ctx, uploadCommand)
	if err != nil {
		return nil, nil, err
	}

	ext := filepath.Ext(dto.Filename)
	title := dto.Filename[:len(dto.Filename)-len(ext)]

	node := &domain.Node{
		ID:          nodeID,
		UsrID:       usr.ID,
		Type:        domain.FileNodeType,
		Description: dto.Description,
		Name:        title,
		Path:        path,
	}
	doc := &domain.Doc{
		ID:          docID,
		NodeID:      nodeID,
		MimeType:    dto.Mimetype,
		Title:       title,
		Filename:    dto.Filename,
		Description: dto.Description,
		SizeInBytes: size,
	}

	if err := uc.persist(ctx, node, doc); err != nil {
		return nil, nil, err
	}
	return node, doc, nil
}

func (uc *CreateDocUseCase) persist(ctx context.Context, node *domain.Node, doc *domain.Doc) error {
	err := uc.txFactory.Do(ctx, func(t CreateDocTx) error {
		if err := t.NodeRepository().Create(t.Ctx(), node); err != nil {
			return err
		}

		if err := t.DocRepository().Create(t.Ctx(), doc); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		_ = uc.storage.Delete(ctx, doc.ID)
		return err
	}

	return nil
}
