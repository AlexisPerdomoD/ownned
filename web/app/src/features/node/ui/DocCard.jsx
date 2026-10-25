import { Show, splitProps } from 'solid-js'

const DocumentIcon = () => (
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
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
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

/**
 * Tile compacto estilo Drive para un documento.
 *
 * @param {Object} props
 * @param {import('@entities/nodes').Doc} props.doc
 * @param {(doc: import('@entities/nodes').Doc) => void} [props.onClick]
 * @param {(doc: import('@entities/nodes').Doc) => void} [props.onDownload]
 * @param {(doc: import('@entities/nodes').Doc) => void} [props.onDelete]
 * @param {string} [props.class]
 */
export function DocCard(props) {
    const [own, rest] = splitProps(props, [
        'doc',
        'node',
        'onClick',
        'onDownload',
        'onDelete'
    ])

    const doc = () =>
        own.doc ?? {
            title: own.node?.name ?? 'Document',
            description: own.node?.description,
            created_at: own.node?.created_at,
            updated_at: own.node?.updated_at
        }
    const documentName = () =>
        own.node?.name || doc().filename || doc().title || 'Document'

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={documentName()}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    own.onClick?.(doc())
                }
            }}
            class="group relative aspect-square flex flex-col items-center justify-center gap-2 p-3 text-center bg-surface border border-border rounded-sm cursor-pointer transition-colors duration-base hover:border-accent hover:bg-bg-2 focus-visible:outline-none focus-visible:border-accent"
            onClick={() => own.onClick?.(doc())}
            {...rest}
        >
            <div class="absolute top-1.5 right-1.5 flex gap-0.5">
                <Show when={own.onDownload}>
                    <button
                        type="button"
                        aria-label="Download"
                        title="Download"
                        class="p-1.5 rounded-xs text-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:text-ink transition-opacity"
                        onClick={e => {
                            e.stopPropagation()
                            own.onDownload(doc())
                        }}
                    >
                        <DownloadIcon />
                    </button>
                </Show>
                <Show when={own.onDelete}>
                    <button
                        type="button"
                        aria-label="Delete"
                        title="Delete"
                        class="p-1.5 rounded-xs text-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:text-danger hover:bg-red-50 dark:hover:bg-red-950 transition-opacity"
                        onClick={e => {
                            e.stopPropagation()
                            own.onDelete(doc())
                        }}
                    >
                        <TrashIcon />
                    </button>
                </Show>
            </div>

            <span class="flex items-center justify-center w-12 h-12 rounded-sm bg-accent-pale text-accent shrink-0">
                <DocumentIcon />
            </span>

            <h3
                class="w-full font-serif text-sm text-ink-dark leading-snug line-clamp-2 break-words"
                title={documentName()}
            >
                {documentName() || 'Untitled'}
            </h3>

            <p class="w-full text-[11px] text-muted truncate">
                {doc().mime_type ?? 'Document'}
            </p>
        </div>
    )
}

export default DocCard
