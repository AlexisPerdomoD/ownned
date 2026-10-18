package node

import "ownned/internal/domain"

type NodeLike interface {
	Get() *domain.Node
	GetDisplayPath() string
}

type NodeDisplay struct {
	domain.Node
	DisplayPath string
}

func (n *NodeDisplay) GetDisplayPath() string {
	return n.DisplayPath
}

type FileNode struct {
	NodeDisplay
	Doc domain.Doc
}

type FolderNode struct {
	NodeDisplay
	Children []domain.Node
}
