package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"
	"uuid"

	"ownned/internal/adapter/outbound/postgres"
	"ownned/internal/config"
	"ownned/internal/domain"

	"github.com/spf13/cobra"
)

var approotCmd = &cobra.Command{
	Use:   "approot",
	Short: "Initialize the root folders",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.LoadEnvConfig()
		db, err := postgres.NewDB(
			cfg.PgDB,
			cfg.PgHost,
			cfg.PgPort,
			cfg.PgUser,
			cfg.PgPassword,
			cfg.PgSsl,
		)
		if err != nil {
			fmt.Fprintln(os.Stderr, "error: failed to connect to database")
			return err
		}
		defer func() { _ = db.Close() }()

		if err := postgres.MigrateUp(db.DB); err != nil {
			fmt.Fprintln(os.Stderr, "error: failed to migrate database")
			return err
		}

		g := &domain.Group{
			ID:          uuid.NewV7(),
			UsrID:       nil,
			Name:        domain.GroupRootName,
			Description: "Root group to contain all users root groups.",
		}

		usrs := &domain.Node{
			ID:          uuid.NewV7(),
			UsrID:       nil,
			Name:        domain.NodePathUsrRoot.Raw(),
			Description: "Root folder to contain all users root folders.",
			Type:        domain.FolderNodeType,
			Path:        domain.NodePathUsrRoot,
		}

		shared := &domain.Node{
			ID:          uuid.NewV7(),
			UsrID:       nil,
			Name:        domain.NodePathSharedRoot.Raw(),
			Description: "Root folder to contain all shared folders.",
			Type:        domain.FolderNodeType,
			Path:        domain.NodePathSharedRoot,
		}

		nodeGroups := []domain.GroupNode{
			{
				GroupID: g.ID,
				NodeID:  usrs.ID,
			},
			{
				GroupID: g.ID,
				NodeID:  shared.ID,
			},
		}

		uowFactory := postgres.NewFullTxFactory(db, slog.Default(), 30*time.Second)
		ctx := context.Background()
		err = uowFactory.Do(ctx, func(tx *postgres.FullTx) error {
			if err := tx.GroupRepository().Create(tx.Ctx(), g); err != nil {
				return err
			}

			if err := tx.NodeRepository().Create(tx.Ctx(), usrs); err != nil {
				return err
			}

			if err := tx.NodeRepository().Create(tx.Ctx(), shared); err != nil {
				return err
			}

			return tx.GroupNodeRepository().UpsertAll(tx.Ctx(), nodeGroups)
		})
		if err != nil {
			fmt.Fprintf(os.Stderr, "\nerror: failed to create folders roots err=%+v", err)
			return err
		}

		fmt.Printf("Folders roots created successfully, summary:\n")
		for _, node := range []*domain.Node{usrs, shared} {
			fmt.Printf("\nID: %s\nName: %s\nDescription: %s\nPath: %s\nType: %s\nCreatedAt: %s\nUpdatedAt: %s\n",
				node.ID,
				node.Name,
				node.Description,
				node.Path,
				node.Type,
				node.CreatedAt,
				node.UpdatedAt,
			)
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(approotCmd)
}
