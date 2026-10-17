package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"ownned/internal/app/apperror"
	"ownned/internal/app/pagination"
	"ownned/internal/app/usr"
	"ownned/internal/domain"
)

const getUsrQuery string = `
SELECT
	u.id,
	u.role,
	u.firstname,
	u.lastname,
	u.username,
	u.created_at,
	u.updated_at
FROM fs.usrs u
`

const getUsrGroupAccessQuery string = `
SELECT
	u.id,
	u.role,
	u.firstname,
	u.lastname,
	u.username,
	u.created_at,
	u.updated_at,
	gu.access,
	gu.assigned_at
FROM fs.usrs u
INNER JOIN fs.group_usrs gu ON u.id = gu.usr_id
`

const insertUsrQuery string = `
INSERT INTO fs.usrs(
	id,
	role,
	firstname,
	lastname,
	username,
	created_at,
	updated_at
) VALUES 
	( $1, $2, $3, $4, $5, $6, $7 )`

const updateUsrQuery string = `
UPDATE fs.usrs SET
	role 		= $1,
	firstname 	= $2,
	lastname	= $3,
	username	= $4
WHERE id=$5`

type usrRow struct {
	ID        domain.UsrID   `db:"id"`
	Role      domain.UsrRole `db:"role"`
	Firstname string         `db:"firstname"`
	Lastname  string         `db:"lastname"`
	Username  string         `db:"username"`
	CreatedAt time.Time      `db:"created_at"`
	UpdatedAt time.Time      `db:"updated_at"`
}

func (r *usrRow) ToDomain() domain.Usr {
	return domain.Usr{
		ID:        r.ID,
		Role:      r.Role,
		Firstname: r.Firstname,
		Lastname:  r.Lastname,
		Username:  r.Username,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}

type usrGroupAccessRow struct {
	usrRow
	Access     domain.GroupUsrAccess `db:"access"`
	AssignedAt time.Time             `db:"assigned_at"`
}

func (r *usrGroupAccessRow) ToDomain() domain.UsrGroupAccess {
	return domain.UsrGroupAccess{
		ID:         r.ID,
		Role:       r.Role,
		Firstname:  r.Firstname,
		Lastname:   r.Lastname,
		Username:   r.Username,
		CreatedAt:  r.CreatedAt,
		UpdatedAt:  r.UpdatedAt,
		Access:     r.Access,
		AssignDate: r.AssignedAt,
	}
}

type usrRepository struct {
	db sqlx.ExtContext
}

func (r *usrRepository) GetByID(ctx context.Context, id domain.UsrID) (*domain.Usr, error) {
	q := fmt.Sprintf("%s\nWHERE u.id=$1", getUsrQuery)
	row := &usrRow{}
	error := sqlx.GetContext(ctx, r.db, row, q, id)
	if error != nil {
		if error == sql.ErrNoRows {
			return nil, nil
		}

		return nil, error
	}

	res := row.ToDomain()
	return &res, nil
}

func (r *usrRepository) GetByUsername(ctx context.Context, username string) (*domain.Usr, error) {
	q := fmt.Sprintf("%s\nWHERE u.username=$1", getUsrQuery)
	row := &usrRow{}
	error := sqlx.GetContext(ctx, r.db, row, q, username)
	if error != nil {
		if error == sql.ErrNoRows {
			return nil, nil
		}
		return nil, error
	}
	res := row.ToDomain()
	return &res, nil
}

func (r *usrRepository) GetByGroupID(ctx context.Context, groupID domain.GroupID) ([]domain.UsrGroupAccess, error) {
	q := fmt.Sprintf("%s\nWHERE gu.group_id=$1", getUsrGroupAccessQuery)
	rows, err := r.db.QueryxContext(ctx, q, groupID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	result := make([]domain.UsrGroupAccess, 0)
	for rows.Next() {
		row := &usrGroupAccessRow{}
		if err := rows.StructScan(row); err != nil {
			return nil, err
		}
		result = append(result, row.ToDomain())
	}

	err = rows.Err()
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (r *usrRepository) Paginate(
	ctx context.Context,
	param usr.UsrPaginationParam,
) (*pagination.PaginationResult[domain.Usr], error) {
	var where strings.Builder
	params := make([]any, 0)
	where.WriteString("\nWHERE 1=1")
	if param.Role != nil {
		statement := fmt.Sprintf("\nAND u.role = $%d", len(params)+1)
		where.WriteString(statement)
		params = append(params, *param.Role)
	}

	if param.Search != "" {
		pos := len(params) + 1
		statement := fmt.Sprintf(
			"\nAND (u.username ILIKE $%d OR u.firstname ILIKE $%d OR u.lastname ILIKE $%d)",
			pos,
			pos,
			pos)
		where.WriteString(statement)
		params = append(params, "%"+param.Search+"%")
	}

	whereStr := where.String()
	countQuery := fmt.Sprintf("SELECT count(*) FROM fs.usrs u %s", whereStr)

	var totalCount int64
	err := r.db.QueryRowxContext(ctx, countQuery, params...).Scan(&totalCount)
	if err != nil {
		return nil, err
	}

	if totalCount == 0 {
		return &pagination.PaginationResult[domain.Usr]{
			Data:       make([]domain.Usr, 0),
			Page:       param.Page,
			Limit:      param.Limit,
			TotalPages: 0,
			TotalCount: 0,
		}, nil
	}

	page := param.GetSafePage()
	pageCount := param.GetSafeLimit()
	totalPages := uint(math.Ceil(float64(totalCount) / float64(pageCount)))

	query := fmt.Sprintf("%s%s\nORDER BY u.id\nLIMIT $%d OFFSET $%d",
		getUsrQuery,
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

	data, err := readSlice[domain.Usr, usrRow](rows)
	if err != nil {
		return nil, err
	}

	return &pagination.PaginationResult[domain.Usr]{
		Data:       data,
		Page:       page,
		Limit:      pageCount,
		TotalPages: totalPages,
		TotalCount: uint(totalCount),
	}, nil
}

func (r *usrRepository) Create(ctx context.Context, usr *domain.Usr) error {
	if usr == nil {
		return ErrInvalidArgument
	}

	createdAt := time.Now()
	updatedAt := time.Now()
	_, err := r.db.ExecContext(ctx, insertUsrQuery,
		usr.ID,
		usr.Role,
		usr.Firstname,
		usr.Lastname,
		usr.Username,
		createdAt,
		updatedAt,
	)
	if err != nil {
		return err
	}
	usr.CreatedAt = createdAt
	usr.UpdatedAt = updatedAt
	return nil
}

func (r *usrRepository) Update(ctx context.Context, usr *domain.Usr) error {
	if usr == nil {
		return ErrInvalidArgument
	}

	res, err := r.db.ExecContext(ctx, updateUsrQuery,
		usr.Role,
		usr.Firstname,
		usr.Lastname,
		usr.Username,
		usr.ID,
	)
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

	usr.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *usrRepository) Delete(ctx context.Context, id domain.UsrID) error {
	return apperror.ErrNotImplemented(nil)
}

func NewUsrRepository(db sqlx.ExtContext) usr.UsrRepository {
	return &usrRepository{db}
}
