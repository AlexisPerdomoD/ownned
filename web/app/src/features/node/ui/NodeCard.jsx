import { Show, splitProps } from 'solid-js'

const FolderIcon = () => (
    <svg
        width="32"
        height="32"
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
        width="32"
        height="32"
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
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-2-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
)

const isFolder = node => node.type === 'folder'

/** NOTE: `||` porque el backend puede enviar display_path: '' en paginación. */
const displayName = node => node.display_path || node.name || 'Untitled'

const formatDate = dateStr => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('es-ES', {
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
    if (diffDays < 30)
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    return formatDate(dateStr)
}

/**
 * Tile compacto estilo Drive para un nodo (carpeta o archivo).
 * Nombre + icono centrados; acciones emergen al hover (nativo siempre
 * visible por foco/teclado).
 *
 * @param {Object} props
 * @param {import('@entities/nodes').Node} props.node
 * @param {(node: import('@entities/nodes').Node) => void} [props.onClick]
 * @param {(node: import('@entities/nodes').Node) => void} [props.onDelete]
 * @param {string} [props.class]
 */
export function NodeCard(props) {
    const [own, rest] = splitProps(props, ['node', 'onClick', 'onDelete'])

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={displayName(own.node)}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    own.onClick?.(own.node)
                }
            }}
            class="group relative aspect-square flex flex-col items-center justify-center gap-2 p-3 text-center bg-surface border border-border rounded-sm cursor-pointer transition-colors duration-base hover:border-accent hover:bg-bg-2 focus-visible:outline-none focus-visible:border-accent"
            onClick={() => own.onClick?.(own.node)}
            {...rest}
        >
            <Show when={own.onDelete}>
                <button
                    type="button"
                    aria-label={`Delete ${displayName(own.node)}`}
                    class="absolute top-1.5 right-1.5 p-1.5 rounded-xs text-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:text-danger hover:bg-red-50 dark:hover:bg-red-950 transition-opacity"
                    onClick={e => {
                        e.stopPropagation()
                        own.onDelete(own.node)
                    }}
                >
                    <TrashIcon />
                </button>
            </Show>

            <span
                class={`
                    flex items-center justify-center
                    w-12 h-12 rounded-sm shrink-0
                    ${isFolder(own.node) ? 'text-accent' : 'text-ink'}
                `}
            >
                {isFolder(own.node) ? <FolderIcon /> : <FileIcon />}
            </span>

            <h3
                class="w-full font-serif text-sm text-ink-dark leading-snug line-clamp-2 break-words"
                title={displayName(own.node)}
            >
                {displayName(own.node)}
            </h3>

            <p class="w-full text-[11px] text-muted truncate">
                {isFolder(own.node) ? 'Folder' : 'File'}
                {' · '}
                {formatRelativeDate(own.node.updated_at)}
            </p>
        </div>
    )
}

export default NodeCard
