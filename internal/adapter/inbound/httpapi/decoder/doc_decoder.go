package decoder

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	"ownned/internal/application/dto"

	"github.com/google/uuid"
)

func CreateDocInputDTOFromMultipartOnDemand(r *http.Request) (*dto.CreateDocInputDTO, error) {
	form, err := r.MultipartReader()
	if err != nil {
		return nil, err
	}

	dto := &dto.CreateDocInputDTO{}

loop:
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
			// dejamos el part directo como dto.File
			dto.File = part
			dto.Filename = part.FileName()
			dto.Mimetype = part.Header.Get("Content-Type")
			break loop
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
				size, err := strconv.ParseUint(string(data), 10, 64)
				if err != nil {
					_ = part.Close()
					return nil, fmt.Errorf("invalid size provided %w", err)
				}
				dto.ExpectedSize = size
			}
		}
	}

	return dto, nil
}
