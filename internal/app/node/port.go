package node

import "ownned/internal/domain"

type NodeLike interface {
	Get() *domain.Node

	GetDisplayPath() string

	GetAccess() *domain.GroupUsrAccess
}

type NodeDisplay struct {
	domain.Node
	DisplayPath string
	access      *domain.GroupUsrAccess
}

func (n *NodeDisplay) GetDisplayPath() string {
	return n.DisplayPath
}

func (n *NodeDisplay) GetAccess() *domain.GroupUsrAccess {
	return n.access
}

type FileNode struct {
	NodeDisplay
	Doc domain.Doc
}

type FolderNode struct {
	NodeDisplay
	Children []NodeLike
}
