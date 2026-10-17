package group

import (
	"context"
	"ownned/internal/app/apperror"
	"ownned/internal/domain"
)

type GetGroupUseCase struct {
	accessChecker
	groups GroupRepository
	usrs   UsrLookup
	nodes  NodeLookup
}

func NewGetGroupUseCase(
	groups GroupRepository,
	groupUsrs GroupUsrRepository,
	usrs UsrLookup,
	nodes NodeLookup,
) *GetGroupUseCase {
	return &GetGroupUseCase{
		groupUsrs: groupUsrs,
		groups:    groups,
		usrs:      usrs,
		nodes:     nodes,
	}
}

func (uc *GetGroupUseCase) Execute(ctx context.Context, groupID domain.GroupID) (*PopulateGroup, error) {
	yes, err := uc.HasGroupAccessTo(ctx, groupID, domain.GroupReadOnlyAccess)
	if err != nil {
		return nil, err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to specified group"
		return nil, apperror.ErrForbidden(detail)
	}

	group, err := uc.groups.GetByID(ctx, groupID)
	if err != nil {
		return nil, err
	}

	if group == nil {
		return nil, apperror.ErrIlegalDBState(nil)
	}

	usrs, err := uc.usrs.GetByGroupID(ctx, group.ID)
	if err != nil {
		return nil, err
	}

	nodes, err := uc.nodes.GetByGroupID(ctx, group.ID)
	if err != nil {
		return nil, err
	}

	resp := PopulateGroup{
		Group: *group,
		Usrs:  usrs,
		Nodes: nodes,
	}

	return &resp, nil
}
