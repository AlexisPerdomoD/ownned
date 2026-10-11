// Package storage provides required services contract for specific implementations.
package storage

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"io"
)

type FKey = uuid.UUID

var (
	ErrFileNotFound = errors.New("file not found")
	ErrFileTooLarge = errors.New("file too large")
)

// UploadCmd is the struct for uploading files to the storage.
//
// - Key is the unique identifier for the file.
//
// - MaxSizeBytes is the maximum allowed number of bytes to read from File.
// If the stream exceeds this limit, the upload fails with ErrFileTooLarge.
// A value of 0 means unlimited.
//
// - File is the reader for the file to upload.
type UploadCmd struct {
	Key          FKey
	MaxSizeBytes uint64
	File         io.Reader
}

// DownloadCmd is the struct for downloading files from the storage.
//
// - Key is the unique identifier for the file.
// - offset is the offset from where to start reading the file.
// - limit is the maximum number of bytes to read from the file.
// If the limit is greater than the file size or zero only the file size will be read.
type DownloadCmd struct {
	Key    FKey
	Offset uint64
	Limit  uint64
}

// StorageManager is the interface for the storage manager responsabilities.
// It is responsible for uploading and downloading files from the storage.
type StorageManager interface {
	// Get returns the file for the given key command.
	// If the file is not found, returns ErrFileNotFound.
	Download(ctx context.Context, key DownloadCmd) (io.ReadCloser, error)
	// Upload uploads the file to the storage.
	// If some file already exists with the same key it will be overwritten.
	// Returns the size of the uploaded file in bytes or an error.
	Put(ctx context.Context, args UploadCmd) (uint64, error)
	// Delete deletes the file for the given key.
	// If the file is not found, returns ErrFileNotFound.
	Delete(ctx context.Context, key FKey) error
}
