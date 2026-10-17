package httpapi

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/node"
	"ownned/internal/app/storage"
	"ownned/internal/domain"

	"github.com/go-chi/chi/v5"
)

type NodeHandler struct {
	getRoot           *node.GetRootNodesUseCase
	getNode           *node.GetNodeUseCase
	paginateNode      *node.PaginateNodeUseCase
	paginateDoc       *node.PaginateDocUseCase
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
	paginateNode *node.PaginateNodeUseCase,
	paginateDoc *node.PaginateDocUseCase,
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
		paginateNode:      paginateNode,
		paginateDoc:       paginateDoc,
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

func (c *NodeHandler) getRootHandler(w http.ResponseWriter, r *http.Request) {
	nodes, err := c.getRoot.Execute(r.Context())
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	views := make([]NodeView, len(nodes))
	for i := range nodes {
		views[i] = nodeFolderViewFromDomain(&nodes[i], nil)
	}

	writeJSON(w, http.StatusOK, views)
}

func (c *NodeHandler) paginateNodeHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	params := node.PaginateNode{
		PaginationParam: parsePaginationParam(q),
	}

	if nodeID, err := uuid.Parse(q.Get("root_id")); err == nil {
		params.RootID = &nodeID
	}

	if nodeType := q.Get("node_type"); nodeType != "" {
		t := new(domain.NodeType(nodeType))
		if t.IsValid() {
			params.Type = t
		}
	}

	resp, err := c.paginateNode.Execute(r.Context(), params)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, resp.Map(nodeViewFromDomain))
}

func (c *NodeHandler) getNodeHandler(w http.ResponseWriter, r *http.Request) {
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
			nodeFolderViewFromDomain(node.Get(), children),
		)
		return
	}

	if isFile, doc := node.File(); isFile {
		writeJSON(w, http.StatusOK,
			nodeFileViewFromDomain(node.Get(), doc),
		)
		return
	}

	detail := make(map[string]string)
	detail["reason"] = "internal server state error occurred, please try again later"
	resp := errView(apperror.ErrInternal(detail))
	writeJSON(w, resp.Code, resp)
}

func (h *NodeHandler) downloadNodeFolderHandler(w http.ResponseWriter, r *http.Request) {
	err := apperror.ErrNotImplemented(nil)
	resp := errView(err)
	writeJSON(w, resp.Code, resp)
}

func (h *NodeHandler) paginateDocHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	params := node.PaginateDoc{
		PaginationParam: parsePaginationParam(q),
	}

	if nodeID, err := uuid.Parse(q.Get("root_id")); err == nil {
		params.RootID = &nodeID
	}

	if mimetype := q.Get("mimetype"); mimetype != "" {
		params.MimeType = &mimetype
	}

	if minSize, err := strconv.ParseUint(q.Get("min_size"), 10, 64); err == nil {
		params.MinSize = &minSize
	}

	if maxSize, err := strconv.ParseUint(q.Get("max_size"), 10, 64); err == nil {
		params.MaxSize = &maxSize
	}

	resp, err := h.paginateDoc.Execute(r.Context(), params)
	if err != nil {
		resp := errView(err)
		writeJSON(w, resp.Code, resp)
		return
	}

	writeJSON(w, http.StatusOK, resp.Map(docViewFromDomain))
}

func (c *NodeHandler) createFolderHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusCreated, nodeFolderViewFromDomain(folder, nil))
}

func (h *NodeHandler) createNodeFileHandler(w http.ResponseWriter, r *http.Request) {
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

	resp := nodeFileViewFromDomain(node, doc)
	writeJSON(w, http.StatusCreated, resp)
}

func (h *NodeHandler) updateNodeHandler(w http.ResponseWriter, r *http.Request) {
	err := apperror.ErrNotImplemented(nil)
	resp := errView(err)
	writeJSON(w, resp.Code, resp)
}

func (h *NodeHandler) deleteNodeHandler(w http.ResponseWriter, r *http.Request) {
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

func (h *NodeHandler) downloadNodeFileHandler(w http.ResponseWriter, r *http.Request) {
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

func (h *NodeHandler) deleteDocHandler(w http.ResponseWriter, r *http.Request) {
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
		nodeFileViewFromDomain(node, doc))
}

func (h *NodeHandler) getNodeCommentsHandler(w http.ResponseWriter, r *http.Request) {
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
		views[i] = nodeCommentViewFromDomain(&c)
	}

	writeJSON(w, http.StatusOK, views)
}

func (h *NodeHandler) createNodeCommentHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusCreated, nodeCommentViewFromDomain(comment))
}

func (h *NodeHandler) updateNodeCommentHandler(w http.ResponseWriter, r *http.Request) {
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

	writeJSON(w, http.StatusOK, nodeCommentViewFromDomain(comment))
}

func (h *NodeHandler) deleteNodeCommentHandler(w http.ResponseWriter, r *http.Request) {
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
	writeJSON(w, http.StatusOK, nodeCommentViewFromDomain(comment))
}

// MountV1 mounts the NodeHandler to the given parent chi.Router .
// The path is /api/v1/nodes
func (h *NodeHandler) MountV1(p chi.Router) {
	r := chi.NewRouter()
	r.Use(h.am.IsAuthenticated)

	r.Get("/", h.getRootHandler)

	r.Post("/", h.createFolderHandler)

	r.Get("/{nodeID}", h.getNodeHandler)

	r.Put("/{nodeID}", h.updateNodeHandler)

	r.Delete("/{nodeID}", h.deleteNodeHandler)

	r.Get("/{nodeID}/download", h.downloadNodeFolderHandler)

	r.Get("/paginate", h.paginateNodeHandler)

	r.Get("/{nodeID}/comments", h.getNodeCommentsHandler)

	r.Post("/{nodeID}/comments", h.createNodeCommentHandler)

	r.Patch("/comments/{nodeCommentID}", h.updateNodeCommentHandler)

	r.Delete("/comments/{nodeCommentID}", h.deleteNodeCommentHandler)

	r.Post("/docs", h.createNodeFileHandler)

	r.Get("/docs/{docID}/download", h.downloadNodeFileHandler)

	r.Delete("/docs/{docID}", h.deleteDocHandler)

	r.Get("/docs/paginate", h.paginateDocHandler)

	p.Mount("/api/v1/nodes", r)
}
