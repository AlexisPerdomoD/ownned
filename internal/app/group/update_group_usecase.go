package group

import (
	"context"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/domain"
)

type UpdateGroupDTO struct {
	Name        *string `json:"name" validate:"min=1,max=255,excludes=\\/"`
	Description *string `json:"description" validate:"max=1000"`
}

type UpdateGroupUseCase struct {
	groupRepository GroupRepository
}

func NewUpdateGroupUseCase(group GroupRepository) *UpdateGroupUseCase {
	return &UpdateGroupUseCase{group}
}

func (uc *UpdateGroupUseCase) Execute(
	ctx context.Context,
	groupID domain.GroupID,
	args UpdateGroupDTO,
) (*domain.Group, error) {
	if args.Name == nil && args.Description == nil {
		detail := make(map[string]string)
		detail["reason"] = "At least one field must be provided."
		return nil, apperror.ErrBadRequest(detail)
	}

	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	if !usr.Role.CanCreateGroup() {
		detail := make(map[string]string)
		detail["reason"] = "User can not do this action."
		return nil, apperror.ErrForbidden(detail)
	}

	group, err := uc.groupRepository.GetByID(ctx, groupID)
	if err != nil {
		return nil, err
	}

	if group == nil {
		detail := make(map[string]string)
		detail["reason"] = "Group does not exist with ID=" + groupID.String()
		return nil, apperror.ErrNotFound(detail)
	}

	if args.Name != nil {
		group.Name = *args.Name
	}

	if args.Description != nil {
		group.Description = *args.Description
	}

	if err := uc.groupRepository.Update(ctx, group); err != nil {
		return nil, err
	}

	return group, nil
}
