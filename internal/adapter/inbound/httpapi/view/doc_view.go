package view

import (
	"time"

	"ownned/internal/domain"
)

type DocView struct {
	ID          domain.DocID  `json:"id"`
	NodeID      domain.NodeID `json:"node_id"`
	Description string        `json:"description"`
	Title       string        `json:"title"`
	Filename    string        `json:"filename"`
	MimeType    string        `json:"mime_type"`
	SizeInBytes uint64        `json:"size_in_bytes"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

func DocViewFromDomain(d *domain.Doc) DocView {
	if d == nil {
		return DocView{}
	}

	return DocView{
		ID:          d.ID,
		NodeID:      d.NodeID,
		Description: d.Description,
		Title:       d.Title,
		Filename:    d.Filename,
		MimeType:    d.MimeType,
		SizeInBytes: d.SizeInBytes,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}
