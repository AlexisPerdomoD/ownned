package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"ownned/internal/adapter/outbound/cripto"
	"ownned/internal/adapter/outbound/postgres"
	"ownned/internal/app/identity"
	"ownned/internal/app/usr"
	"ownned/internal/config"
	"ownned/internal/domain"

	"github.com/go-playground/validator/v10"
)

func main() {
	cfg := config.LoadEnvConfig()

	uname := flag.String("usrname", "", "Unique username (email) of user")
	pwd := flag.String("pwd", "", "Password of the new user")
	flag.Parse()

	if *uname == "" {
		fmt.Fprintln(os.Stderr, "error: -usrname is required")
		flag.Usage()
		os.Exit(1)
	}
	if *pwd == "" {
		fmt.Fprintln(os.Stderr, "error: -pwd is required")
		flag.Usage()
		os.Exit(1)
	}

	dto := usr.CreateUsrDTO{
		Firstname: "admin",
		Lastname:  "admin",
		Username:  *uname,
		Pwd:       *pwd,
		Role:      domain.SuperUsrRole,
	}
	if err := validator.New().Struct(dto); err != nil {
		fmt.Fprintf(os.Stderr, "error: invalid user data: %v\n", err)
		os.Exit(1)
	}

	hasher := cripto.NewPwdHasherArgon2(
		cfg.PwdTime,
		cfg.PwdMemKiB,
		cfg.PwdThreads,
		cfg.PwdHashLen,
		cfg.PwdSaltLen,
	)

	db, err := postgres.NewDB(
		cfg.PgDB,
		cfg.PgHost,
		cfg.PgPort,
		cfg.PgUser,
		cfg.PgPassword,
		cfg.PgSsl,
	)
	if err != nil {
		panic(err)
	}
	defer func() { _ = db.Close() }()

	if err := postgres.MigrateUp(db.DB); err != nil {
		panic(err)
	}

	logger := slog.Default()
	factory := postgres.NewCreateUsrTxFactory(db, logger, 30*time.Second)
	useCase := usr.NewCreateUsrUseCase(
		postgres.NewUsrRepository(db),
		factory,
		hasher,
		logger,
	)

	// This operational command acts as a system administrator to bootstrap
	// the first privileged account; it does not represent an HTTP session.
	ctx := identity.Set(context.Background(), identity.Identity{Role: domain.SuperUsrRole})
	createdUsr, err := useCase.Execute(ctx, dto)
	if err != nil {
		panic(err)
	}

	fmt.Printf("%s creado exitosamente\n", createdUsr.Username)
}
