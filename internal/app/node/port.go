package node

import "ownned/internal/domain"

type NodeLike interface {
	Get() *domain.Node

	File() (isFile bool, doc *domain.Doc)

	Folder() (isFolder bool, children []domain.Node)
}

type FileNode struct {
	domain.Node
	Doc domain.Doc
}

func (n *FileNode) File() (bool, *domain.Doc) {
	return n.Type == domain.FileNodeType, &n.Doc
}

func (n *FileNode) Folder() (bool, []domain.Node) {
	return false, nil
}

type FolderNode struct {
	domain.Node
	Children []domain.Node
}

func (n *FolderNode) File() (bool, *domain.Doc) {
	return false, nil
}

func (n *FolderNode) Folder() (bool, []domain.Node) {
	return n.Type == domain.FolderNodeType, n.Children
}
