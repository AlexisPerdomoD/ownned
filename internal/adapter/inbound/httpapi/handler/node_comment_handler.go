package handler

import (
	"net/http"

	"ownned/internal/application/usecase"
	"ownned/internal/infrastructure/transport/http/decoder"
	"ownned/internal/infrastructure/transport/http/encoder"
	"ownned/internal/infrastructure/transport/http/view"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type NodeCommentHandler struct {
	getNodeComments   *usecase.GetNodeCommentsUseCase
	createNodeComment *usecase.CreateNodeCommentUseCase
	updateNodeComment *usecase.UpdateNodeCommentUseCase
	deleteNodeComment *usecase.DeleteNodeCommentUseCase
}

func (h *NodeCommentHandler) GetNodeCommentsHandler(w http.ResponseWriter, r *http.Request) {
	nodeID, err := uuid.Parse(chi.URLParam(r, "nodeID"))
	if err != nil {
		detail := make(map[string]string)
		detail["nodeID"] = "invalid node id provided"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	comments, err := h.getNodeComments.Execute(r.Context(), nodeID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	views := make([]view.NodeCommentView, len(comments))
	for i, c := range comments {
		views[i] = view.NodeCommentViewFromDomain(&c)
	}

	_ = encoder.WriteJSON(w, http.StatusOK, views)
}

func (h *NodeCommentHandler) CreateNodeCommentHandler(w http.ResponseWriter, r *http.Request) {
	nodeID, err := uuid.Parse(chi.URLParam(r, "nodeID"))
	if err != nil {
		detail := make(map[string]string)
		detail["nodeID"] = "invalid node id provided"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	body, err := decoder.CreateNodeCommentDTOFromJSON(r.Body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	comment, err := h.createNodeComment.Execute(r.Context(), nodeID, body.Content)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusCreated, view.NodeCommentViewFromDomain(comment))
}

func (h *NodeCommentHandler) UpdateNodeCommentHandler(w http.ResponseWriter, r *http.Request) {
	nodeCommentID, err := uuid.Parse(chi.URLParam(r, "nodeCommentID"))
	if err != nil {
		detail := make(map[string]string)
		detail["nodeCommentID"] = "invalid node comment id provided"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	body, err := decoder.UpdateNodeCommentDTOFromJSON(r.Body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	comment, err := h.updateNodeComment.Execute(r.Context(), nodeCommentID, body.Content)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusOK, view.NodeCommentViewFromDomain(comment))
}

func (h *NodeCommentHandler) DeleteNodeCommentHandler(w http.ResponseWriter, r *http.Request) {
	nodeCommentID, err := uuid.Parse(chi.URLParam(r, "nodeCommentID"))
	if err != nil {
		detail := make(map[string]string)
		detail["nodeCommentID"] = "invalid node comment id provided"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	comment, err := h.deleteNodeComment.Execute(r.Context(), nodeCommentID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}
	_ = encoder.WriteJSON(w, http.StatusOK, view.NodeCommentViewFromDomain(comment))
}

func NewNodeCommentHandler(
	gcu *usecase.GetNodeCommentsUseCase,
	ccu *usecase.CreateNodeCommentUseCase,
	ucu *usecase.UpdateNodeCommentUseCase,
	dcu *usecase.DeleteNodeCommentUseCase,
) *NodeCommentHandler {
	helper.NotNilOrPanic(gcu, "GetNodeCommentsUseCase")
	helper.NotNilOrPanic(ccu, "CreateNodeCommentUseCase")
	helper.NotNilOrPanic(ucu, "UpdateNodeCommentUseCase")
	helper.NotNilOrPanic(dcu, "DeleteNodeCommentUseCase")
	return &NodeCommentHandler{gcu, ccu, ucu, dcu}
}
