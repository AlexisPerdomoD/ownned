package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"ownned/internal/adapter/outbound/postgres"
	"ownned/internal/config"

	"github.com/spf13/cobra"
)

var migrateSteps int
var migrateYes bool

var migrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Manage database migrations",
}

var migrateUpCmd = &cobra.Command{
	Use:   "up",
	Short: "Apply all pending migrations",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.LoadEnvConfig()
		db, err := postgres.NewDB(cfg.PgDB, cfg.PgHost, cfg.PgPort, cfg.PgUser, cfg.PgPassword, cfg.PgSsl)
		if err != nil {
			return err
		}
		defer func() { _ = db.Close() }()

		if err := postgres.MigrateUp(db.DB); err != nil {
			return err
		}
		fmt.Println("migrations applied")
		return nil
	},
}

var migrateDownCmd = &cobra.Command{
	Use:   "down",
	Short: "Roll back migrations",
	RunE: func(cmd *cobra.Command, args []string) error {
		if migrateSteps <= 0 {
			return fmt.Errorf("--steps must be > 0")
		}

		if !migrateYes {
			fmt.Printf("This will roll back %d migration(s). Continue? [y/N]: ", migrateSteps)
			reader := bufio.NewReader(os.Stdin)
			answer, _ := reader.ReadString('\n')
			answer = strings.TrimSpace(strings.ToLower(answer))
			if answer != "y" && answer != "yes" {
				fmt.Println("aborted")
				return nil
			}
		}

		cfg := config.LoadEnvConfig()
		db, err := postgres.NewDB(cfg.PgDB, cfg.PgHost, cfg.PgPort, cfg.PgUser, cfg.PgPassword, cfg.PgSsl)
		if err != nil {
			return err
		}
		defer func() { _ = db.Close() }()

		if err := postgres.MigrateDown(db.DB, migrateSteps); err != nil {
			return err
		}
		fmt.Printf("rolled back %d migration(s)\n", migrateSteps)
		return nil
	},
}

var migrateStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show current migration version",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.LoadEnvConfig()
		db, err := postgres.NewDB(cfg.PgDB, cfg.PgHost, cfg.PgPort, cfg.PgUser, cfg.PgPassword, cfg.PgSsl)
		if err != nil {
			return err
		}
		defer func() { _ = db.Close() }()

		version, dirty, err := postgres.MigrateVersion(db.DB)
		if err != nil {
			return err
		}
		fmt.Printf("version: %d\ndirty: %v\n", version, dirty)
		return nil
	},
}

func init() {
	migrateDownCmd.Flags().IntVar(&migrateSteps, "steps", 1, "Number of migrations to roll back")
	migrateDownCmd.Flags().BoolVar(&migrateYes, "yes", false, "Skip confirmation")

	migrateCmd.AddCommand(migrateUpCmd)
	migrateCmd.AddCommand(migrateDownCmd)
	migrateCmd.AddCommand(migrateStatusCmd)
	rootCmd.AddCommand(migrateCmd)
}