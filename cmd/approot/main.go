package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"


	"ownned/internal/domain"
	"ownned/internal/infrastructure/config"
	"ownned/internal/infrastructure/db/pg"
)

func main() {
	uname := flag.String("usrname", "", "Username of the user to create application root for")

	flag.Parse()

	if *uname == "" {
		fmt.Fprintln(os.Stderr, "error: -usrname is required")
		flag.Usage()
		os.Exit(1)
	}

	cfg := config.LoadEnvConfig()
	db, err := pg.NewDB(
		cfg.PgDB,
		cfg.PgHost,
		cfg.PgPort,
		cfg.PgUser,
		cfg.PgPassword,
		cfg.PgSsl,
	)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error: failed to connect to database")
		os.Exit(1)
	}

	if err := pg.MigrateUp(db.DB); err != nil {
		fmt.Fprintln(os.Stderr, "error: failed to migrate database")
		os.Exit(1)
	}

	usr, err := pg.NewUsrRepository(db).GetByUsername(context.Background(), *uname)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error: failed to get user")
		os.Exit(1)
	}

	if usr == nil {
		fmt.Fprintln(os.Stderr, "error: user not found")
		os.Exit(1)
	}

	rootNodeUsrID, err := uuid.NewV7()
	if err != nil {
		fmt.Fprintln(os.Stderr, "error: failed to generate uuid")
		os.Exit(1)
	}

	rootUsrGroupID, err := uuid.NewV7()
	if err != nil {
		fmt.Fprintln(os.Stderr, "error: failed to generate uuid")
		os.Exit(1)
	}

	rootNodeSharedID, err := uuid.NewV7()
	if err != nil {
		fmt.Fprintln(os.Stderr, "error: failed to generate uuid")
		os.Exit(1)
	}

	rootSharedGroupID, err := uuid.NewV7()
	if err != nil {
		fmt.Fprintln(os.Stderr, "error: failed to generate uuid")
		os.Exit(1)
	}

	rootNodeUsr := domain.Node{
		ID:          rootNodeUsrID,
		UsrID:       usr.ID,
		Name:        domain.NodePathUsrRoot.String(),
		Description: "Root folder to contain all users root folders.",
		Type:        domain.FolderNodeType,
		Path:        domain.NodePathUsrRoot,
	}

	rootusrGroup := domain.Group{
		ID:          rootUsrGroupID,
		UsrID:       usr.ID,
		Name:        "Root group for usrs root folder",
		Description: "Root group to contain all users root groups.",
	}

	rootusrGroupNode := domain.UpsertGroupNode{
		GroupID: rootUsrGroupID,
		NodeID:  rootNodeUsrID,
	}

	rootNodeShared := domain.Node{
		ID:          rootNodeSharedID,
		UsrID:       usr.ID,
		Name:        domain.NodePathSharedRoot.String(),
		Description: "Root folder to contain all shared folders.",
		Type:        domain.FolderNodeType,
		Path:        domain.NodePathSharedRoot,
	}

	rootsharedGroup := domain.Group{
		ID:          rootSharedGroupID,
		UsrID:       usr.ID,
		Name:        "Root group shared root folder",
		Description: "Root group to contain all shared root groups.",
	}

	rootsharedGroupNode := domain.UpsertGroupNode{
		GroupID: rootSharedGroupID,
		NodeID:  rootNodeSharedID,
	}

	uowFactory := pg.NewUnitOfWorkFactory(db, slog.Default(), time.Second*30)

	ctx := context.Background()
	err = uowFactory.Do(ctx, func(tx domain.UnitOfWork) error {
		if err := tx.NodeRepository().Create(tx.Ctx(), &rootNodeUsr); err != nil {
			return err
		}

		if err := tx.GroupRepository().Create(tx.Ctx(), &rootusrGroup); err != nil {
			return err
		}

		if err := tx.GroupNodeRepository().Upsert(tx.Ctx(), &rootusrGroupNode); err != nil {
			return err
		}

		if err := tx.NodeRepository().Create(tx.Ctx(), &rootNodeShared); err != nil {
			return err
		}

		if err := tx.GroupRepository().Create(tx.Ctx(), &rootsharedGroup); err != nil {
			return err
		}

		if err := tx.GroupNodeRepository().Upsert(tx.Ctx(), &rootsharedGroupNode); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "\nerror: failed to create folders roots err=%+v", err)
		os.Exit(1)
	}

	fmt.Printf("Folders roots created successfully, sumary:\n")
	for _, node := range []*domain.Node{&rootNodeUsr, &rootNodeShared} {
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
}
