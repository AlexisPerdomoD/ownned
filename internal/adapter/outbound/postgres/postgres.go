// package postgres provides the implementation of the database layer using PostgreSQL (sqlx).
package postgres

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/golang-migrate/migrate/v4"
	migrationPg "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var (
	ErrInvalidArgument = errors.New("invalid argument provided")
	ErrUsrDoesNotExist = errors.New("usr was not found")
)

func NewDB(
	dbName string,
	host string,
	port int,
	user string,
	password string,
	ssl string,
) (*sqlx.DB, error) {
	connection := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		host,
		port,
		user,
		password,
		dbName,
		ssl)

	db, err := sqlx.Open("postgres", connection)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func MigrateUp(db *sql.DB) error {
	timeout := 1 * time.Second
	driver, err := migrationPg.WithInstance(db, &migrationPg.Config{StatementTimeout: timeout})
	if err != nil {
		return err
	}

	wd, err := os.Getwd()
	if err != nil {
		return err
	}

	path := "file://" + filepath.Join(wd, "internal/adapter/outbound/postgres/migration")
	m, err := migrate.NewWithDatabaseInstance(path, "postgres", driver)
	if err != nil {
		return err
	}

	err = m.Up()
	if err != nil && err != migrate.ErrNoChange {
		return err
	}

	return nil
}
