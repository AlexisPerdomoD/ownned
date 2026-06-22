import { Badge, Button, Card } from '@shared/ui'

const DocumentIcon = () => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
    </svg>
)

const EditIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
)

const TrashIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
)

const DownloadIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
)

const formatDate = dateStr => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

const formatRelativeDate = dateStr => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return formatDate(dateStr)
}

/**
 * Card component for displaying a document.
 *
 * @param {Object} props
 * @param {import('@entities/nodes').Doc} props.doc
 * @param {(doc: import('@entities/nodes').Doc) => void} [props.onClick] - Callback when card is clicked
 * @param {(doc: import('@entities/nodes').Doc) => void} [props.onDownload] - Callback for download action
 * @param {(doc: import('@entities/nodes').Doc) => void} [props.onDelete] - Callback for delete action
 * @param {string} [props.class]
 */
export function DocCard(props) {
    return (
        <Card
            hoverable={!!props.onClick}
            class={`w-full ${props.cls}`}
            role={props.onClick ? 'button' : undefined}
            tabIndex={props.onClick ? 0 : undefined}
        >
            <Card.Body
                class="flex items-start gap-3"
                onClick={() => props.onClick?.(props.doc)}
            >
                <span class="flex items-center justify-center shrink-0 w-10 h-10 rounded-sm bg-accent-pale text-accent">
                    <DocumentIcon />
                </span>

                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <Badge variant="accent" dot>
                            Document
                        </Badge>
                    </div>

                    <h3 class="font-serif text-base text-ink-dark truncate leading-snug">
                        {props.doc.title}
                    </h3>

                    {props.doc.description && (
                        <p class="text-sm text-muted mt-1 leading-relaxed line-clamp-2">
                            {props.doc.description}
                        </p>
                    )}
                </div>
            </Card.Body>

            <Card.Footer>
                <div class="flex items-center gap-3 text-xs text-muted">
                    <span
                        title={`Created: ${formatDate(props.doc.created_at)}`}
                    >
                        Created {formatRelativeDate(props.doc.created_at)}
                    </span>
                    {props.doc.updated_at !== props.doc.created_at && (
                        <span
                            title={`Last updated: ${formatDate(props.doc.updated_at)}`}
                        >
                            Edited {formatRelativeDate(props.doc.updated_at)}
                        </span>
                    )}
                </div>

                {(props.onDownload || props.onDelete) && (
                    <div class="flex items-center gap-1">
                        {props.onDownload && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={e => {
                                    e.stopPropagation()
                                    props.onDownload(props.doc)
                                }}
                                class="p-1.5"
                                title="Download"
                            >
                                <DownloadIcon />
                            </Button>
                        )}
                        {props.onDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={e => {
                                    e.stopPropagation()
                                    props.onDelete(props.doc)
                                }}
                                class="p-1.5 text-danger hover:bg-red-50 dark:hover:bg-red-950"
                                title="Delete"
                            >
                                <TrashIcon />
                            </Button>
                        )}
                    </div>
                )}
            </Card.Footer>
        </Card>
    )
}
