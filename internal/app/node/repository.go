package node

import (
	"context"

	"ownned/internal/app/pagination"
	"ownned/internal/domain"
)

type PaginateNode struct {
	pagination.PaginationParam
	Type     *domain.NodeType `json:"node_type"`
	GroupIDs []domain.GroupID `json:"group_ids"`
	RootID   *domain.NodeID   `json:"root_id"`
}

// NodeRepository is the interface for the repository of the Node entity.
type NodeRepository interface {
	// GetByID returns a node by its identifier, if no node is found it returns nil, nil.
	GetByID(ctx context.Context, id domain.NodeID) (*domain.Node, error)

	// GetChildren returns the children of a node based on its path, only immediate children are returned.
	GetChildren(ctx context.Context, path domain.NodePath) ([]domain.Node, error)

	// GetRoot returns the root nodes of the system.
	GetRoot(ctx context.Context) ([]domain.Node, error)

	// GetRootByGroupIDs returns the root nodes of the system based on the provided groups.
	GetRootByGroupIDs(ctx context.Context, groups []domain.GroupID) ([]domain.Node, error)

	// GetByGroupID returns the nodes attached to a group based on the provided groupID.
	GetByGroupID(ctx context.Context, groupID domain.GroupID) ([]domain.Node, error)

	// Paginate returns a paginated list of nodes based on the provided pagination parameters.
	Paginate(ctx context.Context, p PaginateNode) (*pagination.PaginationResult[domain.Node], error)

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

type PaginateDoc struct {
	pagination.PaginationParam
	MimeType *string          `json:"mime_type"`
	MinSize  *uint64          `json:"min_size"`
	MaxSize  *uint64          `json:"max_size"`
	GroupIDs []domain.GroupID `json:"group_ids"`
	RootID   *domain.NodeID   `json:"root_id"`
}

// DocRepository is the interface for the repository of the Doc entity.
type DocRepository interface {
	// GetByID returns a document by its identifier, if no document is found it returns nil, nil.
	GetByID(ctx context.Context, id domain.DocID) (*domain.Doc, error)

	// GetByNodeID returns a document by its node identifier, if no document is found it returns nil, nil.
	GetByNodeID(ctx context.Context, id domain.NodeID) (*domain.Doc, error)

	// GetAllFromPath returns all documents attached to a node based on the provided path including the node itself.
	GetAllFromPath(ctx context.Context, path domain.NodePath) ([]domain.Doc, error)

	// Paginate returns a paginated list of documents based on the provided pagination parameters.
	Paginate(ctx context.Context, p PaginateDoc) (*pagination.PaginationResult[domain.Doc], error)

	// Create a new document in the system. Returns an error if nil data is provided.
	Create(ctx context.Context, d *domain.Doc) error

	// Update a document in the system. Returns an error if nil data is provided or if the document does not exist.
	Update(ctx context.Context, d *domain.Doc) error
}
