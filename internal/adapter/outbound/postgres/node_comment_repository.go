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

const getNodeCommentQuery string = `
SELECT
	nc.id,
	nc.node_id,
	nc.usr_id,
	nc.content,
	nc.created_at,
	nc.updated_at
FROM fs.node_comments nc`

const insertNodeCommentQuery string = `
INSERT INTO fs.node_comments(
	node_id,
	usr_id,
	content,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5)`

const updateNodeCommentQuery string = `UPDATE fs.node_comments SET content = $1 WHERE id = $2`

const deleteNodeCommentQuery string = `DELETE FROM node_comments WHERE id = $1`

type nodeCommentRow struct {
	ID        domain.NodeCommentID `db:"id"`
	NodeID    domain.NodeID        `db:"node_id"`
	UsrID     domain.UsrID         `db:"usr_id"`
	Content   string               `db:"content"`
	CreatedAt time.Time            `db:"created_at"`
	UpdatedAt time.Time            `db:"updated_at"`
}

func (r *nodeCommentRow) ToDomain() domain.NodeComment {
	return domain.NodeComment{
		ID:        r.ID,
		NodeID:    r.NodeID,
		UsrID:     r.UsrID,
		Content:   r.Content,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}

type nodeCommentRepository struct {
	db sqlx.ExtContext
}

func (r *nodeCommentRepository) GetByID(ctx context.Context, id domain.NodeCommentID) (*domain.NodeComment, error) {
	q := fmt.Sprintf("%s\nWHERE nc.id=$1", getNodeCommentQuery)
	row := &nodeCommentRow{}
	err := r.db.QueryRowxContext(ctx, q, id).StructScan(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}

		return nil, err
	}

	d := row.ToDomain()
	return &d, nil
}

func (r *nodeCommentRepository) GetByNodeID(ctx context.Context, nodeID domain.NodeID) ([]domain.NodeComment, error) {
	q := fmt.Sprintf("%s\nWHERE nc.node_id=$1 ORDER BY nc.created_at DESC", getNodeCommentQuery)
	rows, err := r.db.QueryxContext(ctx, q, nodeID)
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)
	nodes, err := readSlice[domain.NodeComment, nodeCommentRow](rows)
	if err != nil {
		return nil, err
	}

	return nodes, nil
}

func (r *nodeCommentRepository) Create(ctx context.Context, c *domain.NodeComment) error {
	if c == nil {
		detail := make(map[string]string)
		detail["reason"] = "node comment argument was provided as nil"
		return apperror.ErrIlegalDBState(detail)
	}

	createdAt := time.Now().UTC()
	updatedAt := createdAt
	_, err := r.db.ExecContext(ctx, insertNodeCommentQuery,
		c.NodeID,
		c.UsrID,
		c.Content,
		createdAt,
		updatedAt,
	)
	if err != nil {
		return err
	}

	c.CreatedAt = createdAt
	c.UpdatedAt = updatedAt
	return nil
}

func (r *nodeCommentRepository) Update(ctx context.Context, c *domain.NodeComment) error {
	if c == nil {
		detail := make(map[string]string)
		detail["reason"] = "node comment argument was provided as nil"
		return apperror.ErrIlegalDBState(detail)
	}

	res, err := r.db.ExecContext(ctx, updateNodeCommentQuery, c.Content, c.ID)
	if err != nil {
		return err
	}

	count, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if count < 1 {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("Node comment with ID=%s was not found", c.ID)
		return apperror.ErrNotFound(nil)
	}

	c.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *nodeCommentRepository) Delete(ctx context.Context, id domain.NodeCommentID) error {
	_, err := r.db.ExecContext(ctx, deleteNodeCommentQuery, id)
	return err
}

func NewNodeCommentRepository(db sqlx.ExtContext) node.NodeCommentRepository {
	return &nodeCommentRepository{db: db}
}
