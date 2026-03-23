package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"ownned/internal/application/dto"
	"ownned/internal/application/usecase"
	"ownned/internal/infrastructure/transport/http/decoder"
	"ownned/internal/infrastructure/transport/http/encoder"
	"ownned/internal/infrastructure/transport/http/view"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type GroupHandler struct {
	getGroup      *usecase.GetGroupUseCase
	paginateGroup *usecase.PaginateGroupUseCase
	createGroup   *usecase.CreateGroupUseCase
	deleteGroup   *usecase.DeleteGroupUseCase
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

func NewGroupHandler(
	gg *usecase.GetGroupUseCase,
	pg *usecase.PaginateGroupUseCase,
	cg *usecase.CreateGroupUseCase,
	dg *usecase.DeleteGroupUseCase,
) *GroupHandler {
	helper.NotNilOrPanic(cg, "CreateGroupUseCase")
	helper.NotNilOrPanic(dg, "DeleteGroupUseCase")
	helper.NotNilOrPanic(pg, "PaginateGroupUseCase")
	helper.NotNilOrPanic(gg, "GetGroupUseCase")
	return &GroupHandler{gg, pg, cg, dg}
}
