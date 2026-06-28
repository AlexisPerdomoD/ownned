package srv

import (
	"testing"
	"time"

	"ownned/internal/application/auth"
	"ownned/internal/domain"
)

func newTestJWTManager() *jwtManagerST {
	return &jwtManagerST{
		secret: []byte("test-secret-key-32-chars!!"),
		exp:    time.Hour,
		iss:    "test-issuer",
	}
}

func TestJWTManagerST_GenerateAccessToken(t *testing.T) {
	manager := newTestJWTManager()

	t.Run("generates valid token", func(t *testing.T) {
		payload := auth.JWTAccessPayload{
			UsrID: "user-123",
			Role:  domain.SuperUsrRole,
		}

		token, err := manager.GenerateAccessToken(payload)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(token) == 0 {
			t.Fatal("token should not be empty")
		}
	})

	t.Run("generates token with different payloads", func(t *testing.T) {
		token1, _ := manager.GenerateAccessToken(auth.JWTAccessPayload{
			UsrID: "user-1",
			Role:  domain.SuperUsrRole,
		})
		token2, _ := manager.GenerateAccessToken(auth.JWTAccessPayload{
			UsrID: "user-2",
			Role:  domain.NormalUsrRole,
		})

		if token1 == token2 {
			t.Fatal("tokens should be different for different payloads")
		}
	})
}

func TestJWTManagerST_ValidateAccessToken(t *testing.T) {
	manager := newTestJWTManager()

	t.Run("validates correct token", func(t *testing.T) {
		payload := auth.JWTAccessPayload{
			UsrID: "user-456",
			Role:  domain.NormalUsrRole,
		}

		token, err := manager.GenerateAccessToken(payload)
		if err != nil {
			t.Fatalf("failed to generate token: %v", err)
		}

		result, err := manager.ValidateAccessToken(token)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.UsrID != payload.UsrID {
			t.Errorf("expected usr_id %s, got %s", payload.UsrID, result.UsrID)
		}

		if result.Role != payload.Role {
			t.Errorf("expected role %s, got %s", payload.Role, result.Role)
		}
	})

	t.Run("returns ErrInvalidToken for malformed token", func(t *testing.T) {
		_, err := manager.ValidateAccessToken("malformed.token.here")
		if err != auth.ErrInvalidToken {
			t.Errorf("expected ErrInvalidToken, got %v", err)
		}
	})

	t.Run("returns ErrInvalidToken for invalid signature", func(t *testing.T) {
		token, _ := manager.GenerateAccessToken(auth.JWTAccessPayload{
			UsrID: "user-1",
			Role:  domain.NormalUsrRole,
		})

		otherManager := NewJWTManagerST(
			[]byte("different-secret-key-32!!"),
			time.Hour,
			"other-issuer",
		)

		_, err := otherManager.ValidateAccessToken(token)
		if err != auth.ErrInvalidToken {
			t.Errorf("expected ErrInvalidToken, got %v", err)
		}
	})

	t.Run("returns ErrInvalidToken for wrong signing method", func(t *testing.T) {
		token := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3JfaWQiOiIxMjM0IiwiZXhwIjoxNzA0MDgwMDAwfQ.invalid"

		_, err := manager.ValidateAccessToken(token)
		if err != auth.ErrInvalidToken {
			t.Errorf("expected ErrInvalidToken, got %v", err)
		}
	})

	t.Run("returns ErrInvalidToken for empty token", func(t *testing.T) {
		_, err := manager.ValidateAccessToken("")
		if err != auth.ErrInvalidToken {
			t.Errorf("expected ErrInvalidToken, got %v", err)
		}
	})

	t.Run("returns ErrInvalidToken for token with invalid claims", func(t *testing.T) {
		token := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

		_, err := manager.ValidateAccessToken(token)
		if err != auth.ErrInvalidToken {
			t.Errorf("expected ErrInvalidToken, got %v", err)
		}
	})
}

func TestJWTManagerST_ValidateAccessToken_Expired(t *testing.T) {
	manager := NewJWTManagerST(
		[]byte("test-secret-key-32-chars!!"),
		-time.Hour,
		"test-issuer",
	)

	t.Run("returns ErrExpiredToken for expired token", func(t *testing.T) {
		token, err := manager.GenerateAccessToken(auth.JWTAccessPayload{
			UsrID: "user-123",
			Role:  domain.SuperUsrRole,
		})
		if err != nil {
			t.Fatalf("failed to generate token: %v", err)
		}

		_, err = manager.ValidateAccessToken(token)
		if err != auth.ErrExpiredToken {
			t.Errorf("expected ErrExpiredToken, got %v", err)
		}
	})
}

func TestJWTManagerST_Integration(t *testing.T) {
	manager := newTestJWTManager()

	t.Run("full workflow: generate then validate", func(t *testing.T) {
		payload := auth.JWTAccessPayload{
			UsrID: "integration-user-789",
			Role:  domain.SuperUsrRole,
		}

		token, err := manager.GenerateAccessToken(payload)
		if err != nil {
			t.Fatalf("GenerateAccessToken failed: %v", err)
		}

		result, err := manager.ValidateAccessToken(token)
		if err != nil {
			t.Fatalf("ValidateAccessToken failed: %v", err)
		}

		if result.UsrID != payload.UsrID {
			t.Errorf("expected usr_id %s, got %s", payload.UsrID, result.UsrID)
		}

		if result.Role != payload.Role {
			t.Errorf("expected role %s, got %s", payload.Role, result.Role)
		}
	})

	t.Run("works with different roles", func(t *testing.T) {
		roles := []domain.UsrRole{domain.SuperUsrRole, domain.NormalUsrRole, domain.LimitedUsrRole}

		for _, role := range roles {
			payload := auth.JWTAccessPayload{
				UsrID: "user-role-test",
				Role:  role,
			}

			token, err := manager.GenerateAccessToken(payload)
			if err != nil {
				t.Fatalf("GenerateAccessToken failed for role %s: %v", role, err)
			}

			result, err := manager.ValidateAccessToken(token)
			if err != nil {
				t.Fatalf("ValidateAccessToken failed for role %s: %v", role, err)
			}

			if result.Role != role {
				t.Errorf("expected role %s, got %s", role, result.Role)
			}
		}
	})
}

func TestJWTManagerST_ImplementsInterface(t *testing.T) {
	var _ auth.JWTManager = (*jwtManagerST)(nil)
}
