package httpapi

import (
	"encoding/json"
	"net/http"
)

// writeJSON writes a json response expenting a struct type body
func writeJSON(w http.ResponseWriter, code int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(body); err != nil {

	}
}
