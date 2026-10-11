package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

var ErrNoAccess = errors.New("no access")

// GroupID is a group identifier in the system
type GroupID = uuid.UUID

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

// Group represents a identifier to be tag to a Folder or file in the system and be associated with a user(s)
type Group struct {
	ID          GroupID
	UsrID       UsrID
	Name        string
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type GroupNode struct {
	GroupID    GroupID
	NodeID     NodeID
	AssignDate time.Time
}

type GroupUsr struct {
	GroupID    GroupID
	UsrID      UsrID
	Access     GroupUsrAccess
	AssignDate time.Time
}
