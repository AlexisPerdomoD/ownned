package main

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"ownned/internal/adapter/outbound/cripto"
	"ownned/internal/adapter/outbound/postgres"
	"ownned/internal/app/identity"
	"ownned/internal/app/usr"
	"ownned/internal/config"
	"ownned/internal/domain"

	"github.com/go-playground/validator/v10"
	"github.com/spf13/cobra"
)

var (
	superusrName string
	superusrPwd  string
)

var superusrCmd = &cobra.Command{
	Use:   "superusr",
	Short: "Create the initial super user",
	RunE: func(cmd *cobra.Command, args []string) error {
		if superusrName == "" {
			return fmt.Errorf("-usrname is required")
		}
		if superusrPwd == "" {
			return fmt.Errorf("-pwd is required")
		}

		cfg := config.LoadEnvConfig()

		dto := usr.CreateUsrDTO{
			Firstname: "admin",
			Lastname:  "admin",
			Username:  superusrName,
			Pwd:       superusrPwd,
			Role:      domain.SuperUsrRole,
		}
		if err := validator.New().Struct(dto); err != nil {
			return fmt.Errorf("invalid user data: %w", err)
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
			return err
		}
		defer func() { _ = db.Close() }()

		if err := postgres.MigrateUp(db.DB); err != nil {
			return err
		}

		logger := slog.Default()
		factory := postgres.NewCreateUsrTxFactory(db, logger, 30*time.Second)
		useCase := usr.NewCreateUsrUseCase(
			postgres.NewUsrRepository(db),
			factory,
			hasher,
			logger,
		)

		ctx := identity.Set(context.Background(), identity.Identity{Role: domain.SuperUsrRole})
		createdUsr, err := useCase.Execute(ctx, dto)
		if err != nil {
			return err
		}

		fmt.Printf("%s creado exitosamente\n", createdUsr.Username)
		return nil
	},
}

func init() {
	superusrCmd.Flags().StringVar(&superusrName, "usrname", "", "Unique username (email) of user")
	superusrCmd.Flags().StringVar(&superusrPwd, "pwd", "", "Password of the new user")
	rootCmd.AddCommand(superusrCmd)
}