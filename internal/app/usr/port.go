package usr

import (
	"context"

	"ownned/internal/domain"
)

type NodeCreator interface {
	Create(ctx context.Context, n *domain.Node) error
}

type GroupLookup interface {
	GetRoot(ctx context.Context) (*domain.Group, error)
}

type GroupCreator interface {
	Create(ctx context.Context, d *domain.Group) error
}

type GroupRepository interface {
	GroupLookup
	GroupCreator
}

type GroupUsrUpsertor interface {
	Upsert(ctx context.Context, d *domain.GroupUsr) error
}

type GroupNodeUpsertor interface {
	Upsert(ctx context.Context, d *domain.GroupNode) error
}

type PwdHasher interface {
	Hash(password []byte) ([]byte, error)
}
