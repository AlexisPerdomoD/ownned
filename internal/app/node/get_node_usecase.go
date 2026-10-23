package node

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/domain"
)

type GetNodeUseCase struct {
	group.AccessChecker
	nodes NodeRepository
	docs  DocRepository
	log   *slog.Logger
}

func NewGetNodeByIDUseCase(
	access_checker group.AccessChecker,
	nodes NodeRepository,
	docs DocRepository,
	mainLogger *slog.Logger,
) *GetNodeUseCase {
	log := mainLogger.With("usecase", "GetNodeUseCase")
	return &GetNodeUseCase{
		AccessChecker: access_checker,
		nodes:         nodes,
		docs:          docs,
		log:           log,
	}
}

func (uc *GetNodeUseCase) Execute(ctx context.Context, nodeID domain.NodeID) (NodeLike, error) {
	access, err := uc.GetNodeAccess(ctx, nodeID)
	if err != nil {
		uc.log.WarnContext(ctx, "failed to check if user can access node", "nodeID", nodeID, "error", err)
		return nil, err
	}

	if access == nil {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to specified node"
		return nil, apperror.ErrForbidden(detail)
	}

	node, err := uc.nodes.GetByID(ctx, nodeID)
	if err != nil {
		return nil, err
	}

	if node == nil {
		uc.log.WarnContext(ctx, "failed to get node from db when should exists", "nodeID", nodeID)
		return nil, apperror.ErrIlegalDBState(nil)
	}

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	wg := sync.WaitGroup{}
	displayPath := new(string)

	// Note: the display path is best-effort metadata. On failure this method
	// warns and degrades gracefully: `displayPath` stays empty, so the node's
	// DisplayPath resolves to "" and children build their own paths from that
	// value instead of propagating the error and failing the whole operation.
	wg.Go(func() {
		path, err := uc.nodes.GetDisplayPathByID(ctx, node.ID)
		if err != nil {
			uc.log.WarnContext(ctx, "failed to get display path for node", "nodeID", node.ID, "error", err)
			return
		}

		displayPath = path
	})

	if node.Type == domain.FileNodeType {
		doc, err := uc.docs.GetByNodeID(ctx, node.ID)
		if err != nil {
			return nil, err
		}

		if doc == nil {
			uc.log.WarnContext(ctx, fmt.Sprintf("Doc entity associated with node at path %s was not found", node.Path))
			return nil, apperror.ErrIlegalDBState(nil)
		}

		wg.Wait()
		return &FileNode{
			Node:        *node,
			Doc:         *doc,
			DisplayPath: *displayPath,
			access:      access,
		}, nil
	}

	children, err := uc.nodes.GetChildren(ctx, node.Path, new(uint(1)))
	if err != nil {
		return nil, err
	}

	wg.Wait()

	displayChildren := make([]NodeLike, len(children))
	for i := range children {
		child := children[i]
		dp := *displayPath + "/" + child.Name

		if child.Type == domain.FolderNodeType {

			displayChildren[i] = &FolderNode{
				Node:        child,
				DisplayPath: dp,
				access:      access,
				Children:    nil, // Note: only include first level children folders
			}

			continue
		}

		dChild := &FileNode{
			Node:        child,
			DisplayPath: dp,
			access:      access,
		}

		displayChildren[i] = dChild

		wg.Go(func() {
			doc, err := uc.docs.GetByNodeID(ctx, dChild.Get().ID)
			if err != nil {
				uc.log.WarnContext(ctx, "failed to get doc for node",
					"nodeID", dChild.Get().ID,
					"error", err)
				return
			}

			if doc == nil {
				uc.log.WarnContext(ctx,
					fmt.Sprintf("Doc entity associated with node at path %s was not found",
						dChild.GetDisplayPath()))
				return
			}

			dChild.Doc = *doc
		})
	}

	wg.Wait()

	return &FolderNode{
		Node:        *node,
		Children:    displayChildren,
		DisplayPath: *displayPath,
		access:      access,
	}, nil
}
