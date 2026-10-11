// tx package represents an interface for repository persistence transaccions contract
package tx

import "context"

type TxCtx interface {
	// ctx returns the context associated with the current UnitOfWork.
	//
	// The returned context is used for all I/O operations and must respect
	// cancellation and deadlines.

	Ctx() context.Context
}

type TxFactory[Tx TxCtx] interface {
	// Do executes the given function within a transactional context.
	//
	// The provided function is executed inside a single transaction. If the
	// function returns a non-nil error, the transaction is rolled back and the
	// error is returned to the caller. If the function returns nil, the
	// transaction is committed.
	//
	// Implementations must guarantee that all repository instances obtained
	// from this UnitOfWork during the execution of the function operate on the
	// same transactional state.

	Do(ctx context.Context, fn func(Tx) error) error
}
