package postgres

import (
	"context"
	"database/sql"

	"ownned/internal/app/apperror"
	"ownned/internal/app/usr"
	"ownned/internal/domain"

	"github.com/jmoiron/sqlx"
)

const upsertUsrPwdQuery string = `
INSERT INTO fs.usr_pwds(
	usr_id,
	pwd
) VALUES ($1, $2) 
ON CONFLICT (usr_id) 
DO UPDATE SET pwd = EXCLUDED.pwd`

const getUsrPwdQuery string = `SELECT pwd from fs.usr_pwds where usr_id=$1`

type usrPwdRepository struct {
	db sqlx.ExtContext
}

func (r *usrPwdRepository) SetPwd(ctx context.Context, id domain.UsrID, pwd []byte) error {
	if pwd == nil {
		return ErrInvalidArgument
	}

	_, err := r.db.ExecContext(ctx, upsertUsrPwdQuery, id, pwd)
	if err != nil && err == sql.ErrNoRows {
		return apperror.ErrNotFound(nil)
	}

	return err
}

func (r *usrPwdRepository) GetPwd(ctx context.Context, id domain.UsrID) ([]byte, error) {
	var pwd []byte
	err := r.db.QueryRowxContext(ctx, getUsrPwdQuery, id).Scan(&pwd)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, apperror.ErrNotFound(nil)
		}

		return nil, err
	}

	return pwd, nil
}

func NewUsrPwdRepository(db sqlx.ExtContext) usr.UsrPwdRepository {
	return &usrPwdRepository{db}
}
