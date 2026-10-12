package postgres

import (
	"context"
	"log/slog"
	"time"

	"ownned/internal/app/group"
	"ownned/internal/app/node"
	"ownned/internal/app/tx"
	"ownned/internal/app/usr"

	"github.com/jmoiron/sqlx"
)

type TxRunner struct {
	db                    *sqlx.Tx
	ctx                   context.Context
	usrRepository         usr.UsrRepository
	usrPwdRepository      usr.UsrPwdRepository
	nodeRepository        node.NodeRepository
	nodeCommentRepository node.NodeCommentRepository
	docRepository         node.DocRepository
	groupRepository       group.GroupRepository
	groupUsrRepository    group.GroupUsrRepository
	groupNodeRepository   group.GroupNodeRepository
}

func (u *TxRunner) Ctx() context.Context {
	return u.ctx
}

func (u *TxRunner) NodeRepository() node.NodeRepository {
	if u.nodeRepository == nil {
		u.nodeRepository = NewNodeRepository(u.db)
	}

	return u.nodeRepository
}

func (u *TxRunner) NodeCommentRepository() node.NodeCommentRepository {
	if u.nodeCommentRepository == nil {
		u.nodeCommentRepository = NewNodeCommentRepository(u.db)
	}

	return u.nodeCommentRepository
}

func (u *TxRunner) DocRepository() node.DocRepository {
	if u.docRepository == nil {
		u.docRepository = NewDocRepository(u.db)
	}

	return u.docRepository
}

func (u *TxRunner) UsrRepository() usr.UsrRepository {
	if u.usrRepository == nil {
		u.usrRepository = NewUsrRepository(u.db)
	}

	return u.usrRepository
}

func (u *TxRunner) UsrPwdRepository() usr.UsrPwdRepository {
	if u.usrPwdRepository == nil {
		u.usrPwdRepository = NewUsrPwdRepository(u.db)
	}

	return u.usrPwdRepository
}

func (u *TxRunner) GroupRepository() group.GroupRepository {
	if u.groupRepository == nil {
		u.groupRepository = NewGroupRepository(u.db)
	}

	return u.groupRepository
}

func (u *TxRunner) GroupUsrRepository() group.GroupUsrRepository {
	if u.groupUsrRepository == nil {
		u.groupUsrRepository = NewGroupUsrRepository(u.db)
	}

	return u.groupUsrRepository
}

func (u *TxRunner) GroupNodeRepository() group.GroupNodeRepository {
	if u.groupNodeRepository == nil {
		u.groupNodeRepository = NewGroupNodeRepository(u.db)
	}

	return u.groupNodeRepository
}

type txFactory struct {
	db      *sqlx.DB
	log     *slog.Logger
	timeout time.Duration
}

func (f *txFactory) Do(ctx context.Context, op func(t *TxRunner) error) error {
	txCtx, cancel := context.WithTimeout(ctx, f.timeout)
	defer cancel()

	tx, err := f.db.BeginTxx(txCtx, nil)
	if err != nil {
		f.log.WarnContext(txCtx, "BeginTxx failed", slog.String("err", err.Error()))
		return err
	}
	defer func() {
		if err == nil {
			return
		}

		if rbErr := tx.Rollback(); rbErr != nil {
			f.log.WarnContext(ctx, "Rollback failed", slog.String("err", rbErr.Error()))
		}
	}()
	if err = op(&TxRunner{db: tx, ctx: txCtx}); err != nil {
		f.log.DebugContext(txCtx, "error happened while executing unit of work", "err", err)
		return err
	}

	err = tx.Commit()
	return err
}

func NewUnitOfWorkFactory(db *sqlx.DB, log *slog.Logger, timeout time.Duration) tx.TxFactory[*TxRunner] {
	return &txFactory{db, log, timeout}
}
