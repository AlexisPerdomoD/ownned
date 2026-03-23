package domain

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type NodePath string

const (
	NodePathUsrRoot    NodePath = "usrs"
	NodePathSharedRoot NodePath = "shared"
)
const NodePathSeparator = "."

var ErrNodePathInvalid = errors.New("invalid node path")

func (p NodePath) NewChildPath(nodeID uuid.UUID) (NodePath, error) {
	if nodeID == uuid.Nil {
		return NodePath(""), ErrNodePathInvalid
	}

	return NodePath(string(p) + NodePathSeparator + strings.ReplaceAll(nodeID.String(), "-", "_")), nil
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

type NodeLike interface {
	GetNode() *Node

	IsFile() (isFile bool, doc *Doc)

	IsFolder() (isFolder bool, chldr []Node)
}

type (
	NodeID = uuid.UUID
	Node   struct {
		ID          NodeID
		UsrID       UsrID
		Name        string
		Description string
		Path        NodePath
		Type        NodeType
		CreatedAt   time.Time
		UpdatedAt   time.Time
	}
)

func (n *Node) GetNode() *Node {
	return n
}

type (
	NodeCommentID = uuid.UUID
	NodeComment   struct {
		ID        NodeCommentID
		NodeID    NodeID
		UsrID     UsrID
		Content   string
		CreatedAt time.Time
		UpdatedAt time.Time
	}
)

type NodeGroupAttach struct {
	Node
	AssignDate time.Time
}

// NodeRepository is the interface for the repository of the Node entity.
type NodeRepository interface {
	// GetByID returns a node by its identifier, if no node is found it returns nil, nil.
	GetByID(ctx context.Context, id NodeID) (*Node, error)

	// GetChildren returns the children of a node based on its path, only immediate children are returned.
	GetChildren(ctx context.Context, path NodePath) ([]Node, error)

	// GetRoot returns the root nodes of the system.
	GetRoot(ctx context.Context) ([]Node, error)

	// GetRootByGroups returns the root nodes of the system based on the provided groups.
	GetRootByGroups(ctx context.Context, groups []GroupID) ([]Node, error)

	// GetByGroup returns the nodes attached to a group based on the provided groupID.
	GetByGroup(ctx context.Context, groupID GroupID) ([]NodeGroupAttach, error)

	// Create a new node in the system. Returns an error if nil data is provided.
	Create(ctx context.Context, n *Node) error

	// Update a node in the system. Returns an error if nil data is provided or if the node does not exist.
	Update(ctx context.Context, n *Node) error

	// Delete a node in the system by its identifier if it exists an all its children.
	Delete(ctx context.Context, id NodeID) error
}

// NodeCommentRepository is the interface for the repository of the NodeComment entity.
type NodeCommentRepository interface {
	// GetByNode returns all comments attached to a node OrderBy createdAt DESC.
	GetByNode(ctx context.Context, nodeID NodeID) ([]NodeComment, error)

	// GetByID returns a comment by its identifier, if no comment is found it returns nil, nil.
	GetByID(ctx context.Context, id NodeCommentID) (*NodeComment, error)

	// Create a new comment in the system. Returns an error if nil data is provided.
	Create(ctx context.Context, c *NodeComment) error

	// Update a comment in the system. Returns an error if nil data is provided or if the comment does not exist.
	Update(ctx context.Context, c *NodeComment) error

	// Delete a comment in the system by its identifier if it exists.
	Delete(ctx context.Context, id NodeCommentID) error
}
