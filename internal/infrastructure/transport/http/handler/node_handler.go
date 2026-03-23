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

type NodeHandler struct {
	getRoot      *usecase.GetRootNodesUseCase
	createFolder *usecase.CreateFolderUseCase
	getNode      *usecase.GetNodeUseCase
}

func (c *NodeHandler) GetRootHandler(w http.ResponseWriter, r *http.Request) {
	nodes, err := c.getRoot.Execute(r.Context())
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	views := make([]view.NodeView, len(nodes))
	for i, n := range nodes {
		views[i] = view.FolderViewFromDomain(&n, nil)
	}

	_ = encoder.WriteJSON(w, http.StatusOK, views)
}

func (c *NodeHandler) GetNodeHandler(w http.ResponseWriter, r *http.Request) {
	nodeID, err := uuid.Parse(chi.URLParam(r, "nodeID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid node ID"
		_ = encoder.WriteJSONError(w, apperror.ErrBadRequest(detail))
		return
	}

	node, err := c.getNode.Execute(r.Context(), nodeID)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	if isFolder, children := node.IsFolder(); isFolder {
		_ = encoder.WriteJSON(w, http.StatusOK,
			view.FolderViewFromDomain(node.GetNode(), children),
		)
		return
	}

	if isFile, doc := node.IsFile(); isFile {
		_ = encoder.WriteJSON(w, http.StatusOK,
			view.FileViewFromDomain(node.GetNode(), doc),
		)
		return
	}

	detail := make(map[string]string)
	detail["reason"] = "internal server state error occurred, please try again later"
	_ = encoder.WriteJSONError(w, apperror.ErrInternal(detail))
}

func (c *NodeHandler) CreateFolderHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()

	body, err := decoder.CreateFolderDTOFromJSON(r.Body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	if err := body.Validate(); err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	folder, err := c.createFolder.Execute(r.Context(), body)
	if err != nil {
		_ = encoder.WriteJSONError(w, err)
		return
	}

	_ = encoder.WriteJSON(w, http.StatusCreated, view.FolderViewFromDomain(folder, nil))
}

func NewNodeHandler(
	gr *usecase.GetRootNodesUseCase,
	cf *usecase.CreateFolderUseCase,
	gn *usecase.GetNodeUseCase,
) *NodeHandler {
	helper.NotNilOrPanic(gr, "GetRootNodesUseCase")
	helper.NotNilOrPanic(cf, "CreateFolderUseCase")
	helper.NotNilOrPanic(gn, "GetNodeUseCase")
	return &NodeHandler{gr, cf, gn}
}
