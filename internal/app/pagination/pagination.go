// Package pagination provides pagination functionality for the application layer.
package pagination

const (
	DefaultLimit        = 20
	DefaultHighestLimit = 120
	DefaultPage         = 1
)

type PaginationParam struct {
	Search string `json:"search"`
	Limit  uint   `json:"limit"`
	Page   uint   `json:"page"`
}

func (p *PaginationParam) GetSafePage() uint {
	if p.Page == 0 {
		return DefaultPage
	}

	return p.Page
}

func (p *PaginationParam) GetSafeLimit() uint {
	if p.Limit == 0 {
		return DefaultLimit
	}

	if p.Limit > 120 {
		return DefaultHighestLimit
	}

	return p.Limit
}

type PaginationResult[T any] struct {
	Data       []T  `json:"data"`
	Page       uint `json:"page"`
	Limit      uint `json:"limit"`
	TotalPages uint `json:"total_pages"`
	TotalCount uint `json:"total_count"`
}

func (r *PaginationResult[T]) Map[V any](mapper func(*T) V) PaginationResult[V] {
	data := make([]V, 0, len(r.Data))
	for i := range r.Data {
		data = append(data, mapper(&r.Data[i]))
	}

	return PaginationResult[V]{
		Data:       data,
		Page:       r.Page,
		Limit:      r.Limit,
		TotalPages: r.TotalPages,
		TotalCount: r.TotalCount,
	}
}
