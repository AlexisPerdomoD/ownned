package usecase

import (
	"context"
	"fmt"

	"ownned/internal/application/dto"
	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type GetGroupUseCase struct {
	accessChecker
	groupRepository domain.GroupRepository
	usrRepository   domain.UsrRepository
	nodeRepository  domain.NodeRepository
}

func (uc *GetGroupUseCase) Execute(ctx context.Context, groupID domain.GroupID) (*dto.PopulateGroupDTO, error) {
	usr, err := getUsrIdentity(ctx)
	if err != nil {
		return nil, err
	}

	group, err := uc.groupRepository.GetByID(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if group == nil {
		detail := make(map[string]string)
		detail["error"] = fmt.Sprintf("Group with ID=%s was not found", groupID)
		return nil, apperror.ErrNotFound(detail)
	}

	canDo, err := uc.hasGroupAccessTo(ctx, usr, group.ID, domain.GroupReadOnlyAccess)
	if err != nil {
		return nil, err
	}

	if !canDo {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("User does not have access to specified group ID=%s", groupID)
		return nil, apperror.ErrForbidden(detail)
	}

	// this may be concurrent called with
	// errgroup.WithContext(ctx)
	// "golang.org/x/sync/errgroup"
	usrs, err := uc.usrRepository.GetByGroup(ctx, group.ID)
	if err != nil {
		return nil, err
	}

	nodes, err := uc.nodeRepository.GetByGroup(ctx, group.ID)
	if err != nil {
		return nil, err
	}

	return &dto.PopulateGroupDTO{
		Group: *group,
		Usrs:  usrs,
		Nodes: nodes,
	}, nil
}

func NewGetGroupUseCase(
	ur domain.UsrRepository,
	nr domain.NodeRepository,
	gr domain.GroupRepository,
	gur domain.GroupUsrRepository,
) *GetGroupUseCase {
	helper.NotNilOrPanic(gr, "GroupRepository")
	helper.NotNilOrPanic(ur, "UsrRepository")
	helper.NotNilOrPanic(nr, "NodeRepository")
	helper.NotNilOrPanic(gur, "GroupUsrRepository")
	ac := accessChecker{gur}
	return &GetGroupUseCase{ac, gr, ur, nr}
}
