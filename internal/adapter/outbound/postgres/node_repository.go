package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"ownned/internal/app/apperror"
	"ownned/internal/app/node"
	"ownned/internal/app/pagination"
	"ownned/internal/domain"

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

const getNodeDisplayPathQuery string = `
SELECT  
	CONCAT('/', string_agg(ancestor.name, '/' ORDER BY nlevel(ancestor.path) ASC))
FROM fs.nodes AS target
JOIN fs.nodes AS ancestor
  ON target.path <@ ancestor.path
WHERE target.id = $1;`

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

const deleteNodeQuery string = `DELETE FROM fs.nodes WHERE path <@ (SELECT path FROM fs.nodes WHERE id = $1)`

type nodeRow struct {
	ID          domain.NodeID `db:"id"`
	UsrID       *domain.UsrID `db:"usr_id"`
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

func (r *nodeRepository) GetChildren(ctx context.Context, folderPath domain.NodePath, depth *uint) ([]domain.Node, error) {
	q := fmt.Sprintf("%s\nWHERE n.path <@ $1::ltree", getNodeQuery)
	params := []any{folderPath}

	if depth != nil {
		q = q + "\nAND nlevel(n.path) <= nlevel($1::ltree)+$2"
		params = append(params, *depth)
	}

	q = q + "\nORDER BY n.path"

	rows, err := r.db.QueryxContext(ctx, q, params...)
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

func (r *nodeRepository) GetDisplayPathByID(ctx context.Context, id domain.NodeID) (*string, error) {
	path := new(string)

	if err := r.db.QueryRowxContext(ctx, getNodeDisplayPathQuery, id).Scan(path); err != nil {
		return nil, err
	}

	return path, nil
}

func (r *nodeRepository) GetRootByGroupIDs(ctx context.Context, groups []domain.GroupID) ([]domain.Node, error) {
	if len(groups) == 0 {
		detail := make(map[string]string)
		detail["reason"] = "no groups provided for getting root nodes"
		return nil, apperror.ErrIlegalDBState(detail)
	}

	q := fmt.Sprintf(`
	WITH candidate_nodes AS (
		%s
		INNER JOIN fs.group_nodes gn ON n.id=gn.node_id 
		WHERE gn.group_id=ANY($1)
	)
	SELECT n.* FROM candidate_nodes n
		WHERE NOT EXISTS (
			SELECT 1 FROM candidate_nodes parent 
			WHERE parent.path @> n.path
			AND parent.id <> n.id
		)`, getNodeQuery)

	ids := make([]string, 0, len(groups))
	for _, g := range groups {
		ids = append(ids, g.String())
	}

	rows, err := r.db.QueryxContext(ctx, q, pq.Array(ids))
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

func (r *nodeRepository) GetByGroupID(ctx context.Context, groupID domain.GroupID) ([]domain.Node, error) {
	q := fmt.Sprintf("%s\nJOIN fs.group_nodes gn on gn.node_id=n.id\nWHERE gn.group_id=$1", getNodeQuery)
	rows, err := r.db.QueryxContext(ctx, q, groupID)
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

func (r *nodeRepository) Paginate(ctx context.Context, p node.PaginateNode) (*pagination.PaginationResult[domain.Node], error) {
	var where strings.Builder
	where.WriteString("\nWHERE 1=1")
	params := make([]any, 0)
	baseQ := getNodeQuery

	// NOTE: Must be first filter since paramter is used in q
	if p.RootID != nil {
		baseQ = fmt.Sprintf("%s\nJOIN fs.nodes root ON root.id = $%d", baseQ, len(params)+1)
		params = append(params, *p.RootID)

		statement := "\nAND n.path <@ root.path"
		where.WriteString(statement)
	}

	if p.Type != nil {
		statement := fmt.Sprintf("\nAND n.type = $%d", len(params)+1)
		where.WriteString(statement)
		params = append(params, *p.Type)
	}

	if len(p.GroupIDs) > 0 {
		statement := fmt.Sprintf(
			"\nAND EXISTS (SELECT 1 FROM fs.group_nodes gn WHERE gn.node_id = n.id AND gn.group_id = ANY($%d::uuid[]))",
			len(params)+1)
		where.WriteString(statement)
		groupIDs := make([]string, 0, len(p.GroupIDs))
		for _, g := range p.GroupIDs {
			groupIDs = append(groupIDs, g.String())
		}
		params = append(params, pq.Array(groupIDs))
	}

	if p.Search != "" {
		pos := len(params) + 1
		statement := fmt.Sprintf("\nAND (n.name ILIKE $%d OR n.description ILIKE $%d)", pos, pos)
		where.WriteString(statement)
		params = append(params, "%"+p.Search+"%")
	}

	statements := where.String()
	q := fmt.Sprintf("%s\n%s", baseQ, statements)
	countQ := fmt.Sprintf("SELECT count(*) FROM (%s) as filtered", q)
	totalCount := new(int64)
	if err := r.db.QueryRowxContext(ctx, countQ, params...).Scan(totalCount); err != nil {
		return nil, err
	}

	page, limit := p.GetSafePage(), p.GetSafeLimit()

	if *totalCount == 0 {
		return &pagination.PaginationResult[domain.Node]{
			Data:       make([]domain.Node, 0),
			Page:       page,
			Limit:      limit,
			TotalPages: 0,
			TotalCount: 0,
		}, nil
	}

	q = fmt.Sprintf("%s\nORDER BY n.id\nLIMIT $%d OFFSET $%d", q, len(params)+1, len(params)+2)

	params = append(params, limit)
	params = append(params, (page-1)*limit)

	rows, err := r.db.QueryxContext(ctx, q, params...)
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)
	data, err := readSlice[domain.Node, nodeRow](rows)
	if err != nil {
		return nil, err
	}

	return &pagination.PaginationResult[domain.Node]{
		Data:       data,
		Page:       page,
		Limit:      limit,
		TotalPages: uint(math.Ceil(float64(*totalCount) / float64(limit))),
		TotalCount: uint(*totalCount),
	}, nil
}

func (r *nodeRepository) Create(ctx context.Context, n *domain.Node) error {
	if n == nil {
		detail := map[string]string{"reason": "node argument was provided as nil"}
		return apperror.ErrIlegalDBState(detail)
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

func (r *nodeRepository) Delete(ctx context.Context, nodeID domain.NodeID) error {
	_, err := r.db.ExecContext(ctx, deleteNodeQuery, nodeID)
	return err
}

func NewNodeRepository(db sqlx.ExtContext) node.NodeRepository {
	return &nodeRepository{db: db}
}
