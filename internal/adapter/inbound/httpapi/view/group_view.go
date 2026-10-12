package view

import (
	"time"

	"ownned/internal/application/dto"
	"ownned/internal/domain"

	"github.com/google/uuid"
)

type GroupView struct {
	ID          uuid.UUID `json:"id"`
	UsrID       uuid.UUID `json:"usr_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PopulateGroupView struct {
	GroupView
	Nodes []NodeGroupAttachView `json:"nodes"`
	Usrs  []UsrGroupAccessView  `json:"usrs"`
}

func GroupViewFromDomain(group *domain.Group) GroupView {
	if group == nil {
		return GroupView{}
	}

	return GroupView{
		ID:          group.ID,
		UsrID:       group.UsrID,
		Name:        group.Name,
		Description: group.Description,
		CreatedAt:   group.CreatedAt,
		UpdatedAt:   group.UpdatedAt,
	}
}

func PopulateGroupViewFromDomain(p *dto.PopulateGroupDTO) PopulateGroupView {
	if p == nil {
		return PopulateGroupView{}
	}

	nodesView := make([]NodeGroupAttachView, len(p.Nodes))
	for i, n := range p.Nodes {
		nodesView[i] = NodeGroupAttachViewFromDomain(&n)
	}

	usrsView := make([]UsrGroupAccessView, len(p.Usrs))
	for i, u := range p.Usrs {
		usrsView[i] = UsrGroupAccessViewFromDomain(&u)
	}

	return PopulateGroupView{
		GroupView: GroupViewFromDomain(&p.Group),
		Nodes:     nodesView,
		Usrs:      usrsView,
	}
}
