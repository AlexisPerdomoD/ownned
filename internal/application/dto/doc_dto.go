package dto

import (
	"io"

	"ownned/internal/domain"
)

type CreateDocInputDTO struct {
	ParentID     domain.NodeID `json:"parentID" validate:"required"`
	Filename     string        `json:"filename" validate:"required,min=1"`
	Description  string        `json:"description" validate:"max=255"`
	ExpectedSize uint64        `json:"size" validate:"required,gte=0"`
	Mimetype     string        `json:"mimetype" validate:"required,max=255"`
	File         io.ReadCloser `json:"file" validate:"required"`
}

func (dto *CreateDocInputDTO) Validate() error {
	return Validator.Struct(dto)
}
