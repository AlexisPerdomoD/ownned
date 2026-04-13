package pg

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ownned/internal/domain"
	"ownned/pkg/apperror"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

const getNodeQuery string = `
SELECT
	n.id,
	n.usr_id,
	n.name,
	n.description,
	n.path,
	n.type,
	n.created_at,
	n.updated_at
FROM fs.nodes n`

const getNodeAttachQuery string = `
SELECT
	n.id,
	n.usr_id,
	n.name,
	n.description,
	n.path,
	n.type,
	n.created_at,
	n.updated_at,
	gn.assigned_at
FROM fs.nodes n
INNER JOIN fs.group_nodes gn ON n.id=gn.node_id`

const insertNodeQuery string = `
INSERT INTO fs.nodes (
	id,
	usr_id,
	name,
	description,
	path,
	type,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

const deleteNodeQuery string = `DELETE FROM nodes WHERE path <@ (SELECT path FROM nodes WHERE id = $1)`

type nodeRow struct {
	ID          domain.NodeID `db:"id"`
	UsrID       domain.UsrID  `db:"usr_id"`
	Name        string        `db:"name"`
	Description string        `db:"description"`
	Path        string        `db:"path"`
	Type        string        `db:"type"`
	CreatedAt   time.Time     `db:"created_at"`
	UpdatedAt   time.Time     `db:"updated_at"`
}

func (r *nodeRow) ToDomain() domain.Node {
	return domain.Node{
		ID:          r.ID,
		UsrID:       r.UsrID,
		Name:        r.Name,
		Description: r.Description,
		Path:        domain.NodePath(r.Path),
		Type:        domain.NodeType(r.Type),
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}

type nodeAttachRow struct {
	nodeRow
	AssignedAt time.Time `db:"assigned_at"`
}

func (r *nodeAttachRow) ToDomain() domain.NodeGroupAttach {
	return domain.NodeGroupAttach{
		Node:       r.nodeRow.ToDomain(),
		AssignDate: r.AssignedAt,
	}
}

type nodeRepository struct {
	db sqlx.ExtContext
}

func (r *nodeRepository) GetByID(ctx context.Context, id domain.NodeID) (*domain.Node, error) {
	q := fmt.Sprintf("%s\nWHERE n.id=$1", getNodeQuery)
	row := &nodeRow{}
	if err := r.db.QueryRowxContext(ctx, q, id).StructScan(row); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}

		return nil, err
	}

	d := row.ToDomain()
	return &d, nil
}

func (r *nodeRepository) GetChildren(ctx context.Context, folderPath domain.NodePath) ([]domain.Node, error) {
	q := fmt.Sprintf("%s\nWHERE nlevel(n.path)=nlevel($1::ltree)+1", getNodeQuery)
	rows, err := r.db.QueryxContext(ctx, q, folderPath)
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)
	nodes, err := readSlice[domain.Node, nodeRow](rows)
	if err != nil {
		return nil, err
	}

	return nodes, nil
}

func (r *nodeRepository) GetRoot(ctx context.Context) ([]domain.Node, error) {
	q := fmt.Sprintf("%s\nWHERE nlevel(n.path)=1", getNodeQuery)

	rows, err := r.db.QueryxContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)
	nodes, err := readSlice[domain.Node, nodeRow](rows)
	if err != nil {
		return nil, err
	}

	return nodes, nil
}

func (r *nodeRepository) GetRootByGroups(ctx context.Context, groups []domain.GroupID) ([]domain.Node, error) {
	if len(groups) == 0 {
		detail := make(map[string]string)
		detail["invalid_argument"] = "no groups provided for getting root nodes"
		return nil, apperror.ErrIlegalDBState(detail)
	}

	q := fmt.Sprintf(`
	WITH candidate_nodes AS (
		%s
		INNER JOIN fs.group_nodes gn ON n.id=gn.node_id 
		WHERE gn.group_id=ANY($1::uuid[])
	)
	SELECT n.* FROM candidate_nodes n
		WHERE NOT EXISTS (
			SELECT 1 FROM candidate_nodes parent 
			WHERE parent.path @> n.path
			AND parent.id <> n.id
		)`, getNodeQuery)

	rows, err := r.db.QueryxContext(ctx, q, pq.Array(groups))
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)
	nodes, err := readSlice[domain.Node, nodeRow](rows)
	if err != nil {
		return nil, err
	}

	return nodes, nil
}

func (r *nodeRepository) GetByGroup(ctx context.Context, groupID domain.GroupID) ([]domain.NodeGroupAttach, error) {
	q := fmt.Sprintf("%s\nWHERE gn.group_id=$1", getNodeAttachQuery)
	rows, err := r.db.QueryxContext(ctx, q, groupID)
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)
	nodes, err := readSlice[domain.NodeGroupAttach, nodeAttachRow](rows)
	if err != nil {
		return nil, err
	}

	return nodes, nil
}

func (r *nodeRepository) Create(ctx context.Context, n *domain.Node) error {
	if n == nil {
		return apperror.ErrIlegalDBState(map[string]string{"invalid_argument": "node argument was provided as nil"})
	}

	createdAt := time.Now().UTC()
	updatedAt := createdAt
	_, err := r.db.ExecContext(ctx, insertNodeQuery,
		n.ID,
		n.UsrID,
		n.Name,
		n.Description,
		n.Path,
		n.Type,
		createdAt,
		updatedAt,
	)
	if err != nil {
		return err
	}

	n.CreatedAt = createdAt
	n.UpdatedAt = updatedAt

	return nil
}

func (r *nodeRepository) Update(ctx context.Context, n *domain.Node) error {
	return apperror.ErrNotImplemented(nil)
}

func (r *nodeRepository) Delete(ctx context.Context, id domain.NodeID) error {
	_, err := r.db.ExecContext(ctx, deleteNodeQuery, id)
	return err
}

func NewNodeRepository(db sqlx.ExtContext) domain.NodeRepository {
	return &nodeRepository{db}
}
