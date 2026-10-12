// Package encoder contains the response functions for the transport layer
package encoder

import (
	"encoding/json"
	"net/http"

	"ownned/internal/infrastructure/transport/http/view"
)

// WriteJSON writes a json response expenting a struct type body
func WriteJSON(w http.ResponseWriter, code int, body any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	return json.NewEncoder(w).Encode(body)
}

// WriteJSONError writes a json error response after properly mapping the error
func WriteJSONError(w http.ResponseWriter, err error) error {
	httpErr := view.Err(err)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(httpErr.Code)
	return json.NewEncoder(w).Encode(httpErr)
}
