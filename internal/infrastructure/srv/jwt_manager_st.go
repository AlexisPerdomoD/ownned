package srv

import (
	"errors"
	"time"

	"ownned/internal/application/auth"
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

func (m *jwtManagerST) GenerateAccessToken(payload auth.JWTAccessPayload) (string, error) {
	now := time.Now()

	claims := &accessClaims{
		UsrID: payload.UsrID,
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

func (m *jwtManagerST) ValidateAccessToken(token string) (*auth.JWTAccessPayload, error) {
	parsedToken, err := jwt.ParseWithClaims(token, &accessClaims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, auth.ErrInvalidToken
		}
		return m.secret, nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, auth.ErrExpiredToken
		}

		return nil, auth.ErrInvalidToken
	}

	claims, ok := parsedToken.Claims.(*accessClaims)
	if !ok {
		return nil, auth.ErrInvalidToken
	}

	return &auth.JWTAccessPayload{
		UsrID: claims.UsrID,
		Role:  domain.UsrRole(claims.Role),
	}, nil
}

func NewJWTManagerST(secret []byte, exp time.Duration, iss string) auth.JWTManager {
	return &jwtManagerST{
		secret: secret,
		exp:    exp,
		iss:    iss,
	}
}
