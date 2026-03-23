package domain

import (
	"context"
	"time"

	"ownned/pkg/pagination"

	"github.com/google/uuid"
)

type UsrID = uuid.UUID

type UsrRole string

const (
	SuperUsrRole   UsrRole = "super_usr_role"
	NormalUsrRole  UsrRole = "normal_usr_role"
	LimitedUsrRole UsrRole = "limited_usr_role"
)

func (r UsrRole) String() string {
	switch r {
	case SuperUsrRole:
		return "Super Role"
	case NormalUsrRole:
		return "Normal Role"
	case LimitedUsrRole:
		return "Limited Role"
	default:
		return "Unknown Role"
	}
}

func (r UsrRole) IsValid() bool {
	switch r {
	case SuperUsrRole, NormalUsrRole, LimitedUsrRole:
		return true
	default:
		return false
	}
}

func (r UsrRole) CanCreateUsr() bool {
	return r == SuperUsrRole
}

func (r UsrRole) CanDeleteUsr() bool {
	return r == SuperUsrRole
}

func (r UsrRole) CanCreateNode() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

func (r UsrRole) CanDeleteNode() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

func (r UsrRole) CanCreateDoc() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

func (r UsrRole) CanDeleteDoc() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

func (r UsrRole) CanCreateGroup() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

func (r UsrRole) CanDeleteGroup() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

func (r UsrRole) CanAssignGroupNode() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

func (r UsrRole) CanUnAssignGroupNode() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

func (r UsrRole) CanAssignGroupUsr() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

func (r UsrRole) CanUnAssignGroupUsr() bool {
	return r == SuperUsrRole || r == NormalUsrRole
}

type Usr struct {
	ID        UsrID
	Role      UsrRole
	Firstname string
	Lastname  string
	Username  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type UsrGroupAccess struct {
	Usr
	Access     GroupUsrAccess
	AssignDate time.Time
}

type UsrPaginationParam struct {
	Role *UsrRole
	pagination.PaginationParam
}

// UsrRepository is the interface for the repository of the Usr entity.
type UsrRepository interface {
	// GetByID returns the Usr entity with the given ID. If no entity is found, it returns nil, nil.
	GetByID(ctx context.Context, id UsrID) (*Usr, error)

	// GetByUsername returns the Usr entity with the given username. If no entity is found, it returns nil, nil.
	GetByUsername(ctx context.Context, username string) (*Usr, error)

	// GetByGroup returns the Usr entity with the given group ID.
	GetByGroup(ctx context.Context, groupID GroupID) ([]UsrGroupAccess, error)

	// Paginate returns a list of Usr entities that match the given pagination parameters.
	// param.Role is optional and filters the list of Usr entities by their role.
	// param.search is optional and filters the list of Usr entities by their username or firstname or lastname in that order.
	Paginate(ctx context.Context, param UsrPaginationParam) (*pagination.PaginationResult[Usr], error)

	// Create creates a new Usr entity with the given data. If nil d is passed, it returns an error.
	Create(ctx context.Context, d *Usr) error

	// Update updates the Usr entity with the given data. If nil d is passed, it returns an error.
	Update(ctx context.Context, d *Usr) error

	// Delete deletes the Usr entity with the given ID. If no entity is found does nothing.
	Delete(ctx context.Context, id UsrID) error
}

// UsrPwdRepository is the interface for the repository of the Usr password entity.
type UsrPwdRepository interface {
	// SetPwd sets the password of the Usr entity with the given ID. If it already exists it replaces the old password.If pwd is nil, it returns an error.
	SetPwd(ctx context.Context, id UsrID, pwd []byte) error

	// GetPwd returns the password of the Usr entity with the given ID. If no entity is found, it returns nil, nil.
	GetPwd(ctx context.Context, id UsrID) ([]byte, error)
}
