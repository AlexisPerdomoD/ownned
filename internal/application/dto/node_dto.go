package dto

import "ownned/internal/domain"

type FileNodeDTO struct {
	domain.Node
	Doc domain.Doc
}

func (dto *FileNodeDTO) IsFile() (isFile bool, doc *domain.Doc) {
	return dto.Type == domain.FileNodeType, &dto.Doc
}

func (dto *FileNodeDTO) IsFolder() (isFolder bool, chldr []domain.Node) {
	return false, nil
}

type FolderNodeDTO struct {
	domain.Node
	Children []domain.Node
}

func (dto *FolderNodeDTO) IsFile() (isFile bool, doc *domain.Doc) {
	return false, nil
}

func (dto *FolderNodeDTO) IsFolder() (isFolder bool, chldr []domain.Node) {
	return dto.Type == domain.FolderNodeType, dto.Children
}

type CreateFolderDTO struct {
	ParentID    string `json:"parent_id" validate:"required,uuid"`
	Name        string `json:"name" validate:"required,min=1,max=255,excludes=\\/"`
	Description string `json:"description" validate:"max=255"`
}

func (dto *CreateFolderDTO) Validate() error {
	return Validator.Struct(dto)
}

type CreateNodeCommentDTO struct {
	Content string `json:"content" validate:"required,min=1,max=10000"`
}

func (dto *CreateNodeCommentDTO) Validate() error {
	return Validator.Struct(dto)
}

type UpdateNodeCommentDTO = CreateNodeCommentDTO
