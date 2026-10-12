package cripto

import (
	"errors"
	"time"
	"uuid"

	appauth "ownned/internal/app/auth"
	"ownned/internal/app/identity"
	"ownned/internal/domain"

	"github.com/golang-jwt/jwt/v5"
)

type jwtManagerST struct {
	secret []byte
	exp    time.Duration
	iss    string
}

type accessClaims struct {
	UsrID string `json:"usr_id"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

func (m *jwtManagerST) GenerateAccessToken(payload identity.Identity) (string, error) {
	now := time.Now()

	claims := &accessClaims{
		UsrID: payload.ID.String(),
		Role:  string(payload.Role),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.iss,
			ExpiresAt: jwt.NewNumericDate(now.Add(m.exp)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

func (m *jwtManagerST) ValidateAccessToken(token string) (*identity.Identity, error) {
	parsedToken, err := jwt.ParseWithClaims(token, &accessClaims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, appauth.ErrInvalidToken
		}
		return m.secret, nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, appauth.ErrExpiredToken
		}

		return nil, appauth.ErrInvalidToken
	}

	claims, ok := parsedToken.Claims.(*accessClaims)
	if !ok {
		return nil, appauth.ErrInvalidToken
	}

	usrID, err := uuid.Parse(claims.UsrID)
	if err != nil {
		return nil, appauth.ErrInvalidToken
	}

	role := domain.UsrRole(claims.Role)
	if !role.IsValid() {
		return nil, appauth.ErrInvalidToken
	}

	return &identity.Identity{
		ID:   usrID,
		Role: role,
	}, nil
}

func NewJWTManagerST(secret []byte, exp time.Duration, iss string) appauth.JWTManager {
	return &jwtManagerST{
		secret: secret,
		exp:    exp,
		iss:    iss,
	}
}
