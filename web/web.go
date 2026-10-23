// Package web provides the fs.FS for the web client assets (index.html, icons.svg, favicon.svg, etc.)
package web

import "embed"

//go:embed app/dist
var EmbeddedClient embed.FS
