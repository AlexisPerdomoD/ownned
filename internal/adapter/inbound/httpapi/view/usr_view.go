package view

import (
	"time"

	"ownned/internal/domain"
)

type UsrView struct {
	ID        domain.UsrID   `json:"id"`
	Role      domain.UsrRole `json:"role"`
	RoleTitle string         `json:"role_title"`
	Firstname string         `json:"firstname"`
	Lastname  string         `json:"lastname"`
	Username  string         `json:"username"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type UsrGroupAccessView struct {
	UsrView
	Access      domain.GroupUsrAccess `json:"access"`
	AccessTitle string                `json:"access_title"`
	AssignDate  time.Time             `json:"assign_date"`
}

func UsrViewFromDomain(usr *domain.Usr) UsrView {
	if usr == nil {
		return UsrView{}
	}
	return UsrView{
		ID:        usr.ID,
		Role:      usr.Role,
		RoleTitle: usr.Role.String(),
		Firstname: usr.Firstname,
		Lastname:  usr.Lastname,
		Username:  usr.Username,
		CreatedAt: usr.CreatedAt,
		UpdatedAt: usr.UpdatedAt,
	}
}

func UsrGroupAccessViewFromDomain(usr *domain.UsrGroupAccess) UsrGroupAccessView {
	if usr == nil {
		return UsrGroupAccessView{}
	}
	return UsrGroupAccessView{
		UsrView:     UsrViewFromDomain(&usr.Usr),
		Access:      usr.Access,
		AccessTitle: usr.Access.String(),
		AssignDate:  usr.AssignDate,
	}
}
