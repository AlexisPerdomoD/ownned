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

type txDB struct {
	db func() *sqlx.Tx
}

type txUsr struct {
	*txDB
	usrs    usr.UsrRepository
	usrPwds usr.UsrPwdRepository
}

func (u *txUsr) UsrRepository() usr.UsrRepository {
	if u.usrs == nil {
		u.usrs = NewUsrRepository(u.db())
	}

	return u.usrs
}

func (u *txUsr) UsrPwdRepository() usr.UsrPwdRepository {
	if u.usrPwds == nil {
		u.usrPwds = NewUsrPwdRepository(u.db())
	}

	return u.usrPwds
}

type txNode struct {
	*txDB
	nodes        node.NodeRepository
	nodeComments node.NodeCommentRepository
	docs         node.DocRepository
}

func (u *txNode) NodeRepository() node.NodeRepository {
	if u.nodes == nil {
		u.nodes = NewNodeRepository(u.db())
	}

	return u.nodes
}

func (u *txNode) NodeCommentRepository() node.NodeCommentRepository {
	if u.nodeComments == nil {
		u.nodeComments = NewNodeCommentRepository(u.db())
	}

	return u.nodeComments
}

func (u *txNode) DocRepository() node.DocRepository {
	if u.docs == nil {
		u.docs = NewDocRepository(u.db())
	}

	return u.docs
}

type txGroup struct {
	*txDB
	groups     group.GroupRepository
	groupUsrs  group.GroupUsrRepository
	groupNodes group.GroupNodeRepository
}

func (u *txGroup) GroupRepository() group.GroupRepository {
	if u.groups == nil {
		u.groups = NewGroupRepository(u.db())
	}

	return u.groups
}

func (u *txGroup) GroupUsrRepository() group.GroupUsrRepository {
	if u.groupUsrs == nil {
		u.groupUsrs = NewGroupUsrRepository(u.db())
	}

	return u.groupUsrs
}

func (u *txGroup) GroupNodeRepository() group.GroupNodeRepository {
	if u.groupNodes == nil {
		u.groupNodes = NewGroupNodeRepository(u.db())
	}

	return u.groupNodes
}

type txFactory[T tx.TxCtx] struct {
	db      *sqlx.DB
	log     *slog.Logger
	timeout time.Duration
	adapter func(ctx context.Context, db *txDB) T
}

func (f *txFactory[T]) Do(ctx context.Context, op func(t T) error) error {
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

	db := func() *sqlx.Tx {
		return tx
	}

	t := f.adapter(txCtx, &txDB{
		db: db,
	})

	if err = op(t); err != nil {
		f.log.DebugContext(txCtx, "error happened while executing unit of work", "err", err)
		return err
	}

	err = tx.Commit()
	return err
}

type innerCtx struct {
	ctx context.Context
}

func (u *innerCtx) Ctx() context.Context {
	return u.ctx
}

type FullTx struct {
	txUsr
	txNode
	txGroup
	innerCtx
}

func fullTxAdapter(ctx context.Context, txDB *txDB) *FullTx {
	return &FullTx{
		ctx:     ctx,
		txNode:  txNode{txDB: txDB},
		txUsr:   txUsr{txDB: txDB},
		txGroup: txGroup{txDB: txDB},
	}
}

func NewFullTxFactory(db *sqlx.DB, log *slog.Logger, timeout time.Duration) tx.TxFactory[*FullTx] {
	adapter := func(ctx context.Context, txDB *txDB) *FullTx {
		return &FullTx{
			ctx:     ctx,
			txNode:  txNode{txDB: txDB},
			txUsr:   txUsr{txDB: txDB},
			txGroup: txGroup{txDB: txDB},
		}
	}

	return &txFactory[*FullTx]{
		db:      db,
		log:     log,
		timeout: timeout,
		adapter: adapter,
	}
}

type createUsrTx struct {
	innerCtx
	txUsr

	nodes      usr.NodeCreator
	groups     usr.GroupRepository
	groupUsrs  usr.GroupUsrUpsertor
	groupNodes usr.GroupNodeUpsertor
}

func (u *createUsrTx) NodeCreator() usr.NodeCreator {
	if u.nodes == nil {
		u.nodes = NewNodeRepository(u.db())
	}

	return u.nodes
}

func (u *createUsrTx) GroupRepository() usr.GroupRepository {
	if u.groups == nil {
		u.groups = NewGroupRepository(u.db())
	}

	return u.groups
}

func (u *createUsrTx) GroupUsrUpsertor() usr.GroupUsrUpsertor {
	if u.groupUsrs == nil {
		u.groupUsrs = NewGroupUsrRepository(u.db())
	}

	return u.groupUsrs
}

func (u *createUsrTx) GroupNodeUpsertor() usr.GroupNodeUpsertor {
	if u.groupNodes == nil {
		u.groupNodes = NewGroupNodeRepository(u.db())
	}

	return u.groupNodes
}

func NewCreateUsrTxFactory(db *sqlx.DB, log *slog.Logger, timeout time.Duration) tx.TxFactory[usr.CreateUsrTx] {
	adapter := func(ctx context.Context, txDB *txDB) usr.CreateUsrTx {
		return &createUsrTx{
			ctx:  ctx,
			txDB: txDB,
		}
	}

	return &txFactory[usr.CreateUsrTx]{
		db:      db,
		log:     log,
		timeout: timeout,
		adapter: adapter,
	}
}

type createGroupTx struct {
	innerCtx
	txGroup
}

func NewCreateGroupTxFactory(db *sqlx.DB, log *slog.Logger, timeout time.Duration) tx.TxFactory[group.CreateGroupTx] {
	adapter := func(ctx context.Context, txDB *txDB) group.CreateGroupTx {
		return &createGroupTx{
			ctx:  ctx,
			txDB: txDB,
		}
	}

	return &txFactory[group.CreateGroupTx]{
		db:      db,
		log:     log,
		timeout: timeout,
		adapter: adapter,
	}
}

type createNodeFolderTx struct {
	innerCtx
	txNode
}

func NewCreateNodeFileTxFactory(db *sqlx.DB, log *slog.Logger, timeout time.Duration) tx.TxFactory[node.CreateNodeFileTx] {
	adapter := func(ctx context.Context, txDB *txDB) node.CreateNodeFileTx {
		return &createNodeFolderTx{
			ctx:  ctx,
			txDB: txDB,
		}
	}

	return &txFactory[node.CreateNodeFileTx]{
		db:      db,
		log:     log,
		timeout: timeout,
		adapter: adapter,
	}
}
