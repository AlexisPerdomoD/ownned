package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"
	"time"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/auth"
	"ownned/internal/app/group"
	"ownned/internal/app/node"
	"ownned/internal/domain"

	"github.com/go-playground/validator/v10"
)

type ErrView struct {
	Code    int               `json:"code"`
	Message string            `json:"message"`
	Detail  map[string]string `json:"detail"`
}

func validationError(err validator.ValidationErrors) *ErrView {
	detail := make(map[string]string)

	detail["reason"] = "Some fields were invalid on validation process"

	for _, fe := range err {
		detail[fe.Field()] = fmt.Sprintf("failed on %s, %s", fe.Tag(), fe.Error())
	}

	return &ErrView{
		Code:    http.StatusUnprocessableEntity,
		Message: "validation failed",
		Detail:  detail,
	}
}

func appError(err *apperror.AppError) *ErrView {
	switch err.Kind {
	case apperror.ErrNotFoundInstance:
		return &ErrView{
			Code:    http.StatusNotFound,
			Message: "resource not found",
			Detail:  err.Detail,
		}

	case apperror.ErrBadRequestInstance:
		return &ErrView{
			Code:    http.StatusBadRequest,
			Message: "bad request",
			Detail:  err.Detail,
		}

	case apperror.ErrConflictInstance:
		return &ErrView{
			Code:    http.StatusConflict,
			Message: "conflict",
			Detail:  err.Detail,
		}

	case apperror.ErrForbiddenInstance:
		return &ErrView{
			Code:    http.StatusForbidden,
			Message: "forbidden",
			Detail:  err.Detail,
		}

	case apperror.ErrUnauthenticatedInstance:
		return &ErrView{
			Code:    http.StatusUnauthorized,
			Message: "unauthenticated",
			Detail:  err.Detail,
		}

	case apperror.ErrRateLimitInstance:
		return &ErrView{
			Code:    http.StatusTooManyRequests,
			Message: "too many requests",
			Detail:  err.Detail,
		}

	case apperror.ErrInternalInstance:
		return &ErrView{
			Code:    http.StatusInternalServerError,
			Message: "internal error",
			Detail:  err.Detail,
		}
	case apperror.ErrNotImplementedInstance:
		if err.Detail == nil {
			err.Detail = make(map[string]string)
			err.Detail["reason"] = "This resource is not implemented yet"
		}

		return &ErrView{
			Code:    http.StatusNotImplemented,
			Message: "not implemented yet :(",
			Detail:  err.Detail,
		}

	default:

		if err.Detail == nil {
			err.Detail = make(map[string]string)
			err.Detail["reason"] = "Some unknown error has happend, please report it."
		}

		return &ErrView{
			Code:    http.StatusInternalServerError,
			Message: "unknown error",
			Detail:  err.Detail,
		}
	}
}

func errView(err error) *ErrView {
	if err == nil {
		elog.Warn("empty error provided", "stack", debug.Stack())
		return &ErrView{}
	}

	if errors.Is(err, auth.ErrExpiredToken) || errors.Is(err, auth.ErrInvalidToken) {
		detail := make(map[string]string)
		detail["reason"] = err.Error()
		return &ErrView{
			Code:    http.StatusUnauthorized,
			Message: "invalid credentials",
			Detail:  detail,
		}
	}

	if appErr, ok := errors.AsType[*apperror.AppError](err); ok {
		view := appError(appErr)
		if view.Code >= 500 {
			elog.Error("error happened", "err", err, "stack", debug.Stack())
		}
		return view
	}

	if validationErrors, ok := errors.AsType[validator.ValidationErrors](err); ok {
		return validationError(validationErrors)
	}

	elog.Error("unexpected error happened", "err", err, "stack", debug.Stack())

	return &ErrView{
		Code:    http.StatusInternalServerError,
		Message: "unexpected error",
	}
}

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

func usrViewFromDomain(usr *domain.Usr) UsrView {
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

func usrGroupAccessViewFromDomain(usr *domain.UsrGroupAccess) UsrGroupAccessView {
	if usr == nil {
		return UsrGroupAccessView{}
	}

	return UsrGroupAccessView{
		UsrView:     usrViewFromDomain(&usr.Usr),
		Access:      usr.Access,
		AccessTitle: usr.Access.String(),
		AssignDate:  usr.AssignDate,
	}
}

type DocView struct {
	ID          domain.DocID  `json:"id"`
	NodeID      domain.NodeID `json:"node_id"`
	Description string        `json:"description"`
	Title       string        `json:"title"`
	Filename    string        `json:"filename"`
	MimeType    string        `json:"mime_type"`
	SizeInBytes uint64        `json:"size_in_bytes"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

func docViewFromDomain(d *domain.Doc) DocView {
	if d == nil {
		return DocView{}
	}

	return DocView{
		ID:          d.ID,
		NodeID:      d.NodeID,
		Description: d.Description,
		Title:       d.Title,
		Filename:    d.Filename,
		MimeType:    d.MimeType,
		SizeInBytes: d.SizeInBytes,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}

type NodeView struct {
	ID          domain.NodeID          `json:"id"`
	UsrID       *domain.UsrID          `json:"usr_id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Type        domain.NodeType        `json:"type"`
	Path        domain.NodePath        `json:"path"`
	DisplayPath string                 `json:"display_path"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	Access      *domain.GroupUsrAccess `json:"access_level,omitempty"` // Note: include only for specific usecases
	Children    []NodeView             `json:"children"`               // Note: include only for specific usecases
	Doc         *DocView               `json:"doc,omitempty"`          // Note: include only for specific usecases
}

func nodeViewFromDomain(d *domain.Node) NodeView {
	if d == nil {
		return NodeView{}
	}

	return NodeView{
		ID:          d.ID,
		UsrID:       d.UsrID,
		Name:        d.Name,
		Description: d.Description,
		Type:        d.Type,
		Path:        d.Path,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}

func nodeFolderViewFromDomain(n *node.FolderNode) NodeView {
	if n == nil {
		return NodeView{}
	}

	chldrView := make([]NodeView, len(n.Children))
	for i := range n.Children {
		chldrView[i] = nodeViewFromNodeLike(n.Children[i])
	}

	return NodeView{
		ID:          n.ID,
		UsrID:       n.UsrID,
		Name:        n.Name,
		Description: n.Description,
		Type:        n.Type,
		Path:        n.Path,
		DisplayPath: n.DisplayPath,
		Access:      n.GetAccess(),
		CreatedAt:   n.CreatedAt,
		UpdatedAt:   n.UpdatedAt,
		Children:    chldrView,
	}
}

func nodeFileViewFromDomain(n *node.FileNode) NodeView {
	if n == nil {
		return NodeView{}
	}

	return NodeView{
		ID:          n.ID,
		UsrID:       n.UsrID,
		Name:        n.Name,
		Description: n.Description,
		Type:        n.Type,
		Path:        n.Path,
		DisplayPath: n.DisplayPath,
		Access:      n.GetAccess(),
		CreatedAt:   n.CreatedAt,
		UpdatedAt:   n.UpdatedAt,
		Doc:         new(docViewFromDomain(&n.Doc)),
	}
}

func nodeViewFromNodeLike(n node.NodeLike) NodeView {
	if n == nil || n.Get() == nil {
		return NodeView{}
	}

	switch val := n.(type) {
	case *node.FolderNode:
		return nodeFolderViewFromDomain(val)

	case *node.FileNode:
		return nodeFileViewFromDomain(val)

	default:
		view := nodeViewFromDomain(n.Get())
		view.DisplayPath = n.GetDisplayPath()
		view.Access = n.GetAccess()
		return view
	}
}

type NodeCommentView struct {
	ID        domain.NodeCommentID `json:"id"`
	NodeID    domain.NodeID        `json:"node_id"`
	UsrID     domain.UsrID         `json:"usr_id"`
	Content   string               `json:"content"`
	CreatedAt time.Time            `json:"created_at"`
	UpdatedAt time.Time            `json:"updated_at"`
}

func nodeCommentViewFromDomain(c *domain.NodeComment) NodeCommentView {
	if c == nil {
		return NodeCommentView{}
	}
	return NodeCommentView{
		ID:        c.ID,
		NodeID:    c.NodeID,
		UsrID:     c.UsrID,
		Content:   c.Content,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
}

type GroupView struct {
	ID          uuid.UUID  `json:"id"`
	UsrID       *uuid.UUID `json:"usr_id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type PopulateGroupView struct {
	GroupView
	Nodes []NodeView           `json:"nodes"`
	Usrs  []UsrGroupAccessView `json:"usrs"`
}

func groupViewFromDomain(group *domain.Group) GroupView {
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

func populateGroupViewFromDomain(p *group.PopulateGroup) PopulateGroupView {
	if p == nil {
		return PopulateGroupView{}
	}

	nodesView := make([]NodeView, len(p.Nodes))
	for i := range p.Nodes {
		nodesView[i] = nodeViewFromDomain(&p.Nodes[i])
	}

	usrsView := make([]UsrGroupAccessView, len(p.Usrs))
	for i := range p.Usrs {
		usrsView[i] = usrGroupAccessViewFromDomain(&p.Usrs[i])
	}

	return PopulateGroupView{
		GroupView: groupViewFromDomain(&p.Group),
		Nodes:     nodesView,
		Usrs:      usrsView,
	}
}
