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

type DocHandler struct {
	createDoc *usecase.CreateDocUseCase
	deleteDoc *usecase.DeleteDocUseCase
}

func (h *DocHandler) CreateDocHandler(w http.ResponseWriter, r *http.Request) {
	dto, err := decoder.CreateDocInputDTOFromMultipartOnDemand(r)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	if err := dto.Validate(); err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	defer func() {
		if dto.File != nil {
			_ = dto.File.Close()
		}
	}()

	fileNode, err := h.createDoc.Execute(r.Context(), dto)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	resp := view.FileViewFromDomain(fileNode.Node, fileNode.Doc)
	_ = encoder.WriteJSON(w, http.StatusCreated, resp)
}

func (h *DocHandler) DeleteDocHandler(w http.ResponseWriter, r *http.Request) {
	docID, err := uuid.Parse(chi.URLParam(r, "docID"))
	if err != nil {
		detail := make(map[string]string)
		detail["docID"] = "invalid uuid provided"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	deletedFileNode, err := h.deleteDoc.Execute(r.Context(), docID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusOK,
		view.FileViewFromDomain(
			&deletedFileNode.Node,
			&deletedFileNode.Doc,
		))
}

func NewDocHandler(cduc *usecase.CreateDocUseCase, dduc *usecase.DeleteDocUseCase) *DocHandler {
	helper.NotNilOrPanic(cduc, "CreateDocUseCase")
	helper.NotNilOrPanic(dduc, "DeleteDocUseCase")
	return &DocHandler{cduc, dduc}
}
