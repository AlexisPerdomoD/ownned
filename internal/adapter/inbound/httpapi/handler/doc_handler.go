package handler

import (
	"fmt"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"io"
	"net/http"
	"ownned/internal/application/storage"
	"ownned/internal/application/usecase"
	"ownned/internal/infrastructure/transport/http/decoder"
	"ownned/internal/infrastructure/transport/http/encoder"
	"ownned/internal/infrastructure/transport/http/view"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type DocHandler struct {
	createDoc   *usecase.CreateDocUseCase
	deleteDoc   *usecase.DeleteDocUseCase
	downloadDoc *usecase.DownloadDocUseCase
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

func (h *DocHandler) DownloadDocHandler(w http.ResponseWriter, r *http.Request) {
	docID, err := uuid.Parse(chi.URLParam(r, "docID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "Invalid doc ID provided."
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	var offset, limit uint64
	if rangeHeader := r.Header.Get("Range"); rangeHeader != "" {
		var ok bool
		offset, limit, ok = parseRange(rangeHeader)
		if !ok {
			detail := make(map[string]string)
			detail["reason"] = "Invalid Range header provided."
			_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
			return
		}

	}

	cmd := storage.DownloadCmd{
		Key:    docID,
		Offset: offset,
		Limit:  limit,
	}

	doc, file, err := h.downloadDoc.Execute(r.Context(), cmd)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	defer func() { _ = file.Close() }()

	if cmd.Offset >= doc.SizeInBytes {
		w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", doc.SizeInBytes))
		w.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
		return
	}

	w.Header().Set("Content-Type", doc.MimeType)

	if cmd.Offset > 0 || cmd.Limit > 0 {
		startByte := cmd.Offset
		endByte := cmd.Offset + cmd.Limit - 1
		if cmd.Limit == 0 || endByte >= doc.SizeInBytes {
			endByte = doc.SizeInBytes - 1
		}

		w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d",
			startByte,
			endByte,
			doc.SizeInBytes))
		w.WriteHeader(http.StatusPartialContent)
	}
	_, _ = io.Copy(w, file)
}

func NewDocHandler(
	cduc *usecase.CreateDocUseCase,
	dduc *usecase.DeleteDocUseCase,
	ddduc *usecase.DownloadDocUseCase,
) *DocHandler {
	helper.NotNilOrPanic(cduc, "CreateDocUseCase")
	helper.NotNilOrPanic(dduc, "DeleteDocUseCase")
	helper.NotNilOrPanic(ddduc, "DownloadDocUseCase")
	return &DocHandler{cduc, dduc, ddduc}
}
