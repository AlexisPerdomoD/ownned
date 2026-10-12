package postgres

import (
	"context"
	"log/slog"

	"github.com/jmoiron/sqlx"
)

// closer is an interface that allows to close a resource.
type closer interface {
	Close() error
}

// safeClose closes the provided resource and logs any error.
func safeClose(ctx context.Context, c closer) {
	err := c.Close()
	if err != nil {
		slog.WarnContext(ctx, "failed to close resource", "err", err)
	}
}

// rowRecord is an interface that allows to convert a row to a domain object.
type rowRecord[R any] interface {
	ToDomain() R
}

// readSlice reads all rows from the provided rows and returns a slice of domain objects.
func readSlice[R any, T any, PT interface {
	*T
	rowRecord[R]
}](rows *sqlx.Rows) ([]R, error) {
	res := make([]R, 0, 8)

	for rows.Next() {
		var row T
		ptr := PT(&row)

		if err := rows.StructScan(ptr); err != nil {
			return nil, err
		}

		res = append(res, ptr.ToDomain())
	}

	err := rows.Err()
	if err != nil {
		return nil, err
	}

	return res, nil
}
