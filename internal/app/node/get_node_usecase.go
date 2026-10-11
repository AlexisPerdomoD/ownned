package node

import (
	"context"
	"fmt"
	"log/slog"

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

func (uc *GetNodeUseCase) Execute(ctx context.Context, nodeID domain.NodeID) (domain.NodeLike, error) {
	yes, err := uc.HasNodeAccessTo(ctx, nodeID, domain.GroupReadOnlyAccess)
	if err != nil {
		uc.log.WarnContext(ctx, "failed to check if user can access node", "nodeID", nodeID, "error", err)
		return nil, err
	}

	if !yes {
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

	if node.Type == domain.FileNodeType {
		doc, err := uc.docs.GetByNodeID(ctx, node.ID)
		if err != nil {
			return nil, err
		}

		if doc == nil {
			uc.log.WarnContext(ctx, fmt.Sprintf("Doc entity associated with node at path %s was not found", node.Path))
			return nil, apperror.ErrIlegalDBState(nil)
		}

		return &FileNode{Node: *node, Doc: *doc}, nil
	}

	children, err := uc.nodes.GetChildren(ctx, node.Path)
	if err != nil {
		return nil, err
	}

	return &FolderNode{Node: *node, Children: children}, nil
}
