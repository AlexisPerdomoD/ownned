package auth

import "errors"

var (
	// ErrInvalidPwd is the error that represnts valid validacion process happend but the password is invalid.
	ErrInvalidPwd = errors.New("invalid password")
	// ErrInvalidHash is the error that represnts hash format is invalid.
	ErrInvalidHash = errors.New("invalid hash format")
	// ErrExpiredHashVersion is the error that represnts hash version it is not what is currently supported.
	// This means the hash is not supported anymore.
	ErrExpiredHashVersion = errors.New("expired hash version")
	// ErrDifferentConfig is the error that represnts the hash is valid but the config is different.
	// This means the hash is not supported anymore.
	ErrDifferentConfig = errors.New("conflicting config")
)

// PwdHasher is the interface for password hashing implementations of required algorithms.
type PwdHasher interface {
	// Hash returns the hashed password for the given password.
	Hash(password []byte) ([]byte, error)
	// Compare compares the given hashed password with the given password and returns nil if they match, otherwise ErrInvalidHash.
	// May return error different from ErrInvalidHash that means the comparison failed for some other reason.
	Compare(hashedPassword, password []byte) error
	// RequiredReHash returns true if the hashed password needs to be re-hashed for new policies, algorithm parameters, etc. False otherwise.
	RequiredReHash(hashedPassword []byte) bool
}
