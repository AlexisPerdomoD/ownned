package decoder

import (
	"encoding/json"
	"io"
)

func ReadFromJSON[T any](b io.Reader) (*T, error) {
	var dto T
	decoder := json.NewDecoder(b)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&dto); err != nil {
		return nil, err
	}

	return &dto, nil
}
