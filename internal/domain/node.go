package domain

import (
	"errors"
	"strings"
	"time"
	"uuid"
)

type NodePath string

const (
	NodePathUsrRoot    NodePath = "usrs"
	NodePathSharedRoot NodePath = "shared"
)
const NodePathSeparator = "."

var ErrNodePathInvalid = errors.New("invalid node path")

func (p NodePath) NewChildPath(nodeID uuid.UUID) (NodePath, error) {
	if nodeID == uuid.Nil() {
		return NodePath(""), ErrNodePathInvalid
	}
	rawPath := string(p) + NodePathSeparator + strings.ReplaceAll(nodeID.String(), "-", "_")
	return NodePath(rawPath), nil
}

func (p NodePath) String() string {
	s := strings.ReplaceAll(string(p), "_", "-")
	return "/" + strings.ReplaceAll(s, NodePathSeparator, "/")
}

func (p NodePath) IsRoot() bool {
	return p == NodePath("usrs") || p == NodePath("shared")
}

func (p NodePath) IsParentOf(child NodePath) bool {
	return strings.HasPrefix(child.String(), p.String()+"/")
}

func (p NodePath) IsChildOf(parent NodePath) bool {
	return parent.IsParentOf(p)
}

type NodeType string

const (
	FolderNodeType NodeType = "folder"
	FileNodeType   NodeType = "file"
)

func (t NodeType) IsValid() bool {
	switch t {
	case FolderNodeType, FileNodeType:
		return true
	default:
		return false
	}
}

type NodeID = uuid.UUID

type Node struct {
	ID          NodeID
	UsrID       UsrID
	Name        string
	Description string
	Path        NodePath
	Type        NodeType
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (n *Node) Get() *Node {
	return n
}

type NodeCommentID = uuid.UUID

type NodeComment struct {
	ID        NodeCommentID
	NodeID    NodeID
	UsrID     UsrID
	Content   string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// DocID is a document version identifier in the system
type DocID = uuid.UUID

// Doc represents a document in the system asociated with a speific NodeID as position in the tree
type Doc struct {
	ID          DocID
	NodeID      NodeID
	Title       string
	Filename    string
	Description string
	MimeType    string
	SizeInBytes uint64
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
