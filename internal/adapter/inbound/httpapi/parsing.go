package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"uuid"

	"ownned/internal/app/node"
)

type validationKind string

const (
	validationOmit   validationKind = "omit_validation"
	validationStruct validationKind = "struct_validation"
)

var ErrInvalidValidationKind = errors.New("invalid validation kind")

func parseJSON[T any](b io.Reader, val validationKind) (*T, error) {
	var dto T
	decoder := json.NewDecoder(b)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&dto); err != nil {
		return nil, err
	}

	switch val {
	case validationOmit:

	case validationStruct:
		if err := validate.Struct(&dto); err != nil {
			return nil, err
		}
	default:
		return nil, ErrInvalidValidationKind
	}

	return &dto, nil
}

// parseRange parses an HTTP Range header for single byte-range requests.
//
// Supported formats:
//   - "" (empty)          → full file (offset=0, limit=0, ok=true)
//   - "bytes=START-END"   → inclusive range START to END (limit = END - START + 1)
//   - "bytes=START-"      → open-ended range from START to EOF (limit=0)
//
// Multi-range and suffix-range (e.g. "bytes=-500") are rejected.
func parseRange(header string) (offset, limit uint64, ok bool) {
	if header == "" {
		return 0, 0, true
	}

	const prefix = "bytes="
	if !strings.HasPrefix(header, prefix) {
		return 0, 0, false
	}

	rangeVal := strings.TrimSpace(header[len(prefix):])

	before, after, ok := strings.Cut(rangeVal, "-")
	if !ok {
		return 0, 0, false
	}

	startStr := strings.TrimSpace(before)
	endStr := strings.TrimSpace(after)

	if startStr == "" {
		return 0, 0, false
	}

	start, err := strconv.ParseUint(startStr, 10, 64)
	if err != nil {
		return 0, 0, false
	}

	if endStr == "" {
		return start, 0, true
	}

	end, err := strconv.ParseUint(endStr, 10, 64)
	if err != nil {
		return 0, 0, false
	}

	if end < start {
		return 0, 0, false
	}

	return start, end - start + 1, true
}

func parseCreateNodeFileDTOMultipart(r *http.Request) (*node.CreateNodeFileDTO, error) {
	form, err := r.MultipartReader()
	if err != nil {
		return nil, err
	}

	dto := &node.CreateNodeFileDTO{}

parsing:
	for {
		part, err := form.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}

		switch part.FormName() {
		case "file":

			dto.File = part
			dto.Filename = part.FileName()
			dto.Mimetype = part.Header.Get("Content-Type")

			// LAST ELEMENT TO PARSE IS FILE
			break parsing
		default:
			data, err := io.ReadAll(part)
			if err != nil {
				_ = part.Close()
				return nil, err
			}
			switch part.FormName() {
			case "parent_id":
				dto.ParentID, err = uuid.Parse(string(data))
				if err != nil {
					_ = part.Close()
					return nil, err
				}
			case "description":
				dto.Description = string(data)
			case "size":
				expectedSize, err := strconv.ParseUint(string(data), 10, 64)
				if err != nil {
					_ = part.Close()
					return nil, fmt.Errorf("invalid size provided %w", err)
				}
				dto.ExpectedSize = expectedSize
			}
		}
	}

	if err := validate.Struct(dto); err != nil {
		if dto.File != nil {
			_ = dto.File.Close()
		}

		return nil, err
	}

	return dto, nil
}
