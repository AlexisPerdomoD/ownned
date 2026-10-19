package httpapi

import (
	"net/http"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/domain"

	"github.com/go-chi/chi/v5"
)

type GroupHandler struct {
	getGroup        *group.GetGroupUseCase
	paginateGroup   *group.PaginateGroupUseCase
	createGroup     *group.CreateGroupUseCase
	updateGroup     *group.UpdateGroupUseCase
	deleteGroup     *group.DeleteGroupUseCase
	createGroupNode *group.CreateGroupNodeUseCase
	deleteGroupNode *group.DeleteGroupNodeUseCase
	upsertGroupUsr  *group.UpsertGroupUsrUseCase
	deleteGroupUsr  *group.DeleteGroupUsrUseCase
	am              *AuthMiddleware
}

func NewGroupHandler(
	getGroup *group.GetGroupUseCase,
	paginateGroup *group.PaginateGroupUseCase,
	createGroup *group.CreateGroupUseCase,
	updateGroup *group.UpdateGroupUseCase,
	deleteGroup *group.DeleteGroupUseCase,
	createGroupNode *group.CreateGroupNodeUseCase,
	deleteGroupNode *group.DeleteGroupNodeUseCase,
	upsertGroupUsr *group.UpsertGroupUsrUseCase,
	deleteGroupUsr *group.DeleteGroupUsrUseCase,
	am *AuthMiddleware,
) *GroupHandler {
	return &GroupHandler{
		getGroup:        getGroup,
		paginateGroup:   paginateGroup,
		createGroup:     createGroup,
		updateGroup:     updateGroup,
		deleteGroup:     deleteGroup,
		createGroupNode: createGroupNode,
		deleteGroupNode: deleteGroupNode,
		upsertGroupUsr:  upsertGroupUsr,
		deleteGroupUsr:  deleteGroupUsr,
		am:              am,
	}
}

func (h *GroupHandler) getGroupHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		resp := errView(apperror.ErrBadRequest(detail))

		writeJSON(w, resp.Code, resp)
		return
	}

	group, err := h.getGroup.Execute(r.Context(), groupID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, populateGroupViewFromDomain(group))
}

func (h *GroupHandler) paginateGroupHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	params := group.GroupPaginateParam{
		PaginationParam: parsePaginationParam(q),
	}

	if val, err := uuid.Parse(q.Get("usr_id")); err == nil {
		params.UsrID = &val
	}

	res, err := h.paginateGroup.Execute(r.Context(), params)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w,
		http.StatusOK,
		res.Map(groupViewFromDomain))
}

func (h *GroupHandler) createGroupHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()
	body, err := parseJSON[group.CreateGroupDTO](r.Body, validationStruct)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	group, err := h.createGroup.Execute(r.Context(), *body)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusCreated, groupViewFromDomain(group))
}

func (h *GroupHandler) updateGroupHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()

	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "Group ID was not valid UUID"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}
	body, err := parseJSON[group.UpdateGroupDTO](r.Body, validationStruct)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	group, err := h.updateGroup.Execute(r.Context(), groupID, *body)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, groupViewFromDomain(group))
}

func (h *GroupHandler) deleteGroupHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "Group ID was not valid UUID"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	group, err := h.deleteGroup.Execute(r.Context(), groupID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, groupViewFromDomain(group))
}

func (h *GroupHandler) createGroupNodeHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()

	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	body, err := parseJSON[struct {
		NodeID uuid.UUID `json:"node_id" validate:"required"`
	}](r.Body, validationStruct)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	err = h.createGroupNode.Execute(r.Context(), groupID, body.NodeID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}
	resp := make(map[string]string)
	resp["message"] = "created group node successfully"
	writeJSON(w, http.StatusOK, resp)
}

func (h *GroupHandler) deleteGroupNodeHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	nodeID, err := uuid.Parse(chi.URLParam(r, "nodeID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid node ID"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	err = h.deleteGroupNode.Execute(r.Context(), groupID, nodeID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}
	resp := make(map[string]string)
	resp["message"] = "deleted group node successfully"
	writeJSON(w, http.StatusOK, resp)
}

func (h *GroupHandler) upsertGroupUsrHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	body, err := parseJSON[struct {
		UsrID  uuid.UUID             `json:"usr_id" validate:"required"`
		Access domain.GroupUsrAccess `json:"access" validate:"required,oneof=read_only_access write_access owner_access"`
	}](r.Body, validationStruct)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	err = h.upsertGroupUsr.Execute(r.Context(), groupID, body.UsrID, body.Access)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}
	resp := make(map[string]string)
	resp["message"] = "created group user successfully"
	writeJSON(w, http.StatusOK, resp)
}

func (h *GroupHandler) deleteGroupUsrHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	usrID, err := uuid.Parse(chi.URLParam(r, "usrID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid user ID"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	err = h.deleteGroupUsr.Execute(r.Context(), groupID, usrID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}
	resp := make(map[string]string)
	resp["message"] = "deleted group user successfully"
	writeJSON(w, http.StatusOK, resp)
}

// MountV1 mounts the GroupHandler to the given parent chi.Router .
// The path is /api/v1/groups
func (h *GroupHandler) MountV1(p chi.Router) {
	r := chi.NewRouter()
	r.Use(h.am.IsAuthenticated)

	r.Post("/", h.createGroupHandler)

	r.Get("/{groupID}", h.getGroupHandler)

	r.Patch("/{groupID}", h.updateGroupHandler)

	r.Delete("/{groupID}", h.deleteGroupHandler)

	r.Get("/paginate", h.paginateGroupHandler)

	r.Post("/{groupID}/nodes", h.createGroupNodeHandler)

	r.Delete("/{groupID}/nodes/{nodeID}", h.deleteGroupNodeHandler)

	r.Post("/{groupID}/users", h.upsertGroupUsrHandler)

	r.Delete("/{groupID}/users/{usrID}", h.deleteGroupUsrHandler)

	p.Mount("/api/v1/groups", r)
}
