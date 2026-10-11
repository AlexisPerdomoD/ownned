// Package pagination provides pagination functionality for the application layer.
package pagination

const DefaultLimit = 20
const DefaultHighestLimit = 120
const DefaultPage = 1

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
