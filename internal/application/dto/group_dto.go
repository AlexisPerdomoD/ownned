package dto

import (
	"ownned/internal/domain"
	"ownned/pkg/apperror"
)

type CreateGroupDTO struct {
	Name        string `json:"name" validate:"required,min=1,max=255,excludes=\\/"`
	Description string `json:"description" validate:"max=1000"`
}

func (dto *CreateGroupDTO) Validate() error {
	return Validator.Struct(dto)
}

type UpdateGroupDTO struct {
	Name        *string `json:"name" validate:"min=1,max=255,excludes=\\/"`
	Description *string `json:"description" validate:"max=1000"`
}

func (dto *UpdateGroupDTO) Validate() error {
	if err := Validator.Struct(dto); err != nil {
		return err
	}

	if dto.Name == nil && dto.Description == nil {
		detail := make(map[string]string)
		detail["reason"] = "At least one field must be provided."
		return apperror.ErrBadRequest(detail)
	}

	return nil
}

type PopulateGroupDTO struct {
	domain.Group
	Nodes []domain.NodeGroupAttach
	Usrs  []domain.UsrGroupAccess
}
