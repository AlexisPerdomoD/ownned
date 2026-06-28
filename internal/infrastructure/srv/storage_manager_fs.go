package srv

import (
	"context"
	"io"
	"os"
	"path/filepath"

	"ownned/internal/application/storage"
)

type storageManagerFS struct {
	Dir string
}

func (stg *storageManagerFS) Put(ctx context.Context, c storage.UploadCmd) (uint64, error) {
	fname := filepath.Join(stg.Dir, c.Key.String())
	f, err := os.OpenFile(fname, os.O_TRUNC|os.O_WRONLY|os.O_CREATE, 0o644)
	if err != nil {
		return 0, err
	}

	defer func() {
		if cerr := f.Close(); cerr != nil && err == nil {
			err = cerr
		}

		if err != nil {
			_ = os.Remove(fname)
		}
	}()

	// aseguramos que reader esté al inicio
	if seeker, ok := c.File.(io.Seeker); ok {
		if _, err = seeker.Seek(0, io.SeekStart); err != nil {
			return 0, err
		}

	}

	r := io.LimitReader(c.File, int64(c.MaxSizeBytes)+1)
	n, err := io.Copy(f, r)
	if err != nil {
		return 0, err
	}

	if n > int64(c.MaxSizeBytes) {
		err = storage.ErrFileTooLarge
	}

	return uint64(n), err
}

func (stg *storageManagerFS) Download(
	ctx context.Context,
	c storage.DownloadCmd) (io.ReadCloser, error) {

	fname := filepath.Join(stg.Dir, c.Key.String())
	f, err := os.Open(fname)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, storage.ErrFileNotFound
		}

		return nil, err
	}

	if c.Offset > 0 {
		if _, err = f.Seek(int64(c.Offset), io.SeekStart); err != nil {
			_ = f.Close()
			return nil, err
		}
	}

	if c.Limit > 0 {
		return struct {
			io.Reader
			io.Closer
		}{
			Reader: io.LimitReader(f, int64(c.Limit)),
			Closer: f,
		}, nil
	}

	return f, nil
}

func (stg *storageManagerFS) Delete(ctx context.Context, k storage.FKey) error {
	fname := filepath.Join(stg.Dir, k.String())
	if err := os.Remove(fname); err != nil && !os.IsNotExist(err) {
		return err
	}

	return nil
}

func NewStorageManagerFS(dirpath string) storage.StorageManager {
	if err := os.MkdirAll(dirpath, 0o755); err != nil {
		panic(err)
	}

	return &storageManagerFS{dirpath}
}
