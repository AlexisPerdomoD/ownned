package postgres

import (
	"os"
	"strconv"
	"testing"

	"github.com/jmoiron/sqlx"
)

// newTestDB returns a connection to the test PostgreSQL instance.
// The test is skipped when the database is not available.
func newTestDB(t *testing.T) *sqlx.DB {
	t.Helper()

	host := os.Getenv("TEST_PG_HOST")
	if host == "" {
		t.Skip("TEST_PG_HOST not set; skipping database test")
	}
	port, _ := strconv.Atoi(os.Getenv("TEST_PG_PORT"))
	if port == 0 {
		port = 5502
	}
	user := os.Getenv("TEST_PG_USER")
	if user == "" {
		user = "postgres"
	}
	pass := os.Getenv("TEST_PG_PASSWORD")
	if pass == "" {
		pass = "password"
	}
	dbName := os.Getenv("TEST_PG_DB")
	if dbName == "" {
		dbName = "test_db"
	}
	ssl := os.Getenv("TEST_PG_SSL")
	if ssl == "" {
		ssl = "disable"
	}

	db, err := NewDB(dbName, host, port, user, pass, ssl)
	if err != nil {
		t.Skipf("test db unavailable: %v", err)
	}
	return db
}

// newTestTx begins a transaction and registers its rollback on test cleanup,
// so no test data is ever persisted in the test database.
func newTestTx(t *testing.T, db *sqlx.DB) *sqlx.Tx {
	t.Helper()
	tx, err := db.Beginx()
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback() })
	return tx
}

// Database test guidelines (future iterations):
// - One *_test.go file per repository in this package.
// - Always obtain the DB via newTestDB and wrap operations in newTestTx.
// - Never persist test data: rely on transaction rollback.
// - Prefer repository methods over direct SQL to create fixtures, so regressions
//   in those methods are caught as well.
