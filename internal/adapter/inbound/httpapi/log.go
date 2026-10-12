package httpapi

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
)

func logRouter(r chi.Router) {
	methodColors := map[string]string{
		"GET":    "\033[32m", // verde
		"POST":   "\033[34m", // azul
		"PUT":    "\033[33m", // amarillo
		"PATCH":  "\033[33m", // amarillo
		"DELETE": "\033[31m", // rojo
	}

	const (
		reset = "\033[0m"
		bold  = "\033[1m"
	)

	type routeEntry struct {
		methods []string
		path    string
	}
	grouped := make(map[string]*routeEntry)
	order := []string{}

	if err := chi.Walk(r,
		func(method, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
			if _, exists := grouped[route]; !exists {
				grouped[route] = &routeEntry{path: route}
				order = append(order, route)
			}
			grouped[route].methods = append(grouped[route].methods, method)
			return nil
		}); err != nil {
		fmt.Println(err)
		return
	}

	fmt.Println(bold + "registered routes:" + reset)
	for idx, path := range order {
		entry := grouped[path]
		coloredMethods := make([]string, len(entry.methods))
		for i, m := range entry.methods {
			color, ok := methodColors[m]
			if !ok {
				color = "\033[37m"
			}
			coloredMethods[i] = color + bold + m + reset
		}
		fmt.Printf("  %2d. %s%-45s%s %s\n",
			idx+1,
			bold, entry.path, reset,
			strings.Join(coloredMethods, " "),
		)
	}
}
