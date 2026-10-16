package httpapi

import (
	"fmt"
	"io"
	"net/http"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/node"
	"ownned/internal/app/storage"

	"github.com/go-chi/chi/v5"
)

type NodeHandler struct {
	getRoot           *node.GetRootNodesUseCase
	getNode           *node.GetNodeUseCase
	downloadNodeFile  *node.DownloadNodeFileUseCase
	createNodeFolder  *node.CreateNodeFolderUseCase
	createNodeFile    *node.CreateNodeFileUseCase
	deleteNode        *node.DeleteNodeUseCase
	deleteNodeFile    *node.DeleteNodeFileUseCase
	getNodeComments   *node.GetNodeCommentsUseCase
	createNodeComment *node.CreateNodeCommentUseCase
	updateNodeComment *node.UpdateNodeCommentUseCase
	deleteNodeComment *node.DeleteNodeCommentUseCase
	am                *AuthMiddleware
}

func NewNodeHandler(
	getRoot *node.GetRootNodesUseCase,
	getNode *node.GetNodeUseCase,
	downloadNodeFile *node.DownloadNodeFileUseCase,
	createNodeFolder *node.CreateNodeFolderUseCase,
	createNodeFile *node.CreateNodeFileUseCase,
	deleteNode *node.DeleteNodeUseCase,
	deleteNodeFile *node.DeleteNodeFileUseCase,
	getNodeComments *node.GetNodeCommentsUseCase,
	createNodeComment *node.CreateNodeCommentUseCase,
	updateNodeComment *node.UpdateNodeCommentUseCase,
	deleteNodeComment *node.DeleteNodeCommentUseCase,
	am *AuthMiddleware,
) *NodeHandler {
	return &NodeHandler{
		getRoot:           getRoot,
		getNode:           getNode,
		downloadNodeFile:  downloadNodeFile,
		createNodeFolder:  createNodeFolder,
		createNodeFile:    createNodeFile,
		deleteNode:        deleteNode,
		deleteNodeFile:    deleteNodeFile,
		getNodeComments:   getNodeComments,
		createNodeComment: createNodeComment,
		updateNodeComment: updateNodeComment,
		deleteNodeComment: deleteNodeComment,
		am:                am,
	}
}

func (c *NodeHandler) GetRootHandler(w http.ResponseWriter, r *http.Request) {
	nodes, err := c.getRoot.Execute(r.Context())
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	views := make([]NodeView, len(nodes))
	for i := range nodes {
		views[i] = FolderViewFromDomain(&nodes[i], nil)
	}

	writeJSON(w, http.StatusOK, views)
}

func (c *NodeHandler) GetNodeHandler(w http.ResponseWriter, r *http.Request) {
	nodeID, err := uuid.Parse(chi.URLParam(r, "nodeID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid node ID"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	node, err := c.getNode.Execute(r.Context(), nodeID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	if isFolder, children := node.Folder(); isFolder {
		writeJSON(w, http.StatusOK,
			FolderViewFromDomain(node.Get(), children),
		)
		return
	}

	if isFile, doc := node.File(); isFile {
		writeJSON(w, http.StatusOK,
			FileViewFromDomain(node.Get(), doc),
		)
		return
	}

	detail := make(map[string]string)
	detail["reason"] = "internal server state error occurred, please try again later"
	resp := errView(apperror.ErrInternal(detail))
	writeJSON(w, resp.Code, resp)
}

func (h *NodeHandler) DeleteNodeHandler(w http.ResponseWriter, r *http.Request) {
	nodeID, err := uuid.Parse(chi.URLParam(r, "nodeID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid uuid provided"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	if err := h.deleteNode.Execute(r.Context(), nodeID); err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *NodeHandler) DownloadNodeFileHandler(w http.ResponseWriter, r *http.Request) {
	docID, err := uuid.Parse(chi.URLParam(r, "docID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "Invalid doc ID provided."
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	var offset, limit uint64
	if rangeHeader := r.Header.Get("Range"); rangeHeader != "" {
		var ok bool
		offset, limit, ok = parseRange(rangeHeader)
		if !ok {
			detail := make(map[string]string)
			detail["reason"] = "Invalid Range header provided."
			resp := errView(apperror.ErrBadRequest(detail))
			writeJSON(w, resp.Code, resp)
			return
		}

	}

	cmd := storage.DownloadCmd{
		Key:    docID,
		Offset: offset,
		Limit:  limit,
	}

	doc, file, err := h.downloadNodeFile.Execute(r.Context(), cmd)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
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

func (c *NodeHandler) CreateFolderHandler(w http.ResponseWriter, r *http.Request) {
	defer func() { _ = r.Body.Close() }()

	body, err := parseJSON[node.CreateNodeFolderDTO](r.Body, validationStruct)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	folder, err := c.createNodeFolder.Execute(r.Context(), *body)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusCreated, FolderViewFromDomain(folder, nil))
}

func (h *NodeHandler) CreateNodeFileHandler(w http.ResponseWriter, r *http.Request) {
	dto, err := parseCreateNodeFileDTOMultipart(r)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	defer func() {
		_ = dto.File.Close()
	}()

	node, doc, err := h.createNodeFile.Execute(r.Context(), *dto)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	resp := FileViewFromDomain(node, doc)
	writeJSON(w, http.StatusCreated, resp)
}

func (h *NodeHandler) DeleteDocHandler(w http.ResponseWriter, r *http.Request) {
	docID, err := uuid.Parse(chi.URLParam(r, "docID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid uuid provided"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	node, doc, err := h.deleteNodeFile.Execute(r.Context(), docID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK,
		FileViewFromDomain(node, doc))
}

func (h *NodeHandler) GetNodeCommentsHandler(w http.ResponseWriter, r *http.Request) {
	nodeID, err := uuid.Parse(chi.URLParam(r, "nodeID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid node id provided"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	comments, err := h.getNodeComments.Execute(r.Context(), nodeID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	views := make([]NodeCommentView, len(comments))
	for i, c := range comments {
		views[i] = NodeCommentViewFromDomain(&c)
	}

	writeJSON(w, http.StatusOK, views)
}

func (h *NodeHandler) CreateNodeCommentHandler(w http.ResponseWriter, r *http.Request) {
	nodeID, err := uuid.Parse(chi.URLParam(r, "nodeID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid node id provided"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	body, err := parseJSON[struct {
		Content string `json:"content" validate:"required,max=255"`
	}](r.Body, validationStruct)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	comment, err := h.createNodeComment.Execute(r.Context(), nodeID, body.Content)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusCreated, NodeCommentViewFromDomain(comment))
}

func (h *NodeHandler) UpdateNodeCommentHandler(w http.ResponseWriter, r *http.Request) {
	nodeCommentID, err := uuid.Parse(chi.URLParam(r, "nodeCommentID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid node comment id provided"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	body, err := parseJSON[struct {
		Content string `json:"content" validate:"required,max=255"`
	}](r.Body, validationStruct)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	comment, err := h.updateNodeComment.Execute(r.Context(), nodeCommentID, body.Content)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, NodeCommentViewFromDomain(comment))
}

func (h *NodeHandler) DeleteNodeCommentHandler(w http.ResponseWriter, r *http.Request) {
	nodeCommentID, err := uuid.Parse(chi.URLParam(r, "nodeCommentID"))
	if err != nil {
		detail := make(map[string]string)
		detail["reason"] = "invalid node comment id provided"
		resp := errView(apperror.ErrBadRequest(detail))
		writeJSON(w, resp.Code, resp)
		return
	}

	comment, err := h.deleteNodeComment.Execute(r.Context(), nodeCommentID)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}
	writeJSON(w, http.StatusOK, NodeCommentViewFromDomain(comment))
}

// MountV1 mounts the NodeHandler to the given parent chi.Router .
// The path is /api/v1/nodes
func (h *NodeHandler) MountV1(p chi.Router) {
	r := chi.NewRouter()
	r.Use(h.am.IsAuthenticated)

	r.Get("/", h.GetRootHandler)

	r.Post("/", h.CreateFolderHandler)

	r.Get("/{nodeID}", h.GetNodeHandler)

	r.Delete("/{nodeID}", h.DeleteNodeHandler)

	r.Get("/{nodeID}/comments", h.GetNodeCommentsHandler)

	r.Post("/{nodeID}/comments", h.CreateNodeCommentHandler)

	r.Patch("/comments/{nodeCommentID}", h.UpdateNodeCommentHandler)

	r.Delete("/comments/{nodeCommentID}", h.DeleteNodeCommentHandler)

	r.Post("/docs", h.CreateNodeFileHandler)

	r.Get("/docs/{docID}/download", h.DownloadNodeFileHandler)

	r.Delete("/docs/{docID}", h.DeleteDocHandler)

	p.Mount("/api/v1/nodes", r)
}
