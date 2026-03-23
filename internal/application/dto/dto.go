// Package dto provides the data transfer objects (DTO) for the application layer.
package dto

import (
	"unicode"

	"github.com/go-playground/validator/v10"
)

var Validator = validator.New()

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
