package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ownned/internal/app/group"
	"ownned/internal/domain"

	"github.com/jmoiron/sqlx"
)

const getGroupUsrQuery string = `
SELECT 
	gu.group_id,
	gu.usr_id,
	gu.access,
	gu.assigned_at
FROM fs.group_usrs gu`

const getGroupAccessQuery string = "SELECT gu.access from fs.group_usrs gu\nWHERE gu.usr_id=$1 AND gu.group_id=$2"

const getNodeAccessByIDQuery = `
SELECT CASE MAX(
    CASE gu.access
        WHEN 'owner_access' THEN 4
        WHEN 'write_delete_access' THEN 3
        WHEN 'write_access' THEN 2
        WHEN 'read_only_access' THEN 1
        ELSE 0
    END
)
    WHEN 4 THEN 'owner_access'
	WHEN 3 THEN 'write_delete_access'
    WHEN 2 THEN 'write_access'
    WHEN 1 THEN 'read_only_access'
    ELSE NULL
END AS access
FROM fs.group_usrs gu
JOIN fs.group_nodes gn ON gn.group_id = gu.group_id
JOIN fs.nodes n_grant ON n_grant.id = gn.node_id
JOIN fs.nodes n_target ON n_target.id = $2
WHERE gu.usr_id = $1
  AND n_grant.path @> n_target.path;`

const checkNodeAccessQuery string = `
SELECT EXISTS ( 
	SELECT 1 
	FROM fs.group_usrs gu 
	JOIN fs.group_nodes gn ON gn.group_id = gu.group_id 
	JOIN fs.nodes n_grant ON n_grant.id = gn.node_id 

	WHERE gu.usr_id = $1 
	AND n_grant.path @> $2  
	AND (
		CASE gu.access
			WHEN 'owner_access' THEN 4
			WHEN 'write_delete_access' THEN 3
			WHEN 'write_access' THEN 2
			WHEN 'read_only_access' THEN 1
			ELSE 0 -- db invalid value case 
		END
		>=
		CASE $3
			WHEN 'owner_access' THEN 4
			WHEN 'write_delete_access' THEN 3
			WHEN 'write_access' THEN 2
			WHEN 'read_only_access' THEN 1
			ELSE 5 -- invalid parameter case
		END
	)
);`

const checkNodeAccessByIDQuery string = `
SELECT EXISTS (
	SELECT 1
	FROM fs.group_usrs gu
	JOIN fs.group_nodes gn ON gn.group_id = gu.group_id
	JOIN fs.nodes n_grant ON n_grant.id = gn.node_id
	JOIN fs.nodes n_target ON n_target.id = $2
	WHERE gu.usr_id = $1
	AND n_grant.path @> n_target.path
	AND (
		CASE gu.access
			WHEN 'owner_access' THEN 4
			WHEN 'write_delete_access' THEN 3
			WHEN 'write_access' THEN 2
			WHEN 'read_only_access' THEN 1
			ELSE 0
		END
		>=
		CASE $3
			WHEN 'owner_access' THEN 4
			WHEN 'write_delete_access' THEN 3
			WHEN 'write_access' THEN 2
			WHEN 'read_only_access' THEN 1
			ELSE 5
		END
	)
);`

const upsertGroupUsrQuery = `
INSERT INTO fs.group_usrs(
	group_id,
	usr_id,
	access,
	assigned_at)
VALUES (
	:group_id,
	:usr_id,
	:access,
	:assigned_at) 
ON CONFLICT(group_id, usr_id) DO UPDATE SET 
	access = EXCLUDED.access, 
	assigned_at = EXCLUDED.assigned_at`

type groupUsrRow struct {
	GroupID    domain.GroupID        `db:"group_id"`
	UsrID      domain.UsrID          `db:"usr_id"`
	Access     domain.GroupUsrAccess `db:"access"`
	AssignedAt time.Time             `db:"assigned_at"`
}

func (r *groupUsrRow) ToDomain() domain.GroupUsr {
	return domain.GroupUsr{
		GroupID:    r.GroupID,
		UsrID:      r.UsrID,
		Access:     r.Access,
		AssignDate: r.AssignedAt,
	}
}

type groupUsrRepository struct {
	db sqlx.ExtContext
}

func (r *groupUsrRepository) GetGroupAccess(
	ctx context.Context,
	usrID domain.UsrID,
	groupID domain.GroupID,
) (domain.GroupUsrAccess, error) {
	q := getGroupAccessQuery
	var access domain.GroupUsrAccess
	err := r.db.QueryRowxContext(ctx, q, usrID, groupID).Scan(&access)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.GroupReadOnlyAccess, domain.ErrNoAccess
		}

		return domain.GroupReadOnlyAccess, err
	}

	return access, nil
}

func (r *groupUsrRepository) GetNodeAccess(ctx context.Context, usrID domain.UsrID, nodeID domain.NodeID) (domain.GroupUsrAccess, error) {
	var access sql.NullString
	err := r.db.QueryRowxContext(ctx, getNodeAccessByIDQuery, usrID, nodeID).Scan(&access)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.GroupReadOnlyAccess, domain.ErrNoAccess
		}

		return domain.GroupReadOnlyAccess, err
	}

	if !access.Valid {
		return domain.GroupReadOnlyAccess, domain.ErrNoAccess
	}

	return domain.GroupUsrAccess(access.String), nil
}

func (r *groupUsrRepository) HasAccessFromPath(
	ctx context.Context,
	id domain.UsrID,
	pth domain.NodePath,
	acss domain.GroupUsrAccess,
) error {
	var hasAccess bool
	err := r.db.QueryRowxContext(ctx, checkNodeAccessQuery, id, pth, acss).Scan(&hasAccess)
	if err != nil {
		return err
	}

	if !hasAccess {
		return domain.ErrNoAccess
	}

	return nil
}

func (r *groupUsrRepository) HasAccess(
	ctx context.Context,
	usrID domain.UsrID,
	nodeID domain.NodeID,
	access domain.GroupUsrAccess,
) error {
	var hasAccess bool
	if err := r.db.QueryRowxContext(
		ctx,
		checkNodeAccessByIDQuery,
		usrID,
		nodeID,
		access).
		Scan(&hasAccess); err != nil {
		return err
	}
	if !hasAccess {
		return domain.ErrNoAccess
	}

	return nil
}

func (r *groupUsrRepository) GetByUsr(ctx context.Context, usrID domain.UsrID) ([]domain.GroupUsr, error) {
	q := fmt.Sprintf("%s\nWHERE gu.usr_id=$1", getGroupUsrQuery)
	rows, err := r.db.QueryxContext(ctx, q, usrID)
	if err != nil {
		return nil, err
	}

	defer safeClose(ctx, rows)
	// por revisar bb si funciona soy dios
	res, err := readSlice[domain.GroupUsr, groupUsrRow](rows)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (r *groupUsrRepository) Upsert(ctx context.Context, d *domain.GroupUsr) error {
	if d == nil {
		return ErrInvalidArgument
	}
	assignedAt := time.Now().UTC()
	row := groupUsrRow{
		UsrID:      d.UsrID,
		GroupID:    d.GroupID,
		Access:     d.Access,
		AssignedAt: assignedAt,
	}

	_, err := sqlx.NamedExecContext(ctx, r.db, upsertGroupUsrQuery, row)
	if err != nil {
		return err
	}

	d.AssignDate = assignedAt

	return nil
}

func (r *groupUsrRepository) UpsertAll(ctx context.Context, d []domain.GroupUsr) error {
	if len(d) == 0 {
		return ErrInvalidArgument
	}

	rows := make([]groupUsrRow, len(d))
	assignedAt := time.Now().UTC()
	for i := range d {
		rows[i].UsrID = d[i].UsrID
		rows[i].GroupID = d[i].GroupID
		rows[i].Access = d[i].Access
		rows[i].AssignedAt = assignedAt
	}

	_, err := sqlx.NamedExecContext(ctx, r.db, upsertGroupUsrQuery, rows)
	if err != nil {
		return err
	}

	for i := range d {
		d[i].AssignDate = assignedAt
	}

	return nil
}

func (r *groupUsrRepository) Delete(ctx context.Context, g domain.GroupID, u domain.UsrID) error {
	const q = `DELETE FROM fs.group_usrs WHERE group_id = $1 AND usr_id = $2`
	_, err := r.db.ExecContext(ctx, q, g, u)
	return err
}

func NewGroupUsrRepository(db sqlx.ExtContext) group.GroupUsrRepository {
	return &groupUsrRepository{db: db}
}
