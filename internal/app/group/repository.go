package group

import (
	"context"

	"ownned/internal/app/pagination"
	"ownned/internal/domain"
)

type GroupPaginateParam struct {
	UsrID *domain.UsrID
	pagination.PaginationParam
}

// GroupRepository is the interface to interact with the group repository
type GroupRepository interface {
	// GetRoot returns the root group of the system. If no root group exists returns ErrIlegalDBState
	GetRoot(ctx context.Context) (*domain.Group, error)
	// GetByID returns a group by its identifier
	GetByID(ctx context.Context, id domain.GroupID) (*domain.Group, error)
	// GetByIDs returns groups by its identifiers
	GetByIDs(ctx context.Context, ids []domain.GroupID) (map[domain.GroupID]*domain.Group, error)
	// GetByUsr returns a list of groups where user is the owner
	GetByUsrID(ctx context.Context, usrID domain.UsrID) ([]domain.Group, error)
	// GetByUsrAssigned returns a list of groups attached to a user and their access
	GetByUsrAssignedID(ctx context.Context, usrID domain.UsrID) ([]domain.Group, error)
	// Paginate returns a list of groups with pagination based on the provided pagination param
	Paginate(ctx context.Context, param GroupPaginateParam) (*pagination.PaginationResult[domain.Group], error)
	// Create a new group in the system
	// Returns an error if nil data is provided
	Create(ctx context.Context, d *domain.Group) error
	// Update a group in the system
	// Returns an error if nil data is provided
	Update(ctx context.Context, d *domain.Group) error
	// Delete a group in the system by its identifier if it exists
	Delete(ctx context.Context, id domain.GroupID) error
}

// GroupUsrRepository is the interface to interact with usr - group relations
type GroupUsrRepository interface {
	// GetGroupAccess returns the access of a user to a Group based on usrs group access, if no access is found it returns nil , ErrNoAccess
	GetGroupAccess(ctx context.Context, usrID domain.UsrID, groupID domain.GroupID) (domain.GroupUsrAccess, error)
	// HasNodeAccessFromPath validate the access to specific node based on group usr assigment, if no access is found it returns ErrNoAccess
	HasAccessFromPath(ctx context.Context, usrID domain.UsrID, path domain.NodePath, access domain.GroupUsrAccess) error
	// HasNodeAccessvalidate the access to specific node based on group usr assigment, if no access is found it returns ErrNoAccess
	HasAccess(ctx context.Context, usrID domain.UsrID, nodeID domain.NodeID, access domain.GroupUsrAccess) error
	// GetByUsr returns groups where user is a member
	GetByUsr(ctx context.Context, usrID domain.UsrID) ([]domain.GroupUsr, error)
	// Upsert access to a groups for a users
	// Returns an error if nil data is provided
	Upsert(ctx context.Context, d *domain.GroupUsr) error
	// Upsert access to a groups for a users
	// Returns an error if nil data is provided
	UpsertAll(ctx context.Context, d []domain.GroupUsr) error
	// Delete removes a user from a group if it exists on it
	Delete(ctx context.Context, g domain.GroupID, u domain.UsrID) error
}

// GroupNodeRepository is the interface to interact with node - group relations
type GroupNodeRepository interface {
	// GetByNode returns a list of groups attached to a node and their access
	GetByNode(ctx context.Context, nodeID domain.NodeID) ([]domain.GroupNode, error)
	// Upsert attach a node to a group, does nothing if node is already attached
	// Returns an error if nil data is provided
	Upsert(ctx context.Context, d *domain.GroupNode) error
	// Upsert attach to nodes to groups
	// Returns an error if nil data is provide
	UpsertAll(ctx context.Context, d []domain.GroupNode) error
	// Delete removes a node from a group if it exist on it
	Delete(ctx context.Context, g domain.GroupID, n domain.NodeID) error
}
