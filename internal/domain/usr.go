package domain

import (
	"fmt"
	"time"
	"uuid"
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

func (u *Usr) Fullname() string {
	return fmt.Sprintf("%s %s", u.Firstname, u.Lastname)
}

type UsrGroupAccess struct {
	Usr
	Access     GroupUsrAccess
	AssignDate time.Time
}
