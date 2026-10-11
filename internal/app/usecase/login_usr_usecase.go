package usecase

import (
	"context"
	"errors"

	"ownned/internal/application/auth"
	"ownned/internal/application/dto"
	"ownned/internal/domain"
	"ownned/pkg/apperror"
	"ownned/pkg/helper"
)

type LoginUsrUseCase struct {
	usrRepository    domain.UsrRepository
	usrPwdRepository domain.UsrPwdRepository
	pwdHasher        auth.PwdHasher
	jwtManager       auth.JWTManager
}

func (uc *LoginUsrUseCase) Execute(
	ctx context.Context,
	args dto.LoginUsrDTO,
) (session string, usr *domain.Usr, err error) {
	if err := args.Validate(); err != nil {
		return "", nil, err
	}

	usr, err = uc.usrRepository.GetByUsername(ctx, args.Username)
	if err != nil {
		return "", nil, err
	}

	if usr == nil {
		details := make(map[string]string)
		details["reason"] = "invalid credentials"
		return "", nil, apperror.ErrUnauthenticated(details)
	}

	usrPwdHash, err := uc.usrPwdRepository.GetPwd(ctx, usr.ID)
	if err != nil {
		return "", nil, err
	}
	defer auth.ZeroBytes(usrPwdHash)

	err = uc.pwdHasher.Compare(usrPwdHash, []byte(args.Pwd))
	if err != nil {
		details := make(map[string]string)
		details["reason"] = "invalid credentials"
		if errors.Is(err, auth.ErrInvalidPwd) {
			return "", nil, apperror.ErrUnauthenticated(details)
		}

		return "", nil, err
	}

	sessionPayload := auth.JWTAccessPayload{
		UsrID: usr.ID.String(),
		Role:  usr.Role,
	}

	session, err = uc.jwtManager.GenerateAccessToken(sessionPayload)
	if err != nil {
		return "", nil, err
	}

	return session, usr, nil
}

func NewLoginUsrUseCase(
	ur domain.UsrRepository,
	upr domain.UsrPwdRepository,
	ph auth.PwdHasher,
	jm auth.JWTManager,
) *LoginUsrUseCase {
	helper.NotNilOrPanic(ur, "UsrRepository")
	helper.NotNilOrPanic(upr, "UsrPwdRepository")
	helper.NotNilOrPanic(ph, "PwdHasher")
	helper.NotNilOrPanic(jm, "JWTManager")
	return &LoginUsrUseCase{ur, upr, ph, jm}
}
