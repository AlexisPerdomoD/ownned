package postgres

import (
	"context"
	"testing"

	"ownned/internal/domain"

	uuid "uuid"
)

func TestNodeRepository_DeleteRecursive(t *testing.T) {
	db := newTestDB(t)
	tx := newTestTx(t, db)

	repo := NewNodeRepository(tx)

	parentID := uuid.NewV7()
	childID := uuid.NewV7()
	grandID := uuid.NewV7()

	suffix := uuid.NewV7().String()[:8]
	parentPath := domain.NodePath("test" + suffix + ".root")

	parent := &domain.Node{
		ID:          parentID,
		Name:        "parent",
		Description: "",
		Path:        parentPath,
		Type:        domain.FolderNodeType,
	}
	if err := repo.Create(context.Background(), parent); err != nil {
		t.Fatalf("create parent: %v", err)
	}

	child := &domain.Node{
		ID:          childID,
		Name:        "child",
		Description: "",
		Path:        parent.Path.NewChildPath(childID),
		Type:        domain.FolderNodeType,
	}
	if err := repo.Create(context.Background(), child); err != nil {
		t.Fatalf("create child: %v", err)
	}

	grand := &domain.Node{
		ID:          grandID,
		Name:        "grand",
		Description: "",
		Path:        child.Path.NewChildPath(grandID),
		Type:        domain.FolderNodeType,
	}
	if err := repo.Create(context.Background(), grand); err != nil {
		t.Fatalf("create grandchild: %v", err)
	}

	if err := repo.Delete(context.Background(), domain.NodeID(parentID)); err != nil {
		t.Fatalf("delete parent: %v", err)
	}

	for _, id := range []uuid.UUID{parentID, childID, grandID} {
		got, err := repo.GetByID(context.Background(), domain.NodeID(id))
		if err != nil {
			t.Fatalf("get node %s: %v", id, err)
		}
		if got != nil {
			t.Fatalf("node %s still present after recursive delete", id)
		}
	}
}
