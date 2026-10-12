package decoder

import (
	"encoding/json"
	"io"

	"ownned/internal/application/dto"
)

func CreateFolderDTOFromJSON(r io.Reader) (*dto.CreateFolderDTO, error) {
	decoder := json.NewDecoder(r)
	decoder.DisallowUnknownFields()

	var d dto.CreateFolderDTO
	if err := decoder.Decode(&d); err != nil {
		return nil, err
	}

	err := d.Validate()
	if err != nil {
		return nil, err
	}

	return &d, nil
}

func CreateNodeCommentDTOFromJSON(r io.Reader) (*dto.CreateNodeCommentDTO, error) {
	decoder := json.NewDecoder(r)
	decoder.DisallowUnknownFields()

	var d dto.CreateNodeCommentDTO
	if err := decoder.Decode(&d); err != nil {
		return nil, err
	}

	err := d.Validate()
	if err != nil {
		return nil, err
	}

	return &d, nil
}

var UpdateNodeCommentDTOFromJSON = CreateNodeCommentDTOFromJSON
