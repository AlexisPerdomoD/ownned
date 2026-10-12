package node

import (
	"context"
	"ownned/internal/domain"
	"time"
)

type NodeGroupAttach struct {
	domain.Node
	AssignDate time.Time
}

// NodeRepository is the interface for the repository of the Node entity.
type NodeRepository interface {
	// GetByID returns a node by its identifier, if no node is found it returns nil, nil.
	GetByID(ctx context.Context, id domain.NodeID) (*domain.Node, error)

	// GetChildren returns the children of a node based on its path, only immediate children are returned.
	GetChildren(ctx context.Context, path domain.NodePath) ([]domain.Node, error)

	// GetRoot returns the root nodes of the system.
	GetRoot(ctx context.Context) ([]domain.Node, error)

	// GetRootByGroups returns the root nodes of the system based on the provided groups.
	GetRootByGroups(ctx context.Context, groups []domain.GroupID) ([]domain.Node, error)

	// GetByGroupID returns the nodes attached to a group based on the provided groupID.
	GetByGroupID(ctx context.Context, groupID domain.GroupID) ([]domain.Node, error)

	// Create a new node in the system. Returns an error if nil data is provided.
	Create(ctx context.Context, n *domain.Node) error

	// Update a node in the system. Returns an error if nil data is provided or if the node does not exist.
	Update(ctx context.Context, n *domain.Node) error

	// Delete a node in the system by its identifier if it exists an all its children.
	Delete(ctx context.Context, id domain.NodeID) error
}

// NodeCommentRepository is the interface for the repository of the NodeComment entity.
type NodeCommentRepository interface {
	// GetByNodeID returns all comments attached to a node OrderBy createdAt DESC.
	GetByNodeID(ctx context.Context, nodeID domain.NodeID) ([]domain.NodeComment, error)

	// GetByID returns a comment by its identifier, if no comment is found it returns nil, nil.
	GetByID(ctx context.Context, id domain.NodeCommentID) (*domain.NodeComment, error)

	// Create a new comment in the system. Returns an error if nil data is provided.
	Create(ctx context.Context, c *domain.NodeComment) error

	// Update a comment in the system. Returns an error if nil data is provided or if the comment does not exist.
	Update(ctx context.Context, c *domain.NodeComment) error

	// Delete a comment in the system by its identifier if it exists.
	Delete(ctx context.Context, id domain.NodeCommentID) error
}

type DocRepository interface {
	GetByID(ctx context.Context, id domain.DocID) (*domain.Doc, error)

	GetByNodeID(ctx context.Context, id domain.NodeID) (*domain.Doc, error)

	GetAllFromPath(ctx context.Context, path domain.NodePath) ([]domain.Doc, error)

	Create(ctx context.Context, d *domain.Doc) error

	Update(ctx context.Context, d *domain.Doc) error
}
