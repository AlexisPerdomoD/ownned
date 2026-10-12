package config

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getenvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			panic("invalid int env: " + key)
		}
		return n
	}
	return def
}

func getenvUint32(key string, def uint32) uint32 {
	if v := os.Getenv(key); v != "" {
		n, err := strconv.ParseUint(v, 10, 32)
		if err != nil {
			panic("invalid uint32 env: " + key)
		}
		return uint32(n)
	}
	return def
}

func getenvUint8(key string, def uint8) uint8 {
	if v := os.Getenv(key); v != "" {
		n, err := strconv.ParseUint(v, 10, 8)
		if err != nil {
			panic("invalid uint8 env: " + key)
		}
		return uint8(n)
	}
	return def
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("missing required env: " + key)
	}
	return v
}

func requireEnvInt(key string) int {
	v := os.Getenv(key)
	if v == "" {
		panic("missing required env: " + key)
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		panic("invalid int env: " + key)
	}
	return n
}

func getLocalStorageDir() string {
	if v := os.Getenv("LOCAL_STORAGE_DIR"); v != "" {
		return v
	}

	home, err := os.UserHomeDir()
	if err != nil {
		panic("cannot determine user home directory")
	}

	return filepath.Join(home, ".owned", "storage")
}

// EnvConfig is the struct for environment variables.
type EnvConfig struct {
	// APPLICATION
	Mode        string
	Port        int
	ServeWebApp bool

	// AUTH
	SessionSecret string
	PwdSaltLen    uint32
	PwdHashLen    uint32
	PwdMemKiB     uint32
	PwdTime       uint32
	PwdThreads    uint8

	// STORAGE
	LocalStorageDir string

	// DATABASE
	PgHost         string
	PgPort         int
	PgUser         string
	PgPassword     string
	PgDB           string
	PgSsl          string
	TestPgHost     string
	TestPgPort     int
	TestPgUser     string
	TestPgPassword string
	TestPgDB       string
	TestPgSsl      string
}

func LoadEnvConfig() *EnvConfig {
	return &EnvConfig{
		Mode:            getenv("MODE", "local"),
		Port:            getenvInt("PORT", 3000),
		ServeWebApp:     strings.ToLower(getenv("SERVE_WEB_APP", "true")) == "true",
		LocalStorageDir: getLocalStorageDir(),
		SessionSecret:   requireEnv("SESSION_SECRET"),
		PwdSaltLen:      getenvUint32("PWD_SALT_LEN", 16),
		PwdHashLen:      getenvUint32("PWD_HASH_LEN", 32),
		PwdMemKiB:       getenvUint32("PWD_MEM_KIB", 64*1024),
		PwdTime:         getenvUint32("PWD_TIME", 3),
		PwdThreads:      getenvUint8("PWD_THREADS", 4),
		PgHost:          requireEnv("PG_HOST"),
		PgPort:          requireEnvInt("PG_PORT"),
		PgUser:          requireEnv("PG_USER"),
		PgPassword:      requireEnv("PG_PASSWORD"),
		PgDB:            requireEnv("PG_DB"),
		PgSsl:           requireEnv("PG_SSL"),
		TestPgHost:      requireEnv("TEST_PG_HOST"),
		TestPgPort:      requireEnvInt("TEST_PG_PORT"),
		TestPgUser:      requireEnv("TEST_PG_USER"),
		TestPgPassword:  requireEnv("TEST_PG_PASSWORD"),
		TestPgDB:        requireEnv("TEST_PG_DB"),
		TestPgSsl:       requireEnv("TEST_PG_SSL"),
	}
}
