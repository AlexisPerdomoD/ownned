package handler

import (
	"strconv"
	"strings"
)

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
