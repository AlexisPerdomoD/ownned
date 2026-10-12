package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ownned/internal/app/apperror"
	"ownned/internal/app/node"
	"ownned/internal/domain"

	"github.com/jmoiron/sqlx"
)

const getDocQuery string = `
SELECT 
	d.id,
	d.node_id,
	d.title,
	d.filename,
	d.description,
	d.mime_type,
	d.size_in_bytes,
	d.created_at,
	d.updated_at
FROM fs.docs d`

const insertDocQuery string = `
INSERT INTO fs.docs (
	id,
	node_id,
	title,
	filename,
	description,
	mime_type,
	size_in_bytes,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

type docRow struct {
	ID          domain.DocID  `db:"id"`
	NodeID      domain.NodeID `db:"node_id"`
	Title       string        `db:"title"`
	Filename    string        `db:"filename"`
	Description string        `db:"description"`
	MimeType    string        `db:"mime_type"`
	SizeInBytes int64         `db:"size_in_bytes"`
	CreatedAt   time.Time     `db:"created_at"`
	UpdatedAt   time.Time     `db:"updated_at"`
}

func (r *docRow) ToDomain() domain.Doc {
	return domain.Doc{
		ID:          r.ID,
		NodeID:      r.NodeID,
		Title:       r.Title,
		Filename:    r.Filename,
		Description: r.Description,
		MimeType:    r.MimeType,
		SizeInBytes: uint64(r.SizeInBytes),
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}

type docRepository struct {
	db sqlx.ExtContext
}

func (r *docRepository) GetByID(ctx context.Context, id domain.DocID) (*domain.Doc, error) {
	q := fmt.Sprintf("%s\nWHERE d.id=$1", getDocQuery)
	row := &docRow{}
	if err := r.db.QueryRowxContext(ctx, q, id).StructScan(row); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}

		return nil, err
	}

	d := row.ToDomain()
	return &d, nil
}

func (r *docRepository) GetByNodeID(ctx context.Context, id domain.DocID) (*domain.Doc, error) {
	q := fmt.Sprintf("%s\nWHERE d.node_id=$1", getDocQuery)
	row := &docRow{}
	if err := r.db.QueryRowxContext(ctx, q, id).StructScan(row); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}

		return nil, err
	}

	d := row.ToDomain()
	return &d, nil
}

func (r *docRepository) GetAllFromPath(ctx context.Context, path domain.NodePath) ([]domain.Doc, error) {
	q := fmt.Sprintf("%s\nWHERE f.node_id IN ( SELECT node_id FROM fs.nodes WHERE path <@ $1::ltree )", getDocQuery)
	rows, err := r.db.QueryxContext(ctx, q, path)
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)

	docs, err := readSlice[domain.Doc, docRow](rows)
	if err != nil {
		return nil, err
	}

	return docs, nil
}

func (r *docRepository) Create(ctx context.Context, d *domain.Doc) error {
	if d == nil {
		detail := map[string]string{"reason": "doc argument was provided as nil"}
		return apperror.ErrIlegalDBState(detail)
	}
	createdAt := time.Now().UTC()
	updatedAt := createdAt
	_, err := r.db.ExecContext(ctx, insertDocQuery,
		d.ID,
		d.NodeID,
		d.Title,
		d.Filename,
		d.Description,
		d.MimeType,
		d.SizeInBytes,
		createdAt,
		updatedAt,
	)
	if err != nil {
		return err
	}

	d.CreatedAt = createdAt
	d.UpdatedAt = updatedAt

	return nil
}

func (r *docRepository) Update(ctx context.Context, d *domain.Doc) error {
	return apperror.ErrNotImplemented(nil)
}

func NewDocRepository(db sqlx.ExtContext) node.DocRepository {
	return &docRepository{db: db}
}
