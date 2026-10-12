package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/pagination"
	"ownned/internal/domain"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

const getGroupQuery string = `
SELECT 
	g.id,
	g.usr_id,
	g.name,
	g.description,
	g.created_at,
	g.updated_at
FROM fs.groups g`

const insertGroupQuery string = `
INSERT INTO fs.groups(
	id,
	usr_id,
	name,
	description,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6)`

const updateGroupQuery string = `
UPDATE fs.groups SET
	usr_id = $1,
	name = $2, 
	description = $3
WHERE id=$4`

const deleteGroupQuery string = `DELETE FROM fs.groups WHERE id=$1`

type groupRow struct {
	ID          uuid.UUID `db:"id"`
	UsrID       uuid.UUID `db:"usr_id"`
	Name        string    `db:"name"`
	Description string    `db:"description"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

func (r *groupRow) ToDomain() domain.Group {
	return domain.Group{
		ID:          r.ID,
		UsrID:       r.UsrID,
		Name:        r.Name,
		Description: r.Description,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}

type groupRepository struct {
	db sqlx.ExtContext
}

func (r *groupRepository) GetByID(ctx context.Context, id domain.GroupID) (*domain.Group, error) {
	q := fmt.Sprintf("%s\nWHERE id=$1", getGroupQuery)
	row := &groupRow{}
	err := r.db.QueryRowxContext(ctx, q, id).StructScan(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}

		return nil, err
	}

	d := row.ToDomain()
	return &d, nil
}

func (r *groupRepository) GetByIDs(ctx context.Context, ids []domain.GroupID) (map[domain.GroupID]*domain.Group, error) {
	res := make(map[domain.GroupID]*domain.Group)
	for _, id := range ids {
		res[id] = nil
	}

	if len(ids) == 0 {
		return res, nil
	}

	q := fmt.Sprintf("%s\nWHERE id=ANY($1)", getGroupQuery)
	rows, err := r.db.QueryxContext(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)

	for rows.Next() {
		row := &groupRow{}
		if err := rows.StructScan(row); err != nil {
			return nil, err
		}
		d := row.ToDomain()
		res[row.ID] = &d
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return res, nil
}

func (r *groupRepository) GetByUsrID(ctx context.Context, usrID domain.UsrID) ([]domain.Group, error) {
	q := fmt.Sprintf("%s\nWHERE g.usr_id=$1", getGroupQuery)
	rows, err := r.db.QueryxContext(ctx, q, usrID)
	if err != nil {
		return nil, err
	}

	defer safeClose(ctx, rows)
	res, err := readSlice[domain.Group, groupRow](rows)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (r *groupRepository) GetByUsrAssignedID(ctx context.Context, usrID domain.UsrID) ([]domain.Group, error) {
	q := fmt.Sprintf("%s\nINNER JOIN fs.group_usrs gu ON gu.group_id = g.id\nWHERE gu.usr_id=$1", getGroupQuery)
	rows, err := r.db.QueryxContext(ctx, q, usrID)
	if err != nil {
		return nil, err
	}

	defer safeClose(ctx, rows)
	res, err := readSlice[domain.Group, groupRow](rows)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (r *groupRepository) Paginate(
	ctx context.Context,
	param group.GroupPaginateParam,
) (*pagination.PaginationResult[domain.Group], error) {
	var where strings.Builder
	params := make([]any, 0)
	where.WriteString("\nWHERE 1=1")
	if param.UsrID != nil {
		statement := fmt.Sprintf("\nAND g.usr_id = $%d", len(params)+1)
		where.WriteString(statement)
		params = append(params, *param.UsrID)
	}

	if param.Search != "" {
		statement := fmt.Sprintf("\nAND g.name ILIKE $%d", len(params)+1)
		where.WriteString(statement)
		params = append(params, "%"+param.Search+"%")
	}

	whereStr := where.String()
	countQuery := fmt.Sprintf("SELECT count(*) FROM fs.groups g %s", whereStr)
	var totalCount int64
	err := r.db.QueryRowxContext(ctx, countQuery, params...).Scan(&totalCount)
	if err != nil {
		return nil, err
	}

	if totalCount == 0 {
		return &pagination.PaginationResult[domain.Group]{
			Data:       make([]domain.Group, 0),
			Page:       param.Page,
			Limit:      param.Limit,
			TotalPages: 0,
			TotalCount: 0,
		}, nil
	}

	page := param.GetSafePage()
	pageCount := param.GetSafeLimit()
	totalPages := uint(math.Ceil(float64(totalCount) / float64(pageCount)))
	query := fmt.Sprintf("%s%s\nORDER BY g.id\nLIMIT $%d OFFSET $%d",
		getGroupQuery,
		whereStr,
		len(params)+1,
		len(params)+2)
	params = append(params, pageCount)
	params = append(params, (page-1)*pageCount)

	rows, err := r.db.QueryxContext(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer safeClose(ctx, rows)

	data, err := readSlice[domain.Group, groupRow](rows)
	if err != nil {
		return nil, err
	}

	return &pagination.PaginationResult[domain.Group]{
		Data:       data,
		Page:       page,
		Limit:      pageCount,
		TotalPages: totalPages,
		TotalCount: uint(totalCount),
	}, nil
}

func (r *groupRepository) Create(ctx context.Context, d *domain.Group) error {
	if d == nil {
		return ErrInvalidArgument
	}

	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, insertGroupQuery,
		d.ID,
		d.UsrID,
		d.Name,
		d.Description,
		now,
		now)
	if err != nil {
		return err
	}

	d.CreatedAt = now
	d.UpdatedAt = now
	return nil
}

func (r *groupRepository) Update(ctx context.Context, d *domain.Group) error {
	if d == nil {
		return ErrInvalidArgument
	}

	res, err := r.db.ExecContext(ctx, updateGroupQuery, d.UsrID, d.Name, d.Description, d.ID)
	if err != nil {
		return err
	}

	count, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if count < 1 {
		return apperror.ErrNotFound(nil)
	}

	d.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *groupRepository) Delete(ctx context.Context, id domain.GroupID) error {
	_, err := r.db.ExecContext(ctx, deleteGroupQuery, id)
	return err
}

func NewGroupRepository(db sqlx.ExtContext) group.GroupRepository {
	return &groupRepository{db}
}
