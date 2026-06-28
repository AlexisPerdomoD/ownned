package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"ownned/internal/application/dto"
	"ownned/internal/application/usecase"
	"ownned/internal/domain"
	"ownned/internal/infrastructure/config"
	"ownned/internal/infrastructure/db/pg"
	"ownned/internal/infrastructure/srv"
)

func main() {
	cfg := config.LoadEnvConfig()
	// SERVICES

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

	usrDTO := dto.CreateUsrDTO{
		Firstname: "admin",
		Lastname:  "admin",
		Username:  *uname,
		Pwd:       *pwd,
		Role:      domain.SuperUsrRole,
		Access:    make([]dto.CreateAccessDTO, 0),
	}

	if err := usrDTO.Validate(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %e", err)
		flag.Usage()
		os.Exit(1)
	}

	hasher := srv.NewPwdHasherArgon2(
		cfg.PwdTime,
		cfg.PwdMemKiB,
		cfg.PwdThreads,
		cfg.PwdHashLen,
		cfg.PwdSaltLen,
	)

	db, err := pg.NewDB(
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

	if err := pg.MigrateUp(db.DB); err != nil {
		panic(err)
	}
	ur := pg.NewUsrRepository(db)
	uowFactory := pg.NewUnitOfWorkFactory(db, slog.Default(), time.Second*30)
	uc := usecase.NewCreateUsrUseCase(ur, uowFactory, hasher, slog.Default())

	ctx := context.Background()
	usr, err := uc.Execute(ctx, usrDTO)
	if err != nil {
		panic(err)
	}

	fmt.Printf("%s creado exitosamente", usr.Username)
}
