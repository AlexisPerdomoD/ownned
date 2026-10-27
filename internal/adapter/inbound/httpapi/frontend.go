package httpapi

import (
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/go-chi/chi/v5"
)

// RegisterFrontend mounts the frontend assets from the embeddedFiles FS
func RegisterFrontend(r chi.Router, embeddedFiles fs.FS) {
	distFS, err := fs.Sub(embeddedFiles, "app/dist")
	if err != nil {
		panic(err)
	}

	distServer := http.FileServer(http.FS(distFS))

	r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if info, err := fs.Stat(distFS, name); err == nil && !info.IsDir() {
			distServer.ServeHTTP(w, r)
			return
		}

		index, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			http.Error(w, "Index not found in embedded files", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(index)
	}))
}
