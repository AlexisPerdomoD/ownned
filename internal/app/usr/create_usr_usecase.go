package usr

import (
	"context"
	"fmt"
	"log/slog"
	"runtime/debug"
	"strings"
	"unicode"
	"uuid"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/app/tx"
	"ownned/internal/domain"
)

type CreateUsrTx interface {
	tx.TxCtx
	UsrRepository() UsrRepository
	UsrPwdRepository() UsrPwdRepository
	NodeCreator() NodeCreator
	GroupRepository() GroupRepository
	GroupUsrUpsertor() GroupUsrUpsertor
	GroupNodeUpsertor() GroupNodeUpsertor
}

type CreateUsrUseCase struct {
	usrs      UsrRepository
	txFactory tx.TxFactory[CreateUsrTx]
	pwdHasher PwdHasher
	log       *slog.Logger
}

func NewCreateUsrUseCase(
	usrs UsrRepository,
	txFactory tx.TxFactory[CreateUsrTx],
	pwdHasher PwdHasher,
	mainLogger *slog.Logger,
) *CreateUsrUseCase {
	logger := mainLogger.With("usecase", "CreateUsrUseCase")
	return &CreateUsrUseCase{
		usrs:      usrs,
		txFactory: txFactory,
		pwdHasher: pwdHasher,
		log:       logger,
	}
}

type CreateUsrDTO struct {
	Role      domain.UsrRole `json:"role" validate:"required,oneof=super_usr_role normal_usr_role limited_usr_role"`
	Firstname string         `json:"firstname" validate:"required,min=2,max=50"`
	Lastname  string         `json:"lastname" validate:"required,min=2,max=50"`
	Username  string         `json:"username" validate:"required,email"`
	Pwd       string         `json:"password" validate:"required,min=8,max=255"`
}

func (dto CreateUsrDTO) normalize() CreateUsrDTO {
	dto.Firstname = strings.ToLower(strings.TrimSpace(dto.Firstname))
	dto.Lastname = strings.ToLower(strings.TrimSpace(dto.Lastname))
	dto.Username = strings.ToLower(strings.TrimSpace(dto.Username))
	return dto
}

func (uc *CreateUsrUseCase) Execute(
	ctx context.Context,
	dto CreateUsrDTO,
) (*domain.Usr, error) {
	usr, err := identity.Get(ctx)
	if err != nil {
		return nil, err
	}

	if !usr.Role.CanCreateUsr() {
		detail := make(map[string]string)
		detail["reason"] = "not enought privileges to do this action"
		return nil, apperror.ErrForbidden(detail)
	}

	if !isValidPwd(dto.Pwd) {
		detail := make(map[string]string)
		detail["reason"] = "Password must contain at least one letter, one digit and one symbol"
		return nil, apperror.ErrBadRequest(detail)
	}

	dto = dto.normalize()
	newUsr, err := uc.usrs.GetByUsername(ctx, dto.Username)
	if err != nil {
		return nil, err
	}

	if newUsr != nil {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("Username '%s' already in use for another user", newUsr.Username)
		return nil, apperror.ErrConflict(detail)
	}

	pwdHash, err := uc.pwdHasher.Hash([]byte(dto.Pwd))
	if err != nil {
		return nil, err
	}

	defer func() {
		for i := range pwdHash {
			pwdHash[i] = 0
		}
	}()

	newUsr = &domain.Usr{
		ID:        uuid.NewV7(),
		Username:  dto.Username,
		Role:      dto.Role,
		Firstname: dto.Firstname,
		Lastname:  dto.Lastname,
	}

	folderID := uuid.NewV7()

	folder := &domain.Node{
		ID:          folderID,
		Name:        newUsr.Username,
		UsrID:       &newUsr.ID,
		Description: fmt.Sprintf("Auto generated root node for %s in particular.", newUsr.Fullname()),
		Type:        domain.FolderNodeType,
		Path:        domain.NodePathUsrRoot.NewChildPath(folderID),
	}

	rootGroup := &domain.Group{
		ID:          uuid.NewV7(),
		UsrID:       &newUsr.ID,
		Name:        newUsr.Username,
		Description: fmt.Sprintf("Auto generated root group to handle root folder access for %s in particular.", newUsr.Fullname()),
	}

	groupNode := &domain.GroupNode{
		GroupID: rootGroup.ID,
		NodeID:  folder.ID,
	}

	groupUsr := &domain.GroupUsr{
		GroupID: rootGroup.ID,
		UsrID:   newUsr.ID,
		Access:  domain.GroupOwnerAccess,
	}

	if err = uc.txFactory.Do(ctx, func(t CreateUsrTx) error {
		if err := t.UsrRepository().Create(t.Ctx(), newUsr); err != nil {
			uc.log.DebugContext(t.Ctx(), "error creating usr", "err", err, "stack", debug.Stack())
			return err
		}

		if err := t.UsrPwdRepository().SetPwd(t.Ctx(), newUsr.ID, pwdHash); err != nil {
			uc.log.DebugContext(t.Ctx(), "error creating usr pwd", "err", err, "stack", debug.Stack())
			return err
		}

		if err := t.NodeCreator().Create(t.Ctx(), folder); err != nil {
			uc.log.DebugContext(t.Ctx(), "error creating usr node", "err", err, "stack", debug.Stack())
			return err
		}

		if err := t.GroupRepository().Create(t.Ctx(), rootGroup); err != nil {
			uc.log.DebugContext(t.Ctx(), "error creating usr group", "err", err, "stack", debug.Stack())
			return err
		}

		if err := t.GroupNodeUpsertor().Upsert(t.Ctx(), groupNode); err != nil {
			uc.log.WarnContext(t.Ctx(), "error creating usr group node", "err", err, "stack", debug.Stack())
			return err
		}

		if err := t.GroupUsrUpsertor().Upsert(t.Ctx(), groupUsr); err != nil {
			uc.log.DebugContext(t.Ctx(), "error creating usr group usr", "err", err, "stack", debug.Stack())
			return err
		}

		if newUsr.Role == domain.SuperUsrRole {
			rootGroup, err := t.GroupRepository().GetRoot(t.Ctx())
			if err != nil {
				uc.log.DebugContext(t.Ctx(), "error getting root group", "err", err, "stack", debug.Stack())
				return err
			}

			if err := t.GroupUsrUpsertor().Upsert(t.Ctx(), &domain.GroupUsr{
				GroupID: rootGroup.ID,
				UsrID:   newUsr.ID,
				Access:  domain.GroupOwnerAccess,
			}); err != nil {
				uc.log.DebugContext(t.Ctx(), "error creating usr group usr", "err", err, "stack", debug.Stack())
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return newUsr, nil
}

func isValidPwd(s string) bool {
	var hasLetter, hasDigit, hasSymbol bool

	for _, r := range s {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsDigit(r):
			hasDigit = true
		case unicode.IsPunct(r), unicode.IsSymbol(r):
			hasSymbol = true
		default:
			continue
		}

		if hasLetter && hasDigit && hasSymbol {
			return true
		}
	}

	return false
}
