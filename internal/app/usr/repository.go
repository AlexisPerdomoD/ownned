package usr

import (
	"context"
	"ownned/internal/app/pagination"
	"ownned/internal/domain"
)

type UsrPaginationParam struct {
	Role *domain.UsrRole
	pagination.PaginationParam
}

// UsrRepository is the interface for the repository of the Usr entity.
type UsrRepository interface {
	// GetByID returns the Usr entity with the given ID. If no entity is found, it returns nil, nil.
	GetByID(ctx context.Context, id domain.UsrID) (*domain.Usr, error)

	// GetByUsername returns the Usr entity with the given username. If no entity is found, it returns nil, nil.
	GetByUsername(ctx context.Context, username string) (*domain.Usr, error)

	// GetByGroup returns the Usr entity with the given group ID.
	GetByGroup(ctx context.Context, groupID domain.GroupID) ([]domain.UsrGroupAccess, error)

	// Paginate returns a list of Usr entities that match the given pagination parameters.
	// param.Role is optional and filters the list of Usr entities by their role.
	// param.search is optional and filters the list of Usr entities by their username or firstname or lastname in that order.
	Paginate(ctx context.Context, param UsrPaginationParam) (*pagination.PaginationResult[domain.Usr], error)

	// Create creates a new Usr entity with the given data. If nil d is passed, it returns an error.
	Create(ctx context.Context, d *domain.Usr) error

	// Update updates the Usr entity with the given data. If nil d is passed, it returns an error.
	Update(ctx context.Context, d *domain.Usr) error

	// Delete deletes the Usr entity with the given ID. If no entity is found does nothing.
	Delete(ctx context.Context, id domain.UsrID) error
}

// UsrPwdRepository is the interface for the repository of the Usr password entity.
type UsrPwdRepository interface {
	// SetPwd sets the password of the Usr entity with the given ID. If it already exists it replaces the old password.If pwd is nil, it returns an error.
	SetPwd(ctx context.Context, id domain.UsrID, pwd []byte) error

	// GetPwd returns the password of the Usr entity with the given ID. If no entity is found, it returns nil, nil.
	GetPwd(ctx context.Context, id domain.UsrID) ([]byte, error)
}
