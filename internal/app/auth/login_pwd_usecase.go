package auth

import (
	"context"
	"errors"
	"strings"

	"ownned/internal/app/apperror"
	"ownned/internal/app/identity"
	"ownned/internal/app/usr"
	"ownned/internal/domain"
)

type LoginPwdUseCase struct {
	usrs      usr.UsrRepository
	usrPwds   usr.UsrPwdRepository
	pwdHasher PwdHasher
	jwt       JWTManager
}

func NewLoginPwdUseCase(
	usrs usr.UsrRepository,
	usrPwds usr.UsrPwdRepository,
	pwdHasher PwdHasher,
	jwt JWTManager,
) *LoginPwdUseCase {
	return &LoginPwdUseCase{
		usrs:      usrs,
		usrPwds:   usrPwds,
		pwdHasher: pwdHasher,
		jwt:       jwt,
	}
}

type LoginPwdDTO struct {
	Username string `json:"username" validate:"required,email"`
	Pwd      string `json:"password" validate:"required,min=8,max=255"`
}

func (dto LoginPwdDTO) normalize() LoginPwdDTO {
	dto.Username = strings.ToLower(strings.TrimSpace(dto.Username))
	return dto
}

func (uc *LoginPwdUseCase) Execute(
	ctx context.Context,
	dto LoginPwdDTO,
) (string, *domain.Usr, error) {
	dto = dto.normalize()
	usr, err := uc.usrs.GetByUsername(ctx, dto.Username)
	if err != nil {
		return "", nil, err
	}

	if usr == nil {
		details := make(map[string]string)
		details["reason"] = "invalid credentials"
		return "", nil, apperror.ErrUnauthenticated(details)
	}

	hash, err := uc.usrPwds.GetPwd(ctx, usr.ID)
	if err != nil {
		return "", nil, err
	}

	if hash == nil {
		details := make(map[string]string)
		details["reason"] = "invalid credentials"
		return "", nil, apperror.ErrUnauthenticated(details)
	}

	defer func() {
		for i := range hash {
			hash[i] = 0
		}
	}()

	if err := uc.pwdHasher.Compare(hash, []byte(dto.Pwd)); err != nil {
		if errors.Is(err, ErrInvalidPwd) {
			details := make(map[string]string)
			details["reason"] = "invalid credentials"
			return "", nil, apperror.ErrUnauthenticated(details)
		}

		return "", nil, err
	}

	payload := identity.Identity{
		ID:   usr.ID,
		Role: usr.Role,
	}

	session, err := uc.jwt.GenerateAccessToken(payload)
	if err != nil {
		return "", nil, err
	}

	return session, usr, nil
}
