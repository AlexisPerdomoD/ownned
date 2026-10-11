package node

import "ownned/internal/domain"

type FileNode struct {
	domain.Node
	Doc domain.Doc
}

func (dto *FileNode) IsFile() (isFile bool, doc *domain.Doc) {
	return dto.Type == domain.FileNodeType, &dto.Doc
}

func (dto *FileNode) IsFolder() (isFolder bool, chldr []domain.Node) {
	return false, nil
}

type FolderNode struct {
	domain.Node
	Children []domain.Node
}

func (dto *FolderNode) IsFile() (isFile bool, doc *domain.Doc) {
	return false, nil
}

func (dto *FolderNode) IsFolder() (isFolder bool, chldr []domain.Node) {
	return dto.Type == domain.FolderNodeType, dto.Children
}
