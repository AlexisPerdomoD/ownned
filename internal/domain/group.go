package domain

import (
	"context"
	"errors"
	"time"

	"ownned/pkg/pagination"

	"github.com/google/uuid"
)

// GroupID is a group identifier in the system
type GroupID = uuid.UUID

// Group represents a identifier to be tag to a Folder or file in the system and be associated with a user(s)
type Group struct {
	ID          GroupID
	UsrID       UsrID
	Name        string
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type GroupUsrAccess string

const (
	GroupReadOnlyAccess GroupUsrAccess = "read_only_access"
	GroupWriteAccess    GroupUsrAccess = "write_access"
	GroupOwnerAccess    GroupUsrAccess = "owner_access"
)

var GroupAccessRank = map[GroupUsrAccess]int{
	GroupReadOnlyAccess: 1,
	GroupWriteAccess:    2,
	GroupOwnerAccess:    3,
}

func (a GroupUsrAccess) String() string {
	switch a {
	case GroupReadOnlyAccess:
		return "Read Only Access"
	case GroupWriteAccess:
		return "Modify Access"
	case GroupOwnerAccess:
		return "Owner Access"
	default:
		return "Unknown Access"
	}
}

func (a GroupUsrAccess) IsEquivalent(b GroupUsrAccess) bool {
	return GroupAccessRank[a] >= GroupAccessRank[b]
}

func (a GroupUsrAccess) IsValidAccessToRole(r UsrRole) (can bool, reason string) {
	switch r {
	case SuperUsrRole:
		return false, "Super users can not be assigned to groups."
	case NormalUsrRole:
		return true, ""
	case LimitedUsrRole:
		if a == GroupReadOnlyAccess {
			return true, ""
		}

		return false, "Limited users can only be assigned to read only access."
	default:
		return false, "No role identified."
	}
}

func (a GroupUsrAccess) IsValid() bool {
	return a == GroupReadOnlyAccess || a == GroupWriteAccess || a == GroupOwnerAccess
}

var ErrNoAccess = errors.New("no access")

type GroupUsr struct {
	GroupID    GroupID
	UsrID      UsrID
	Access     GroupUsrAccess
	AssignDate time.Time
}

type UpsertGroupUsr struct {
	GroupID GroupID
	UsrID   UsrID
	Access  GroupUsrAccess
}

type GroupNode struct {
	GroupID    GroupID
	NodeID     NodeID
	AssignDate time.Time
}

type UpsertGroupNode struct {
	GroupID GroupID
	NodeID  NodeID
}

type GroupPaginateParam struct {
	UsrID *UsrID
	pagination.PaginationParam
}

// GroupRepository is the interface to interact with the group repository
type GroupRepository interface {
	// GetByID returns a group by its identifier
	GetByID(ctx context.Context, id GroupID) (*Group, error)
	// GetByIDs returns groups by its identifiers
	GetByIDs(ctx context.Context, ids []GroupID) (map[GroupID]*Group, error)
	// GetByUsr returns a list of groups where user is the owner
	GetByUsr(ctx context.Context, usrID UsrID) ([]Group, error)
	// GetByUsrAssigned returns a list of groups attached to a user and their access
	GetByUsrAssigned(ctx context.Context, usrID UsrID) ([]Group, error)
	// Paginate returns a list of groups with pagination based on the provided pagination param
	Paginate(ctx context.Context, param GroupPaginateParam) (*pagination.PaginationResult[Group], error)
	// Create a new group in the system
	// Returns an error if nil data is provided
	Create(ctx context.Context, d *Group) error
	// Update a group in the system
	// Returns an error if nil data is provided
	Update(ctx context.Context, d *Group) error
	// Delete a group in the system by its identifier if it exists
	Delete(ctx context.Context, id GroupID) error
}

// GroupUsrRepository is the interface to interact with usr - group relations
type GroupUsrRepository interface {
	// GetGroupAccess returns the access of a user to a Group based on usrs group access, if no access is found it returns nil , ErrNoAccess
	GetGroupAccess(ctx context.Context, usrID UsrID, groupID GroupID) (GroupUsrAccess, error)
	// HasNodeAccess validate the access to specific node based on group usr assigment, if no access is found it returns ErrNoAccess
	HasAccess(ctx context.Context, usrID UsrID, path NodePath, access GroupUsrAccess) error
	// GetByUsr returns groups where user is a member
	GetByUsr(ctx context.Context, usrID UsrID) ([]GroupUsr, error)
	// Upsert access to a groups for a users
	// Returns an error if nil data is provided
	Upsert(ctx context.Context, d *UpsertGroupUsr) error
	// Upsert access to a groups for a users
	// Returns an error if nil data is provided
	UpsertAll(ctx context.Context, d []UpsertGroupUsr) error
	// RemoveUsr removes a user from a group if it exists on it
	RemoveUsr(ctx context.Context, g GroupID, u UsrID) error
}

// GroupNodeRepository is the interface to interact with node - group relations
type GroupNodeRepository interface {
	// GetByNode returns a list of groups attached to a node and their access
	GetByNode(ctx context.Context, nodeID NodeID) ([]GroupNode, error)
	// Upsert attach a node to a group, does nothing if node is already attached
	// Returns an error if nil data is provided
	Upsert(ctx context.Context, d *UpsertGroupNode) error
	// Upsert attach to nodes to groups
	// Returns an error if nil data is provide
	UpsertAll(ctx context.Context, d []UpsertGroupNode) error
	// RemoveNode removes a node from a group if it exist on it
	RemoveNode(ctx context.Context, g GroupID, n NodeID) error
}
