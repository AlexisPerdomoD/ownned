package httpapi

import (
	"net/http"
	"strconv"
	"strings"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/pagination"
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
	}
}

func (h *GroupHandler) GetGroupHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusOK, PopulateGroupViewFromDomain(group))
}

func (h *GroupHandler) PaginateGroupHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var limit, page uint
	search := q.Get("search")
	includeAllFlag := strings.ToLower(q.Get("scope")) == "all"

	if rawlimit, err := strconv.ParseUint(q.Get("limit"), 10, 32); err == nil {
		limit = uint(rawlimit)
	}

	if rawpage, err := strconv.ParseUint(q.Get("page"), 10, 32); err == nil {
		page = uint(rawpage)
	}

	res, err := h.paginateGroup.Execute(
		r.Context(),
		pagination.PaginationParam{
			Page:   page,
			Limit:  limit,
			Search: search,
		},
		includeAllFlag)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w,
		http.StatusOK,
		paginationMap(res, GroupViewFromDomain))
}

func (h *GroupHandler) CreateGroupHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusCreated, GroupViewFromDomain(group))
}

func (h *GroupHandler) UpdateGroupHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusOK, GroupViewFromDomain(group))
}

func (h *GroupHandler) DeleteGroupHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusOK, GroupViewFromDomain(group))
}

func (h *GroupHandler) CreateGroupNodeHandler(w http.ResponseWriter, r *http.Request) {
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

func (h *GroupHandler) DeleteGroupNodeHandler(w http.ResponseWriter, r *http.Request) {
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

func (h *GroupHandler) UpsertGroupUsrHandler(w http.ResponseWriter, r *http.Request) {
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

func (h *GroupHandler) DeleteGroupUsrHandler(w http.ResponseWriter, r *http.Request) {
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
