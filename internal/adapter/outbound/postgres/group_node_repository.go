package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"ownned/internal/app/group"
	"ownned/internal/domain"
)

const getGroupNodeQuery string = `
SELECT 
	gn.group_id,
	gn.node_id,
	gn.assigned_at
FROM fs.group_nodes gn`

const upsertGroupNodeQuery = `
INSERT INTO fs.group_nodes(
	group_id,
	node_id,
	assigned_at)
VALUES (
	:group_id,
	:node_id,
	:assigned_at) 
ON CONFLICT(group_id, node_id) DO NOTHING`

const deleteGroupNodeQuery = `DELETE FROM fs.group_nodes`

type groupNodeRow struct {
	GroupID    domain.GroupID `db:"group_id"`
	NodeID     domain.NodeID  `db:"node_id"`
	AssignedAt time.Time      `db:"assigned_at"`
}

func (r *groupNodeRow) ToDomain() domain.GroupNode {
	return domain.GroupNode{
		GroupID:    r.GroupID,
		NodeID:     r.NodeID,
		AssignDate: r.AssignedAt,
	}
}

type groupNodeRepository struct {
	db sqlx.ExtContext
}

func (r *groupNodeRepository) GetByNode(ctx context.Context, nodeID domain.NodeID) ([]domain.GroupNode, error) {
	q := fmt.Sprintf("%s\nWHERE gn.node_id=$1", getGroupNodeQuery)
	rows, err := r.db.QueryxContext(ctx, q, nodeID)
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)
	// por revisar bb si funciona soy dios
	res, err := readSlice[domain.GroupNode, groupNodeRow](rows)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (r *groupNodeRepository) Upsert(ctx context.Context, d *domain.GroupNode) error {
	if d == nil {
		return ErrInvalidArgument
	}

	row := &groupNodeRow{
		NodeID:     d.NodeID,
		GroupID:    d.GroupID,
		AssignedAt: time.Now().UTC(),
	}

	_, err := sqlx.NamedExecContext(ctx, r.db, upsertGroupNodeQuery, row)
	if err != nil {
		return err
	}

	d.AssignDate = row.AssignedAt

	return nil
}

func (r *groupNodeRepository) UpsertAll(ctx context.Context, d []domain.GroupNode) error {
	if len(d) == 0 {
		return ErrInvalidArgument
	}
	assignedAt := time.Now().UTC()
	rows := make([]groupNodeRow, len(d))
	for i, gn := range d {
		rows[i].GroupID = gn.GroupID
		rows[i].NodeID = gn.NodeID
		rows[i].AssignedAt = assignedAt
	}

	if _, err := sqlx.
		NamedExecContext(ctx, r.db, upsertGroupNodeQuery, rows); err != nil {
		return err
	}

	for i := range d {
		d[i].AssignDate = assignedAt
	}

	return nil
}

func (r *groupNodeRepository) Delete(ctx context.Context, groupID domain.GroupID, nodeID domain.NodeID) error {
	q := fmt.Sprintf("%s\nWHERE group_id=$1\nAND node_id=$2", deleteGroupNodeQuery)

	if _, err := r.db.ExecContext(ctx, q, groupID, nodeID); err != nil {
		return err
	}

	return nil
}

func NewGroupNodeRepository(db sqlx.ExtContext) group.GroupNodeRepository {
	return &groupNodeRepository{db: db}
}
