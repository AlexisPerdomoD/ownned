import { Badge, Button, Card } from '@shared/ui'

const FolderIcon = () => (
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
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
)

const FileIcon = () => (
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

const isFolder = node => node.type === 'folder'

const formatDate = dateStr => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
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
    if (diffDays < 7) return `Last ${diffDays} days`
    if (diffDays < 30) return `Last ${Math.floor(diffDays / 7)} weeks`
    if (diffDays < 365) return `Last ${Math.floor(diffDays / 30)} months`
    return formatDate(dateStr)
}

/**
 * Card component for displaying a node (folder or file).
 *
 * @param {Object} props
 * @param {import('@entities/nodes').Node} props.node
 * @param {(node: import('@entities/nodes').Node) => void} [props.onClick] - Callback when card is clicked
 * @param {(node: import('@entities/nodes').Node) => void} [props.onEdit] - Callback for edit action
 * @param {(node: import('@entities/nodes').Node) => void} [props.onDelete] - Callback for delete action
 * @param {string} [props.class]
 */
export function NodeCard(props) {
    return (
        <Card
            hoverable={!!props.onClick}
            class={`w-full ${props.cls}`}
            role={props.onClick ? 'button' : undefined}
            tabIndex={props.onClick ? 0 : undefined}
        >
            <Card.Body
                class="flex items-start gap-3"
                onClick={() => props.onClick?.(props.node)}
            >
                <span
                    class={`
                        flex items-center justify-center shrink-0
                        w-10 h-10 rounded-sm
                        ${isFolder(props.node) ? 'bg-accent-pale text-accent' : 'bg-bg-2 text-ink'}
                    `}
                >
                    {isFolder(props.node) ? <FolderIcon /> : <FileIcon />}
                </span>

                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <Badge
                            variant={
                                isFolder(props.node) ? 'neutral' : 'accent'
                            }
                            dot
                        >
                            {isFolder(props.node) ? 'Folder' : 'File'}
                        </Badge>
                    </div>

                    <h3 class="font-serif text-base text-ink-dark truncate leading-snug">
                        {props.node.name}
                    </h3>

                    {props.node.description && (
                        <p class="text-sm text-muted mt-1 leading-relaxed line-clamp-2">
                            {props.node.description}
                        </p>
                    )}
                </div>
            </Card.Body>

            <Card.Footer>
                <div class="flex items-center gap-3 text-xs text-muted">
                    <span
                        title={`Created: ${formatDate(props.node.created_at)}`}
                    >
                        Created {formatRelativeDate(props.node.created_at)}
                    </span>
                    {props.node.updated_at !== props.node.created_at && (
                        <span
                            title={`Last updated: ${formatDate(props.node.updated_at)}`}
                        >
                            Edited {formatRelativeDate(props.node.updated_at)}
                        </span>
                    )}
                </div>

                {(props.onEdit || props.onDelete) && (
                    <div class="flex items-center gap-1">
                        {props.onEdit && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={e => {
                                    e.stopPropagation()
                                    props.onEdit(props.node)
                                }}
                                class="p-1.5"
                                title="Edit"
                            >
                                <EditIcon />
                            </Button>
                        )}
                        {props.onDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={e => {
                                    e.stopPropagation()
                                    props.onDelete(props.node)
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

export default NodeCard
