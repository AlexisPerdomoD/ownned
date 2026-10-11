// Package domain provides the domain layer of the application.
package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

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

type DocRepository interface {
	GetByID(ctx context.Context, id DocID) (*Doc, error)

	GetByNodeID(ctx context.Context, id NodeID) (*Doc, error)

	GetAllFromPath(ctx context.Context, path NodePath) ([]Doc, error)

	Create(ctx context.Context, d *Doc) error

	Update(ctx context.Context, d *Doc) error
}
