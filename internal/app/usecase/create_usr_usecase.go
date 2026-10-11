package usecase

import (
	"context"
	"fmt"
	"log/slog"
	"runtime/debug"

	"github.com/google/uuid"

	"ownned/internal/application/auth"
	"ownned/internal/application/dto"
	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/col"
	"ownned/pkg/helper"
)

type CreateUsrUseCase struct {
	usrRepository     domain.UsrRepository
	unitOfWorkFactory domain.UnitOfWorkFactory
	pwdHasher         auth.PwdHasher
	log               *slog.Logger
}

func (uc *CreateUsrUseCase) Execute(
	ctx context.Context,
	args dto.CreateUsrDTO,
) (*domain.Usr, error) {
	if err := args.Validate(); err != nil {
		uc.log.WarnContext(ctx, "failed to validate create usr dto", "err", err)
		return nil, err
	}

	newUsr, err := uc.usrRepository.GetByUsername(ctx, args.Username)
	if err != nil {
		return nil, err
	}

	if newUsr != nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("username '%s' already in use for another user", args.Username)
		return nil, apperror.ErrConflict(detail)
	}

	pwdHash, err := uc.pwdHasher.Hash([]byte(args.Pwd))
	if err != nil {
		return nil, err
	}
	defer auth.ZeroBytes(pwdHash)

	usrID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	usrGroupID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	usrNodeRootID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	usrNodeRootPath, err := domain.NodePathUsrRoot.NewChildPath(usrNodeRootID)
	if err != nil {
		return nil, err
	}

	newUsr = &domain.Usr{
		ID:        usrID,
		Username:  args.Username,
		Role:      args.Role,
		Firstname: args.Firstname,
		Lastname:  args.Lastname,
	}

	usrNodeRoot := &domain.Node{
		ID:          usrNodeRootID,
		Name:        fmt.Sprintf("%s_usr_root_folder", newUsr.ID),
		UsrID:       newUsr.ID,
		Description: "Auto generated root node for particular user.",
		Type:        domain.FolderNodeType,
		Path:        usrNodeRootPath,
	}

	usrRootGroup := &domain.Group{
		ID:          usrGroupID,
		UsrID:       newUsr.ID,
		Name:        fmt.Sprintf("%s_group", newUsr.ID),
		Description: "Auto generated group for particular user.",
	}

	nodeRootGroup := &domain.UpsertGroupNode{
		GroupID: usrRootGroup.ID,
		NodeID:  usrNodeRoot.ID,
	}

	usrGroups := col.Set[domain.UpsertGroupUsr]{}
	usrGroups.Add(domain.UpsertGroupUsr{
		GroupID: usrRootGroup.ID,
		UsrID:   newUsr.ID,
		Access:  domain.GroupOwnerAccess,
	})

	if len(args.Access) > 0 {
		for _, v := range args.Access {
			usrGroups.Add(domain.UpsertGroupUsr{
				GroupID: v.GroupID,
				UsrID:   newUsr.ID,
				Access:  v.Access,
			})
		}
	}

	if err = uc.unitOfWorkFactory.Do(ctx, func(tx domain.UnitOfWork) error {
		if err := tx.UsrRepository().Create(tx.Ctx(), newUsr); err != nil {
			uc.log.DebugContext(tx.Ctx(), "error creating usr", "err", err, "stack", debug.Stack())
			return err
		}

		if err := tx.UsrPwdRepository().SetPwd(tx.Ctx(), newUsr.ID, pwdHash); err != nil {
			uc.log.DebugContext(tx.Ctx(), "error creating usr pwd", "err", err, "stack", debug.Stack())
			return err
		}

		if err := tx.NodeRepository().Create(tx.Ctx(), usrNodeRoot); err != nil {
			uc.log.DebugContext(tx.Ctx(), "error creating usr node", "err", err, "stack", debug.Stack())
			return err
		}

		if err := tx.GroupRepository().Create(tx.Ctx(), usrRootGroup); err != nil {
			uc.log.DebugContext(tx.Ctx(), "error creating usr group", "err", err, "stack", debug.Stack())
			return err
		}

		if err := tx.GroupNodeRepository().Upsert(tx.Ctx(), nodeRootGroup); err != nil {

			uc.log.WarnContext(tx.Ctx(), "error creating usr group node", "err", err, "stack", debug.Stack())
			return err
		}

		if err := tx.GroupUsrRepository().UpsertAll(tx.Ctx(), usrGroups.Slice()); err != nil {

			uc.log.DebugContext(tx.Ctx(), "error creating usr group usr", "err", err, "stack", debug.Stack())
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return newUsr, nil
}

func NewCreateUsrUseCase(
	usrRepository domain.UsrRepository,
	unitOfWorkFactory domain.UnitOfWorkFactory,
	pwdHasher auth.PwdHasher,
	mainLogger *slog.Logger,
) *CreateUsrUseCase {
	helper.NotNilOrPanic(usrRepository, "UsrRepository")
	helper.NotNilOrPanic(unitOfWorkFactory, "UnitOfWorkFactory")
	helper.NotNilOrPanic(pwdHasher, "PwdHasher")
	helper.NotNilOrPanic(mainLogger, "mainLogger")
	logger := mainLogger.With("usecase", "CreateUsrUseCase")
	return &CreateUsrUseCase{usrRepository, unitOfWorkFactory, pwdHasher, logger}
}
