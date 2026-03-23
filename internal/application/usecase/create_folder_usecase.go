package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"ownned/internal/application/dto"
	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type CreateFolderUseCase struct {
	accessChecker
	nodeRepository domain.NodeRepository
}

func (uc *CreateFolderUseCase) Execute(ctx context.Context, args *dto.CreateFolderDTO) (*domain.Node, error) {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return nil, err
	}

	if !usr.Role.CanCreateNode() {
		detail := make(map[string]string)
		detail["reason"] = "Usr can not do this action"
		return nil, apperror.ErrForbidden(detail)
	}

	parentID, err := uuid.Parse(args.ParentID)
	if err != nil {
		return nil, err
	}

	parent, err := uc.nodeRepository.GetByID(ctx, parentID)
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

	canDo, err := uc.hasNodeAccessTo(ctx, usr, parent.Path, domain.GroupWriteAccess)
	if err != nil {
		return nil, err
	}

	if !canDo {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User does not have access to specified node ID=%s", parent.ID.String())
		return nil, apperror.ErrForbidden(detail)
	}

	folderID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	path, err := parent.Path.NewChildPath(folderID)
	if err != nil {
		return nil, err
	}

	folder := &domain.Node{
		ID:          folderID,
		UsrID:       usr.ID,
		Name:        args.Name,
		Description: args.Description,
		Type:        domain.FolderNodeType,
		Path:        path,
	}

	if err := uc.nodeRepository.Create(ctx, folder); err != nil {
		return nil, err
	}

	return folder, nil
}

func NewCreateFolderUseCase(
	nr domain.NodeRepository,
	gur domain.GroupUsrRepository,
) *CreateFolderUseCase {
	helper.NotNilOrPanic(nr, "NodeRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	ac := accessChecker{gur}
	return &CreateFolderUseCase{ac, nr}
}
