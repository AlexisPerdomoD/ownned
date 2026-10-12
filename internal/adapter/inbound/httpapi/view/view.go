// Package view contains the models for the transport layer
package view

import "ownned/pkg/pagination"

func PaginationResultViewFromDomain[T any, V any](
	res *pagination.PaginationResult[T],
	toView func(*T) V,
) pagination.PaginationResult[V] {
	views := make([]V, 0, len(res.Data))
	for _, t := range res.Data {
		views = append(views, toView(&t))
	}

	return pagination.PaginationResult[V]{
		Data:       views,
		Page:       res.Page,
		Limit:  res.Limit,
		TotalPages: res.TotalPages,
		TotalCount: res.TotalCount,
	}
}
