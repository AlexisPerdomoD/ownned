package node

import (
	"context"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type CreateNodeFolderUseCase struct {
	group.AccessChecker
	nodes NodeRepository
}

func NewCreateNodeFolderUseCase(
	ac group.AccessChecker,
	nodes NodeRepository,
) *CreateNodeFolderUseCase {
	return &CreateNodeFolderUseCase{ac, nodes}
}

type CreateNodeFolderDTO struct {
	ParentID    domain.NodeID `json:"parent_id" validate:"required"`
	Name        string        `json:"name" validate:"required,min=1,max=255,excludes=\\/"`
	Description string        `json:"description" validate:"max=255"`
}

func (uc *CreateNodeFolderUseCase) Execute(
	ctx context.Context,
	dto CreateNodeFolderDTO,
) (*FolderNode, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	if !usr.Role.CanCreateNode() {
		detail := make(map[string]string)
		detail["reason"] = "Usr can not do this action"
		return nil, apperror.ErrForbidden(detail)
	}

	parent, err := uc.nodes.GetByID(ctx, dto.ParentID)
	if err != nil {
		return nil, err
	}

	if parent == nil {
		detail := make(map[string]string)
		detail["reason"] = "parent node was not found"
		return nil, apperror.ErrNotFound(detail)
	}

	if parent.Type != domain.FolderNodeType {
		detail := make(map[string]string)
		detail["reason"] = "parent node is not a folder type"
		return nil, apperror.ErrBadRequest(detail)
	}

	yes, err := uc.HasNodeAccessToFromPath(ctx, parent.Path, domain.GroupWriteAccess)
	if err != nil {
		return nil, err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to write on specified parent node"
		return nil, apperror.ErrForbidden(detail)
	}

	folderID := uuid.NewV7()

	folder := &domain.Node{
		ID:          folderID,
		UsrID:       &usr.ID,
		Name:        dto.Name,
		Description: dto.Description,
		Type:        domain.FolderNodeType,
		Path:        parent.Path.NewChildPath(folderID),
	}

	if err := uc.nodes.Create(ctx, folder); err != nil {
		return nil, err
	}

	var displayPath string
	if path, _ := uc.nodes.GetDisplayPathByID(ctx, folder.ID); path != nil {
		displayPath = *path
	}

	return &FolderNode{
		Node:        *folder,
		DisplayPath: displayPath,
		Children:    make([]NodeLike, 0),
	}, nil
}
