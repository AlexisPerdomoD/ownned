// package httpapi presents owned http interface contract
package httpapi

import (
	"log/slog"

	"github.com/go-playground/validator/v10"
)

var elog = slog.With("error handler")

var validate = validator.New()
