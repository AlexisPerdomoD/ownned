// Package decoder contains the decoders for the transport layer
package decoder

import (
	"encoding/json"
	"io"

	"ownned/internal/application/dto"
)

func CreateUsrDTOFromJSON(r io.Reader) (*dto.CreateUsrDTO, error) {
	var dto dto.CreateUsrDTO
	decoder := json.NewDecoder(r)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&dto); err != nil {
		return nil, err
	}

	return &dto, nil
}

func LoginUsrDTOFromJSON(r io.Reader) (*dto.LoginUsrDTO, error) {
	var dto dto.LoginUsrDTO
	decoder := json.NewDecoder(r)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&dto); err != nil {
		return nil, err
	}

	return &dto, nil
}
