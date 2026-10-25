package httpapi

import (
	"net/http"
	"testing"

	"github.com/lib/pq"
)

func TestSqlErrorViewNodeNameConflict(t *testing.T) {
	view := sqlErrorView(&pq.Error{
		Code:       "23505",
		Constraint: "ux_nodes_parent_name",
		Detail:     "Key (subpath(path, 0, nlevel(path) - 1), name)=(root, foo) already exists.",
	})

	if view.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d", view.Code)
	}

	want := `a node with name "foo" already exists in the same directory`
	if view.Detail["reason"] != want {
		t.Fatalf("reason mismatch: %q", view.Detail["reason"])
	}

	if view.Detail["conflicting_value"] != "root, foo" {
		t.Fatalf("conflicting_value mismatch: %q", view.Detail["conflicting_value"])
	}
}

func TestSqlErrorViewUsernameConflict(t *testing.T) {
	view := sqlErrorView(&pq.Error{
		Code:       "23505",
		Constraint: "usrs_username_ux",
		Detail:     "Key (username)=(bad@example.com) already exists.",
	})

	if view.Detail["reason"] != "username is already in use (bad@example.com)" {
		t.Fatalf("reason mismatch: %q", view.Detail["reason"])
	}

	if view.Detail["conflicting_value"] != "bad@example.com" {
		t.Fatalf("conflicting_value mismatch: %q", view.Detail["conflicting_value"])
	}
}

func TestSqlErrorViewIDBasedConflictKeepsGenericReason(t *testing.T) {
	view := sqlErrorView(&pq.Error{
		Code:       "23505",
		Constraint: "docs_node_id_ux",
		Detail:     "Key (node_id)=(6ba7b810-9dad-11d1-80b4-00c04fd430c8) already exists.",
	})

	if view.Detail["reason"] != "a document is already linked to this node" {
		t.Fatalf("reason mismatch: %q", view.Detail["reason"])
	}

	if _, ok := view.Detail["conflicting_value"]; ok {
		t.Fatalf("did not expect conflicting_value for id-based conflict")
	}
}

func TestSqlErrorViewForeignKeyKeepsGenericReason(t *testing.T) {
	view := sqlErrorView(&pq.Error{
		Code:       "23503",
		Constraint: "group_usrs_user_fk",
		Detail:     `Key (usr_id)=(6ba7b810-9dad-11d1-80b4-00c04fd430c8) is still referenced from table "group_usrs".`,
	})

	if view.Detail["reason"] != "other resources depend on this one and prevent the operation" {
		t.Fatalf("reason mismatch: %q", view.Detail["reason"])
	}
}

func TestSqlErrorViewUnknownConstraintFallsBackToDetail(t *testing.T) {
	view := sqlErrorView(&pq.Error{
		Code:    "23505",
		Detail:  `Key (name)=(foo) already exists.`,
		Message: `duplicate key value violates unique constraint "something"`,
	})

	if view.Detail["reason"] != "duplicate key value violates unique constraint \"something\" (foo)" {
		t.Fatalf("reason mismatch: %q", view.Detail["reason"])
	}
}

func TestExtractSQLConflictValue(t *testing.T) {
	cases := map[string]string{
		"Key (subpath(path, 0, nlevel(path) - 1), name)=(root, foo) already exists.":                       "root, foo",
		"Key (username)=(bad@example.com) already exists.":                                                 "bad@example.com",
		`Key (usr_id)=(6ba7b810-9dad-11d1-80b4-00c04fd430c8) is still referenced from table "group_usrs".`: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
		"Failing row contains (foo, root.x, folder, 2026-01-01).":                                          "foo, root.x, folder, 2026-01-01",
		"role \"super_usr_role\" passed to the driver":                                                     "",
	}

	for detail, want := range cases {
		if got := extractSQLConflictValue(detail); got != want {
			t.Fatalf("extract %q: want %q, got %q", detail, want, got)
		}
	}
}
