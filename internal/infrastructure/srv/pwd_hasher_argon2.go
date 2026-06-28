package srv

import (
	"bytes"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"

	"ownned/internal/application/auth"

	"golang.org/x/crypto/argon2"
)

type parsedHash struct {
	version int
	mem     uint32
	time    uint32
	threads uint8
	salt    []byte
	hash    []byte
}

// pwdHasherArgon2 implements the PwdHasher interface for Argon2.
//
// - time is the number of passes over the memory. The recommended value is 3.
//
// - mem is the size of the memory in KiB. The recommended value is 64*1024.
//
// - threads is the number of threads to use. The recommended value is 4.
//
// - keyLen is the length of the resulting key in bytes. The recommended value is 32.
//
// - saltLen is the length of the salt in bytes. The recommended value is 16.
type pwdHasherArgon2 struct {
	time    uint32
	mem     uint32
	threads uint8
	keyLen  uint32
	saltLen uint32
}

func (h *pwdHasherArgon2) parseHash(hashedPassword []byte) (*parsedHash, error) {
	parts := bytes.Split(hashedPassword, []byte{'$'})
	if len(parts) != 6 ||
		!bytes.Equal(parts[1], []byte("argon2id")) {
		return nil, auth.ErrInvalidHash
	}
	var version int
	_, err := fmt.Sscanf(string(parts[2]), "v=%d", &version)
	if err != nil {
		return nil, auth.ErrInvalidHash
	}
	var mem, time uint32
	var threads uint8
	_, err = fmt.Sscanf(string(parts[3]), "m=%d,t=%d,p=%d", &mem, &time, &threads)
	if err != nil {
		return nil, auth.ErrInvalidHash
	}

	salt := make([]byte, base64.RawStdEncoding.DecodedLen(len(parts[4])))
	n, err := base64.RawStdEncoding.Decode(salt, parts[4])
	if err != nil {
		return nil, auth.ErrInvalidHash
	}

	salt = salt[:n]

	hash := make([]byte, base64.RawStdEncoding.DecodedLen(len(parts[5])))
	n, err = base64.RawStdEncoding.Decode(hash, parts[5])
	if err != nil {
		return nil, auth.ErrInvalidHash
	}

	hash = hash[:n]
	return &parsedHash{
		version: version,
		mem:     mem,
		time:    time,
		threads: threads,
		salt:    salt,
		hash:    hash,
	}, nil
}

func (h *pwdHasherArgon2) Hash(password []byte) ([]byte, error) {
	salt := make([]byte, h.saltLen)
	_, _ = rand.Read(salt) // crypto/rand.Read never fails

	rawHash := argon2.IDKey(
		password, salt, h.time, h.mem, h.threads, h.keyLen)

	encodedSalt := make([]byte, base64.RawStdEncoding.EncodedLen(len(salt)))
	encodedHash := make([]byte, base64.RawStdEncoding.EncodedLen(len(rawHash)))

	base64.RawStdEncoding.Encode(encodedHash, rawHash)
	base64.RawStdEncoding.Encode(encodedSalt, salt)
	result := fmt.Appendf(nil, "$argon2id$v=%d$m=%d,t=%d,p=%d",
		argon2.Version,
		h.mem,
		h.time,
		h.threads,
	)

	result = append(result, '$')
	result = append(result, encodedSalt...)
	result = append(result, '$')
	result = append(result, encodedHash...)

	return result, nil
}

func (h *pwdHasherArgon2) Compare(hashedPassword, password []byte) error {
	parsed, err := h.parseHash(hashedPassword)
	if err != nil {
		return err
	}

	if parsed.version != argon2.Version {
		return auth.ErrExpiredHashVersion
	}

	computed := argon2.IDKey(
		password,
		parsed.salt,
		parsed.time,
		parsed.mem,
		parsed.threads,
		uint32(len(parsed.hash)))

	if subtle.ConstantTimeCompare(computed, parsed.hash) != 1 {
		return auth.ErrInvalidPwd
	}

	return nil
}

func (h *pwdHasherArgon2) RequiredReHash(hashedPassword []byte) bool {
	parsed, err := h.parseHash(hashedPassword)
	if err != nil {
		return true
	}

	if parsed.version != argon2.Version {
		return true
	}

	return parsed.mem != h.mem || parsed.time != h.time || parsed.threads != h.threads
}

// NewPwdHasherArgon2 returns a instance of pwdHasherArgon2
//
// - time is the number of passes over the memory. The recommended value is 3.
//
// - mem is the size of the memory in KiB. The recommended value is 64*1024.
//
// - threads is the number of threads to use. The recommended value is 4.
//
// - keyLen is the length of the resulting key in bytes. The recommended value is 32.
//
// - saltLen is the length of the salt in bytes. The recommended value is 16.
func NewPwdHasherArgon2(
	time uint32,
	memKiB uint32,
	threads uint8,
	keyLen uint32,
	saltLen uint32,
) auth.PwdHasher {
	if time < 1 {
		panic("time must be greater than 0")
	}

	if memKiB < 2*1024 {
		panic("mem must be greater than 2MB")
	}

	if threads < 1 {
		panic("threads must be greater than 0")
	}

	if keyLen < 16 {
		panic("keyLen must be greater than 16")
	}

	if saltLen < 16 {
		panic("saltLen must be greater than 16")
	}

	return &pwdHasherArgon2{
		time:    time,
		mem:     memKiB,
		threads: threads,
		keyLen:  keyLen,
		saltLen: saltLen,
	}
}
