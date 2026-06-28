package srv

import (
	"bytes"
	"fmt"
	"testing"

	"ownned/internal/application/auth"

	"golang.org/x/crypto/argon2"
)

func newTestHasher() *pwdHasherArgon2 {
	return &pwdHasherArgon2{
		time:    3,
		mem:     64 * 1024,
		threads: 4,
		keyLen:  32,
		saltLen: 16,
	}
}

func TestPwdHasherArgon2_Hash(t *testing.T) {
	hasher := newTestHasher()

	t.Run("hashes password correctly", func(t *testing.T) {
		hash, err := hasher.Hash([]byte("password123"))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(hash) == 0 {
			t.Fatal("hash should not be empty")
		}
	})

	t.Run("generates unique hashes for same password", func(t *testing.T) {
		hash1, _ := hasher.Hash([]byte("password123"))
		hash2, _ := hasher.Hash([]byte("password123"))

		if bytes.Equal(hash1, hash2) {
			t.Fatal("hashes should be different due to random salt")
		}
	})

	t.Run("hash format is correct", func(t *testing.T) {
		hash, _ := hasher.Hash([]byte("test"))
		parts := bytes.Split(hash, []byte{'$'})

		if len(parts) != 6 {
			t.Fatalf("expected 6 parts, got %d", len(parts))
		}

		if !bytes.Equal(parts[1], []byte("argon2id")) {
			t.Errorf("expected argon2id, got %s", parts[1])
		}

		if !bytes.HasPrefix(parts[2], []byte("v=")) {
			t.Error("expected version prefix")
		}
	})
}

func TestPwdHasherArgon2_Compare(t *testing.T) {
	hasher := newTestHasher()

	t.Run("returns nil for correct password", func(t *testing.T) {
		password := []byte("mySecurePassword123")
		hash, err := hasher.Hash(password)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		err = hasher.Compare(hash, password)
		if err != nil {
			t.Errorf("expected nil, got %v", err)
		}
	})

	t.Run("returns ErrInvalidPwd for wrong password", func(t *testing.T) {
		password := []byte("correctPassword")
		hash, _ := hasher.Hash(password)

		err := hasher.Compare(hash, []byte("wrongPassword"))
		if err != auth.ErrInvalidPwd {
			t.Errorf("expected ErrInvalidPwd, got %v", err)
		}
	})

	t.Run("returns ErrInvalidHash for invalid format", func(t *testing.T) {
		invalidHash := []byte("invalid_hash_format")

		err := hasher.Compare(invalidHash, []byte("password"))
		if err != auth.ErrInvalidHash {
			t.Errorf("expected ErrInvalidHash, got %v", err)
		}
	})

	t.Run("returns ErrInvalidHash for missing parts", func(t *testing.T) {
		invalidHash := []byte("$argon2id$v=19")

		err := hasher.Compare(invalidHash, []byte("password"))
		if err != auth.ErrInvalidHash {
			t.Errorf("expected ErrInvalidHash, got %v", err)
		}
	})

	t.Run("returns ErrInvalidHash for invalid base64 salt", func(t *testing.T) {
		invalidHash := []byte("$argon2id$v=19$m=65536,t=3,p=4$!!!invalid$hash")

		err := hasher.Compare(invalidHash, []byte("password"))
		if err != auth.ErrInvalidHash {
			t.Errorf("expected ErrInvalidHash, got %v", err)
		}
	})

	t.Run("returns ErrExpiredHashVersion for old version", func(t *testing.T) {
		hash, _ := hasher.Hash([]byte("password"))
		modifiedHash := bytes.Replace(hash, []byte("v=19"), []byte("v=16"), 1)

		err := hasher.Compare(modifiedHash, []byte("password"))
		if err != auth.ErrExpiredHashVersion {
			t.Errorf("expected ErrExpiredHashVersion, got %v", err)
		}
	})

	t.Run("returns ErrInvalidHash for non-argon2id algorithm", func(t *testing.T) {
		invalidHash := []byte("$argon2i$v=19$m=65536,t=3,p=4$YWJjZGVmZ2hpamts$bXlIaGFzaA==")

		err := hasher.Compare(invalidHash, []byte("password"))
		if err != auth.ErrInvalidHash {
			t.Errorf("expected ErrInvalidHash, got %v", err)
		}
	})

	t.Run("returns error for empty password hash", func(t *testing.T) {
		err := hasher.Compare([]byte{}, []byte("password"))
		if err != auth.ErrInvalidHash {
			t.Errorf("expected ErrInvalidHash, got %v", err)
		}
	})
}

func TestPwdHasherArgon2_RequiredReHash(t *testing.T) {
	hasher := newTestHasher()

	t.Run("returns false when params match", func(t *testing.T) {
		hash, _ := hasher.Hash([]byte("password"))

		result := hasher.RequiredReHash(hash)
		if result {
			t.Error("expected false, got true")
		}
	})

	t.Run("returns true when mem differs", func(t *testing.T) {
		hash, _ := hasher.Hash([]byte("password"))
		modifiedHash := bytes.ReplaceAll(hash, fmt.Appendf(nil, "m=%d", hasher.mem), fmt.Appendf(nil, "m=%d", hasher.mem/2))

		result := hasher.RequiredReHash(modifiedHash)
		if !result {
			t.Error("expected true, got false")
		}
	})

	t.Run("returns true when time differs", func(t *testing.T) {
		hash, _ := hasher.Hash([]byte("password"))
		modifiedHash := bytes.ReplaceAll(hash, []byte("t=1"), []byte("t=3"))

		result := hasher.RequiredReHash(modifiedHash)
		if !result {
			t.Error("expected true, got false")
		}
	})

	t.Run("returns true when threads differs", func(t *testing.T) {
		hash, _ := hasher.Hash([]byte("password"))
		modifiedHash := bytes.ReplaceAll(hash, fmt.Appendf(nil, "p=%d", hasher.threads), fmt.Appendf(nil, "p=%d", hasher.threads/2))

		result := hasher.RequiredReHash(modifiedHash)
		if !result {
			t.Error("expected true, got false")
		}
	})

	t.Run("returns true for old version", func(t *testing.T) {
		hash, _ := hasher.Hash([]byte("password"))
		modifiedHash := bytes.Replace(hash, []byte("v=19"), []byte("v=16"), 1)

		result := hasher.RequiredReHash(modifiedHash)
		if !result {
			t.Error("expected true, got false")
		}
	})

	t.Run("returns true for invalid hash", func(t *testing.T) {
		result := hasher.RequiredReHash([]byte("invalid"))
		if !result {
			t.Error("expected true for invalid hash, got false")
		}
	})
}

func TestNewPwdHasherArgon2_Panics(t *testing.T) {
	tests := []struct {
		name     string
		time     uint32
		mem      uint32
		threads  uint8
		keyLen   uint32
		saltLen  uint32
		panicMsg string
	}{
		{
			name:     "time less than 1 panics",
			time:     0,
			mem:      2 * 1024,
			threads:  1,
			keyLen:   16,
			saltLen:  16,
			panicMsg: "time must be greater than 0",
		},
		{
			name:     "mem less than 2MB panics",
			time:     1,
			mem:      1024,
			threads:  1,
			keyLen:   16,
			saltLen:  16,
			panicMsg: "mem must be greater than 2MB",
		},
		{
			name:     "threads less than 1 panics",
			time:     1,
			mem:      2 * 1024,
			threads:  0,
			keyLen:   16,
			saltLen:  16,
			panicMsg: "threads must be greater than 0",
		},
		{
			name:     "keyLen less than 16 panics",
			time:     1,
			mem:      2 * 1024,
			threads:  1,
			keyLen:   15,
			saltLen:  16,
			panicMsg: "keyLen must be greater than 16",
		},
		{
			name:     "saltLen less than 16 panics",
			time:     1,
			mem:      2 * 1024,
			threads:  1,
			keyLen:   16,
			saltLen:  15,
			panicMsg: "saltLen must be greater than 16",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r == nil {
					t.Errorf("expected panic with message: %s", tt.panicMsg)
				} else if r != tt.panicMsg {
					t.Errorf("expected panic message %q, got %q", tt.panicMsg, r)
				}
			}()

			NewPwdHasherArgon2(tt.time, tt.mem, tt.threads, tt.keyLen, tt.saltLen)
		})
	}
}

func TestPwdHasherArgon2_ImplementsInterface(t *testing.T) {
	var _ auth.PwdHasher = (*pwdHasherArgon2)(nil)
}

func TestPwdHasherArgon2_Integration(t *testing.T) {
	hasher := newTestHasher()

	t.Run("full workflow: hash then compare", func(t *testing.T) {
		password := []byte("userPassword123!")

		hash, err := hasher.Hash(password)
		if err != nil {
			t.Fatalf("Hash failed: %v", err)
		}

		err = hasher.Compare(hash, password)
		if err != nil {
			t.Fatalf("Compare failed: %v", err)
		}

		if hasher.RequiredReHash(hash) {
			t.Error("should not require rehash")
		}
	})

	t.Run("argon2 version is correct", func(t *testing.T) {
		if argon2.Version == 0 {
			t.Error("argon2 version should not be 0")
		}
	})
}
