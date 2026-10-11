package node

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"ownned/internal/app/apperror"
	"ownned/internal/app/group"
	"ownned/internal/app/identity"
	"ownned/internal/app/storage"
	"ownned/internal/domain"
)

type DeleteNodeUseCase struct {
	group.AccessChecker
	nodes   NodeRepository
	docs    DocRepository
	storage storage.Storage
	log     *slog.Logger
}

func NewDeleteNodeUseCase(
	access_checker group.AccessChecker,
	nodes NodeRepository,
	docs DocRepository,
	storage storage.Storage,
	mainLogger *slog.Logger,
) *DeleteNodeUseCase {
	log := mainLogger.With("usecase", "DeleteNodeUseCase")
	return &DeleteNodeUseCase{
		AccessChecker: access_checker,
		nodes:         nodes,
		docs:          docs,
		storage:       storage,
		log:           log,
	}
}

func (uc *DeleteNodeUseCase) Execute(ctx context.Context, nodeID domain.NodeID) error {
	usr, err := identity.Get(ctx)
	if err != nil {
		return err
	}

	if !usr.Role.CanDeleteNode() {
		detail := map[string]string{"reason": "usr does not have access to do this action"}
		return apperror.ErrForbidden(detail)
	}

	node, err := uc.nodes.GetByID(ctx, nodeID)
	if err != nil {
		return err
	}

	if node == nil {
		detail := map[string]string{"reason": "node was not found"}
		return apperror.ErrNotFound(detail)
	}

	yes, err := uc.HasNodeAccessToFromPath(ctx, node.Path, domain.GroupWriteAccess)
	if err != nil {
		uc.log.WarnContext(ctx, "failed to check if user can access node",
			"nodeID", nodeID,
			"error", err)
		return err
	}

	if !yes {
		detail := make(map[string]string)
		detail["reason"] = "User does not have access to specified node"
		return apperror.ErrForbidden(detail)
	}

	docs, err := uc.docs.GetAllFromPath(ctx, node.Path)
	if err != nil {
		return err
	}

	// IS EXPECTED TO NODE DELETIONS TO DELETE EVERY CHILDREN AND ALSO DOCS ASSOCIATE ON CASCADE
	if err := uc.nodes.Delete(ctx, node.ID); err != nil {
		return err
	}

	go uc.cleanStorage(docs)

	return nil
}

func (uc *DeleteNodeUseCase) cleanStorage(docs []domain.Doc) {
	if len(docs) == 0 {
		return
	}

	const maxWorkers = 10
	workers := min(maxWorkers, len(docs))

	jobs := make(chan domain.Doc)
	var wg sync.WaitGroup

	for range workers {
		wg.Add(1)

		go func() {
			defer wg.Done()

			for doc := range jobs {
				ctx, cancel := context.WithTimeout(
					context.Background(),
					30*time.Second,
				)

				if err := uc.storage.Delete(ctx, doc.NodeID); err != nil {
					uc.log.Warn("failed to delete doc from storage",
						"docID", doc.ID,
						"nodeID", doc.NodeID,
						"docTitle", doc.Title,
						"err", err,
					)
				}

				cancel()
			}
		}()
	}

	for _, doc := range docs {
		jobs <- doc
	}

	close(jobs)
	wg.Wait()
}

// less optimal design but simplier
// gorutine created by each doc
// func (uc *DeleteNodeUseCase) cleanStorage(docs []domain.Doc) {
// 	if len(docs) == 0 {
// 		return
// 	}
//
// 	const limitOfFilesToDeleteAtOnce int = 100
// 	limmiter := make(chan struct{}, limitOfFilesToDeleteAtOnce)
// 	wg := sync.WaitGroup{}
//
// 	for i := range docs {
// 		doc := docs[i]
// 		wg.Add(1)
// 		limmiter <- struct{}{}
// 		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
//
// 		go func() {
// 			defer func() {
// 				wg.Done()
// 				cancel()
// 				<-limmiter
// 			}()
//
// 			if err := uc.storage.Delete(ctx, doc.ID); err != nil {
// 				uc.log.Warn("failed to delete doc from storage",
// 					"docID", doc.ID,
// 					"nodeID", doc.NodeID,
// 					"docTitle", doc.Title,
// 					"err", err,
// 				)
//
// 			}
//
// 		}()
// 	}
//
// 	wg.Wait()
//
// }
