package usecase

import (
	"context"

	"ownned/internal/application/dto"
	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type UpdateGroupUseCase struct {
	groupRepository domain.GroupRepository
}

func (uc *UpdateGroupUseCase) Execute(ctx context.Context, groupID domain.GroupID, args *dto.UpdateGroupDTO) (*domain.Group, error) {
	usr, err := getUsrIdentity(ctx)
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

func NewUpdateGroupUseCase(gr domain.GroupRepository) *UpdateGroupUseCase {
	helper.NotNilOrPanic(gr, "GroupRepository")
	return &UpdateGroupUseCase{gr}
}
