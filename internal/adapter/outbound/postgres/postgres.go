// package postgres provides the implementation of the database layer using PostgreSQL (sqlx).
package postgres

import (
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"time"

	"github.com/golang-migrate/migrate/v4"
	migrationPg "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var (
	ErrInvalidArgument = errors.New("invalid argument provided")
	ErrUsrDoesNotExist = errors.New("usr was not found")
)

//go:embed migration/*.sql
var migrationDir embed.FS

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
	driver, err := migrationPg.WithInstance(db, &migrationPg.Config{StatementTimeout: time.Second})
	if err != nil {
		return err
	}

	src, err := iofs.New(migrationDir, "migration")
	command, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
	if err != nil {
		return err
	}

	err = command.Up()
	if err != nil && err != migrate.ErrNoChange {
		return err
	}

	return nil
}
