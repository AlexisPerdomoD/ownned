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
	NodeRepository() NodeCreator
	GroupRepository() GroupCreator
	GroupUsrRepository() GroupUsrUpsertor
	GroupNodeRepository() GroupNodeUpsertor
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
		detail["reason"] = fmt.Sprintf("not enought privileges to do this action")
		return nil, apperror.ErrForbidden(detail)
	}

	if !isValidPwd(dto.Pwd) {
		detail := make(map[string]string)
		detail["reason"] = fmt.Sprintf("Password must contain at least one letter, one digit and one symbol")
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

	usrID := uuid.NewV7()
	rootGroupID := uuid.NewV7()
	rootFolderID := uuid.NewV7()

	rootFolderPath, err := domain.NodePathUsrRoot.NewChildPath(rootFolderID)
	if err != nil {
		return nil, err
	}

	newUsr = &domain.Usr{
		ID:        usrID,
		Username:  dto.Username,
		Role:      dto.Role,
		Firstname: dto.Firstname,
		Lastname:  dto.Lastname,
	}

	rootFolder := &domain.Node{
		ID:          rootFolderID,
		Name:        newUsr.Username,
		UsrID:       newUsr.ID,
		Description: fmt.Sprintf("Auto generated root node for %s in particular.", newUsr.Fullname()),
		Type:        domain.FolderNodeType,
		Path:        rootFolderPath,
	}

	rootGroup := &domain.Group{
		ID:          rootGroupID,
		UsrID:       newUsr.ID,
		Name:        newUsr.Username,
		Description: fmt.Sprintf("Auto generated root group to handle root folder access for %s in particular.", newUsr.Fullname()),
	}

	rootGroupNode := &domain.GroupNode{
		GroupID: rootGroup.ID,
		NodeID:  rootFolder.ID,
	}

	rootGroupUsr := &domain.GroupUsr{
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

		if err := t.NodeRepository().Create(t.Ctx(), rootFolder); err != nil {
			uc.log.DebugContext(t.Ctx(), "error creating usr node", "err", err, "stack", debug.Stack())
			return err
		}

		if err := t.GroupRepository().Create(t.Ctx(), rootGroup); err != nil {
			uc.log.DebugContext(t.Ctx(), "error creating usr group", "err", err, "stack", debug.Stack())
			return err
		}

		if err := t.GroupNodeRepository().Upsert(t.Ctx(), rootGroupNode); err != nil {
			uc.log.WarnContext(t.Ctx(), "error creating usr group node", "err", err, "stack", debug.Stack())
			return err
		}

		if err := t.GroupUsrRepository().Upsert(t.Ctx(), rootGroupUsr); err != nil {
			uc.log.DebugContext(t.Ctx(), "error creating usr group usr", "err", err, "stack", debug.Stack())
			return err
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
