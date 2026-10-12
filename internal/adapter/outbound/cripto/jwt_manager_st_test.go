package cripto

import (
	"errors"
	"testing"
	"time"
	"uuid"

	appauth "ownned/internal/app/auth"
	"ownned/internal/app/identity"
	"ownned/internal/domain"

	"github.com/golang-jwt/jwt/v5"
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
	payload := identity.Identity{
		ID:   uuid.New(),
		Role: domain.SuperUsrRole,
	}

	token, err := manager.GenerateAccessToken(payload)
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}
	if token == "" {
		t.Fatal("GenerateAccessToken() returned an empty token")
	}

	result, err := manager.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("ValidateAccessToken() error = %v", err)
	}
	if result == nil {
		t.Fatal("ValidateAccessToken() returned a nil identity")
	}
	if result.ID != payload.ID || result.Role != payload.Role {
		t.Errorf("round-trip identity = %+v, want %+v", result, payload)
	}
}

func TestJWTManagerST_GenerateAccessToken_DifferentPayloads(t *testing.T) {
	manager := newTestJWTManager()
	first, err := manager.GenerateAccessToken(identity.Identity{
		ID:   uuid.New(),
		Role: domain.SuperUsrRole,
	})
	if err != nil {
		t.Fatalf("GenerateAccessToken(first) error = %v", err)
	}
	second, err := manager.GenerateAccessToken(identity.Identity{
		ID:   uuid.New(),
		Role: domain.NormalUsrRole,
	})
	if err != nil {
		t.Fatalf("GenerateAccessToken(second) error = %v", err)
	}
	if first == second {
		t.Fatal("tokens for different identities should differ")
	}
}

func TestJWTManagerST_ValidateAccessToken_Invalid(t *testing.T) {
	manager := newTestJWTManager()
	validToken, err := manager.GenerateAccessToken(identity.Identity{
		ID:   uuid.New(),
		Role: domain.NormalUsrRole,
	})
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	wrongSigningMethodToken, err := jwt.NewWithClaims(jwt.SigningMethodHS384, &accessClaims{
		UsrID: uuid.NewV7().String(),
		Role:  string(domain.NormalUsrRole),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}).SignedString(manager.secret)
	if err != nil {
		t.Fatalf("failed to sign wrong-method test token: %v", err)
	}

	invalidClaimsToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, &accessClaims{
		UsrID: "not-a-uuid",
		Role:  string(domain.NormalUsrRole),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}).SignedString(manager.secret)
	if err != nil {
		t.Fatalf("failed to sign invalid-claims test token: %v", err)
	}

	otherManager := NewJWTManagerST([]byte("different-secret-key-32!!"), time.Hour, "test-issuer")

	tests := []struct {
		name    string
		manager appauth.JWTManager
		token   string
	}{
		{name: "malformed token", manager: manager, token: "malformed.token.here"},
		{name: "empty token", manager: manager, token: ""},
		{name: "invalid signature", manager: otherManager, token: validToken},
		{name: "wrong signing method", manager: manager, token: wrongSigningMethodToken},
		{name: "invalid claims", manager: manager, token: invalidClaimsToken},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := test.manager.ValidateAccessToken(test.token)
			if !errors.Is(err, appauth.ErrInvalidToken) {
				t.Errorf("ValidateAccessToken() error = %v, want %v", err, appauth.ErrInvalidToken)
			}
		})
	}
}

func TestJWTManagerST_ValidateAccessToken_Expired(t *testing.T) {
	manager := NewJWTManagerST([]byte("test-secret-key-32-chars!!"), -time.Hour, "test-issuer")
	token, err := manager.GenerateAccessToken(identity.Identity{
		ID:   uuid.New(),
		Role: domain.SuperUsrRole,
	})
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	_, err = manager.ValidateAccessToken(token)
	if !errors.Is(err, appauth.ErrExpiredToken) {
		t.Errorf("ValidateAccessToken() error = %v, want %v", err, appauth.ErrExpiredToken)
	}
}

func TestJWTManagerST_ValidateAccessToken_Roles(t *testing.T) {
	manager := newTestJWTManager()
	roles := []domain.UsrRole{
		domain.SuperUsrRole,
		domain.NormalUsrRole,
		domain.LimitedUsrRole,
	}

	for _, role := range roles {
		t.Run(string(role), func(t *testing.T) {
			payload := identity.Identity{ID: uuid.New(), Role: role}
			token, err := manager.GenerateAccessToken(payload)
			if err != nil {
				t.Fatalf("GenerateAccessToken() error = %v", err)
			}

			result, err := manager.ValidateAccessToken(token)
			if err != nil {
				t.Fatalf("ValidateAccessToken() error = %v", err)
			}
			if result == nil {
				t.Fatal("ValidateAccessToken() returned a nil identity")
			}
			if result.ID != payload.ID || result.Role != payload.Role {
				t.Errorf("validated identity = %+v, want %+v", result, payload)
			}
		})
	}
}

func TestJWTManagerST_ImplementsInterface(t *testing.T) {
	var _ appauth.JWTManager = (*jwtManagerST)(nil)
}
