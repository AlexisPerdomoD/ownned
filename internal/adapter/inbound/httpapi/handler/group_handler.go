package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"ownned/internal/application/dto"
	"ownned/internal/application/usecase"
	"ownned/internal/domain"
	"ownned/internal/infrastructure/transport/http/decoder"
	"ownned/internal/infrastructure/transport/http/encoder"
	"ownned/internal/infrastructure/transport/http/view"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type GroupHandler struct {
	getGroup        *usecase.GetGroupUseCase
	paginateGroup   *usecase.PaginateGroupUseCase
	createGroup     *usecase.CreateGroupUseCase
	updateGroup     *usecase.UpdateGroupUseCase
	deleteGroup     *usecase.DeleteGroupUseCase
	createGroupNode *usecase.CreateGroupNodeUseCase
	deleteGroupNode *usecase.DeleteGroupNodeUseCase
	upsertGroupUsr  *usecase.UpsertGroupUsrUseCase
	deleteGroupUsr  *usecase.DeleteGroupUsrUseCase
}

func (h *GroupHandler) GetGroupHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	group, err := h.getGroup.Execute(r.Context(), groupID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusOK, view.PopulateGroupViewFromDomain(group))
}

func (h *GroupHandler) PaginateGroupHandler(w http.ResponseWriter, r *http.Request) {
	var search string
	var limit, page uint
	q := r.URL.Query()

	if rawsearch := q.Get("search"); rawsearch != "" {
		search = rawsearch
	}

	if rawlimit, err := strconv.ParseUint(q.Get("limit"), 10, 32); err == nil {
		limit = uint(rawlimit)
	}

	if rawpage, err := strconv.ParseUint(q.Get("page"), 10, 32); err == nil {
		page = uint(rawpage)
	}

	res, err := h.paginateGroup.Execute(
		r.Context(),
		page,
		limit,
		search,
		false)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w,
		http.StatusOK,
		view.PaginationResultViewFromDomain(res, view.GroupViewFromDomain))
}

func (h *GroupHandler) CreateGroupHandler(w http.ResponseWriter, r *http.Request) {
	body, err := decoder.ReadFromJSON[dto.CreateGroupDTO](r.Body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	if err := body.Validate(); err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	group, err := h.createGroup.Execute(r.Context(), body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusCreated, view.GroupViewFromDomain(group))
}

func (h *GroupHandler) UpdateGroupHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("Group ID was not valid UUID: %s", err)
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}
	body, err := decoder.ReadFromJSON[dto.UpdateGroupDTO](r.Body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	if err := body.Validate(); err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	group, err := h.updateGroup.Execute(r.Context(), groupID, body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusOK, view.GroupViewFromDomain(group))
}

func (h *GroupHandler) DeleteGroupHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("Group ID was not valid UUID: %s", err)
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	group, err := h.deleteGroup.Execute(r.Context(), groupID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusOK, view.GroupViewFromDomain(group))
}

func (h *GroupHandler) CreateGroupNodeHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()

	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	body, err := decoder.ReadFromJSON[struct {
		NodeID string `json:"node_id"`
	}](r.Body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	nodeID, err := uuid.Parse(body.NodeID)
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid node ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	err = h.createGroupNode.Execute(r.Context(), groupID, nodeID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}
	resp := make(map[string]string)
	resp["message"] = "created group node successfully"
	_ = encoder.WriteJSON(w, http.StatusOK, resp)
}

func (h *GroupHandler) DeleteGroupNodeHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	nodeID, err := uuid.Parse(chi.URLParam(r, "nodeID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid node ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	err = h.deleteGroupNode.Execute(r.Context(), groupID, nodeID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}
	resp := make(map[string]string)
	resp["message"] = "deleted group node successfully"
	_ = encoder.WriteJSON(w, http.StatusOK, resp)
}

func (h *GroupHandler) UpsertGroupUsrHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	body, err := decoder.ReadFromJSON[struct {
		UsrID  string `json:"usr_id"`
		Access string `json:"access"`
	}](r.Body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	usrID, err := uuid.Parse(body.UsrID)
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid user ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	access := domain.GroupUsrAccess(body.Access)
	if !access.IsValid() {
		detail := make(map[string]string)
		detail["reason"] = "Invalid access provided."
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	err = h.upsertGroupUsr.Execute(r.Context(), groupID, usrID, access)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}
	resp := make(map[string]string)
	resp["message"] = "created group user successfully"
	_ = encoder.WriteJSON(w, http.StatusOK, resp)
}

func (h *GroupHandler) DeleteGroupUsrHandler(w http.ResponseWriter, r *http.Request) {
	groupID, err := uuid.Parse(chi.URLParam(r, "groupID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid group ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	usrID, err := uuid.Parse(chi.URLParam(r, "usrID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid user ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	err = h.deleteGroupUsr.Execute(r.Context(), groupID, usrID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}
	resp := make(map[string]string)
	resp["message"] = "deleted group user successfully"
	_ = encoder.WriteJSON(w, http.StatusOK, resp)
}

func NewGroupHandler(
	gg *usecase.GetGroupUseCase,
	pg *usecase.PaginateGroupUseCase,
	cg *usecase.CreateGroupUseCase,
	ug *usecase.UpdateGroupUseCase,
	dg *usecase.DeleteGroupUseCase,
	gn *usecase.CreateGroupNodeUseCase,
	dgn *usecase.DeleteGroupNodeUseCase,
	gu *usecase.UpsertGroupUsrUseCase,
	dgu *usecase.DeleteGroupUsrUseCase,
) *GroupHandler {
	helper.NotNilOrPanic(cg, "CreateGroupUseCase")
	helper.NotNilOrPanic(ug, "UpdateGroupUseCase")
	helper.NotNilOrPanic(dg, "DeleteGroupUseCase")
	helper.NotNilOrPanic(pg, "PaginateGroupUseCase")
	helper.NotNilOrPanic(gg, "GetGroupUseCase")
	helper.NotNilOrPanic(gn, "CreateGroupNodeUseCase")
	helper.NotNilOrPanic(dgn, "DeleteGroupNodeUseCase")
	helper.NotNilOrPanic(gu, "UpsertGroupUsrUseCase")
	helper.NotNilOrPanic(dgu, "DeleteGroupUsrUseCase")
	return &GroupHandler{gg, pg, cg, ug, dg, gn, dgn, gu, dgu}
}
