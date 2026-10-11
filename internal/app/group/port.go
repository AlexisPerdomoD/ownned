package group

import (
	"context"
	"ownned/internal/domain"
)

type PopulateGroup struct {
	domain.Group
	Nodes []domain.Node
	Usrs  []domain.UsrGroupAccess
}

type NodeLookup interface {
	GetByGroupID(ctx context.Context, groupID domain.GroupID) ([]domain.Node, error)
}

type UsrLookup interface {
	GetByID(ctx context.Context, id domain.UsrID) (*domain.Usr, error)

	GetByGroupID(ctx context.Context, groupID domain.GroupID) ([]domain.UsrGroupAccess, error)
}
