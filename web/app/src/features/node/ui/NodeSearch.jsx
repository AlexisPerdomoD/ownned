import {
    Download,
    FileText,
    Folder,
    Globe,
    Search,
    SlidersHorizontal
} from 'lucide-solid'
import {
    For,
    Show,
    createEffect,
    createSignal,
    onCleanup,
    untrack
} from 'solid-js'

import { apiDocURL } from '@/entities/docs/api'
import {
    formatBytes,
    formatRelativeDate
} from '@/features/node/lib/formatMetadata'
import { usePaginateDocs, usePaginateNodes } from '@/features/node/usecase'
import { Button, Modal } from '@/shared/ui'

import { CompactNodeRow } from './CompactNodeRow'

const MIN_SEARCH_CHARS = 2
const isViewableMime = mime =>
    /^(image\/|text\/|application\/pdf)/.test(mime ?? '')

/**
 * Search accessible folders and documents in the current folder or globally.
 * Navigation and mutations are delegated to the composing page.
 *
 * @param {Object} props
 * @param {() => string | undefined} [props.rootId]
 * @param {boolean} [props.globalOnly]
 * @param {(nodeId: string, result?: Object) => void} props.onOpenNode
 * @param {(doc: Object) => void} [props.onDownloadDoc]
 * @param {(node: Object) => import('solid-js').JSX.Element} [props.folderActions]
 */
export function NodeSearch(props) {
    const [open, setOpen] = createSignal(false)
    const [query, setQuery] = createSignal('')
    const [scopeSelection, setScopeSelection] = createSignal('folder')
    const [searchDocuments, setSearchDocuments] = createSignal(false)
    const [showFilters, setShowFilters] = createSignal(false)
    const [mimeType, setMimeType] = createSignal('')
    const [minSize, setMinSize] = createSignal('')
    const [maxSize, setMaxSize] = createSignal('')
    const nodePager = usePaginateNodes()
    const docPager = usePaginateDocs()

    const scope = () => (props.globalOnly ? 'global' : scopeSelection())
    const currentRootId = () =>
        scope() === 'global' ? undefined : props.rootId?.()
    const pager = () => (searchDocuments() ? docPager : nodePager)

    const clearResults = () => {
        nodePager.clear()
        docPager.clear()
    }

    const close = () => {
        setOpen(false)
        setQuery('')
        clearResults()
    }

    const performSearch = (
        page,
        { search, rootId, scope: searchScope, documents, filters }
    ) => {
        if (search.length < MIN_SEARCH_CHARS) return
        if (searchScope === 'folder' && !rootId) return

        if (documents) {
            nodePager.clear()
            return docPager.run(rootId, {
                page,
                limit: 10,
                search,
                mimetype: filters.mimetype,
                minSize: filters.minSize,
                maxSize: filters.maxSize
            })
        }

        docPager.clear()
        return nodePager.run(rootId, {
            page,
            limit: 10,
            search,
            type: 'folder'
        })
    }

    const runSearch = page =>
        performSearch(page, {
            search: query().trim(),
            rootId: currentRootId(),
            scope: scope(),
            documents: searchDocuments(),
            filters: {
                mimetype: mimeType().trim() || undefined,
                minSize: minSize() || undefined,
                maxSize: maxSize() || undefined
            }
        })

    createEffect(() => {
        if (!open()) return

        const search = query().trim()
        const searchScope = scope()
        const rootId = currentRootId()
        const documents = searchDocuments()
        const filters = {
            mimetype: mimeType().trim() || undefined,
            minSize: minSize() || undefined,
            maxSize: maxSize() || undefined
        }

        clearResults()

        if (search.length < MIN_SEARCH_CHARS) {
            return
        }

        if (searchScope === 'folder' && !rootId) return

        const timeout = window.setTimeout(() => {
            untrack(
                () =>
                    void performSearch(1, {
                        search,
                        rootId,
                        scope: searchScope,
                        documents,
                        filters
                    })
            )
        }, 300)
        onCleanup(() => window.clearTimeout(timeout))
    })

    const currentPager = () => pager()
    const results = () => currentPager().results()

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                class={props.triggerClass ?? ''}
                aria-haspopup="dialog"
                onClick={() => setOpen(true)}
            >
                <Search size={16} aria-hidden="true" />
                <span>Search files and folders</span>
            </Button>

            <Modal
                open={open()}
                onClose={close}
                title="Search files and folders"
                description="Search folders and documents you can access."
                size="xl"
            >
                <div class="flex max-h-[70vh] min-h-0 flex-col gap-3">
                    <input
                        type="search"
                        data-autofocus
                        value={query()}
                        onInput={event => setQuery(event.currentTarget.value)}
                        placeholder={`Enter at least ${MIN_SEARCH_CHARS} characters`}
                        aria-label="Search folders and documents"
                        class="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-ink-dark focus:border-accent focus:outline-none"
                    />

                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex flex-wrap items-center gap-1">
                            <button
                                type="button"
                                aria-pressed={!searchDocuments()}
                                class={`rounded-sm px-3 py-1.5 text-sm ${searchDocuments() ? 'text-muted hover:bg-bg-2' : 'bg-bg-2 text-ink-dark'}`}
                                onClick={() => setSearchDocuments(false)}
                            >
                                <Folder
                                    size={15}
                                    class="mr-1.5 inline"
                                    aria-hidden="true"
                                />
                                Folders
                            </button>
                            <button
                                type="button"
                                aria-pressed={searchDocuments()}
                                class={`rounded-sm px-3 py-1.5 text-sm ${searchDocuments() ? 'bg-bg-2 text-ink-dark' : 'text-muted hover:bg-bg-2'}`}
                                onClick={() => setSearchDocuments(true)}
                            >
                                <FileText
                                    size={15}
                                    class="mr-1.5 inline"
                                    aria-hidden="true"
                                />
                                Documents
                            </button>
                        </div>

                        <Show when={!props.globalOnly}>
                            <div class="flex items-center gap-1 text-xs">
                                <button
                                    type="button"
                                    aria-pressed={scope() === 'folder'}
                                    class={`rounded-sm px-2 py-1 ${scope() === 'folder' ? 'bg-bg-2 text-ink-dark' : 'text-muted hover:bg-bg-2'}`}
                                    onClick={() => setScopeSelection('folder')}
                                >
                                    Current folder
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={scope() === 'global'}
                                    class={`rounded-sm px-2 py-1 ${scope() === 'global' ? 'bg-bg-2 text-ink-dark' : 'text-muted hover:bg-bg-2'}`}
                                    onClick={() => setScopeSelection('global')}
                                >
                                    <Globe
                                        size={13}
                                        class="mr-1 inline"
                                        aria-hidden="true"
                                    />
                                    Everywhere
                                </button>
                            </div>
                        </Show>
                    </div>

                    <Show when={searchDocuments()}>
                        <button
                            type="button"
                            aria-expanded={showFilters()}
                            class="self-start text-xs text-muted hover:text-ink"
                            onClick={() => setShowFilters(value => !value)}
                        >
                            <SlidersHorizontal
                                size={13}
                                class="mr-1 inline"
                                aria-hidden="true"
                            />
                            {showFilters() ? 'Hide filters' : 'Filters'}
                        </button>
                    </Show>

                    <Show when={searchDocuments() && showFilters()}>
                        <div class="flex flex-wrap items-end gap-2 rounded-sm border border-border-subtle bg-bg-2 p-2">
                            <label class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted sm:min-w-40">
                                MIME type
                                <input
                                    type="text"
                                    value={mimeType()}
                                    onInput={event =>
                                        setMimeType(event.currentTarget.value)
                                    }
                                    placeholder="application/pdf"
                                    class="w-full rounded-xs border border-border bg-surface px-2 py-1.5 text-sm text-ink-dark"
                                />
                            </label>
                            <label class="flex w-24 flex-col gap-1 text-xs text-muted">
                                Min bytes
                                <input
                                    type="number"
                                    min="0"
                                    value={minSize()}
                                    onInput={event =>
                                        setMinSize(event.currentTarget.value)
                                    }
                                    class="w-full rounded-xs border border-border bg-surface px-2 py-1.5 text-sm text-ink-dark"
                                />
                            </label>
                            <label class="flex w-24 flex-col gap-1 text-xs text-muted">
                                Max bytes
                                <input
                                    type="number"
                                    min="0"
                                    value={maxSize()}
                                    onInput={event =>
                                        setMaxSize(event.currentTarget.value)
                                    }
                                    class="w-full rounded-xs border border-border bg-surface px-2 py-1.5 text-sm text-ink-dark"
                                />
                            </label>
                        </div>
                    </Show>

                    <div
                        class="min-h-0 flex-1 overflow-y-auto rounded-sm border border-border-subtle"
                        aria-live="polite"
                        aria-busy={currentPager().loading()}
                    >
                        <Show
                            when={query().trim().length >= MIN_SEARCH_CHARS}
                            fallback={
                                <p class="px-3 py-5 text-center text-sm text-muted">
                                    Type at least {MIN_SEARCH_CHARS} characters
                                    to search.
                                </p>
                            }
                        >
                            <Show when={currentPager().loading()}>
                                <p
                                    class="px-3 py-5 text-center text-sm text-muted"
                                    role="status"
                                >
                                    Searching…
                                </p>
                            </Show>
                            <Show when={currentPager().error()}>
                                <p
                                    class="px-3 py-5 text-sm text-danger"
                                    role="alert"
                                >
                                    {currentPager().error()}
                                </p>
                            </Show>
                            <Show
                                when={
                                    currentPager().hasSearched() &&
                                    !currentPager().loading() &&
                                    !currentPager().error() &&
                                    results().length === 0
                                }
                            >
                                <p class="px-3 py-5 text-center text-sm text-muted">
                                    No matching{' '}
                                    {searchDocuments()
                                        ? 'documents'
                                        : 'folders'}
                                    .
                                </p>
                            </Show>
                            <For each={results()}>
                                {result => (
                                    <Show
                                        when={searchDocuments()}
                                        fallback={
                                            <CompactNodeRow
                                                icon={<Folder size={17} />}
                                                title={result.name}
                                                subtitle={`Folder · updated ${formatRelativeDate(result.updated_at)}`}
                                                onOpen={() => {
                                                    close()
                                                    props.onOpenNode?.(
                                                        result.id,
                                                        result
                                                    )
                                                }}
                                                actions={props.folderActions?.(
                                                    result
                                                )}
                                            />
                                        }
                                    >
                                        <CompactNodeRow
                                            icon={<FileText size={17} />}
                                            title={
                                                result.filename || result.title
                                            }
                                            subtitle={`${result.mime_type || 'Document'} · ${formatBytes(result.size_in_bytes)}`}
                                            onOpen={() => {
                                                close()
                                                props.onOpenNode?.(
                                                    result.node_id,
                                                    result
                                                )
                                            }}
                                            actions={
                                                <>
                                                    <Show
                                                        when={
                                                            props.onDownloadDoc
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            aria-label={`Download ${result.filename || result.title}`}
                                                            class="rounded-xs p-1.5 text-muted hover:bg-bg-2 hover:text-ink"
                                                            onClick={event => {
                                                                event.stopPropagation()
                                                                props.onDownloadDoc?.(
                                                                    result
                                                                )
                                                            }}
                                                        >
                                                            <Download
                                                                size={15}
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    </Show>
                                                    <Show
                                                        when={isViewableMime(
                                                            result.mime_type
                                                        )}
                                                    >
                                                        <a
                                                            href={apiDocURL(
                                                                result.id
                                                            )}
                                                            target="_blank"
                                                            rel="noopener"
                                                            aria-label={`Open ${result.filename || result.title} in a new tab`}
                                                            class="rounded-xs p-1.5 text-muted hover:bg-bg-2 hover:text-ink"
                                                            onClick={event =>
                                                                event.stopPropagation()
                                                            }
                                                        >
                                                            ↗
                                                        </a>
                                                    </Show>
                                                </>
                                            }
                                        />
                                    </Show>
                                )}
                            </For>
                        </Show>
                    </div>

                    <Show
                        when={
                            currentPager().hasSearched() &&
                            currentPager().totalPages() > 1
                        }
                    >
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted">
                                Page {currentPager().page()} of{' '}
                                {currentPager().totalPages()}
                            </span>
                            <div class="flex gap-2">
                                <button
                                    type="button"
                                    class="text-accent disabled:opacity-40"
                                    disabled={currentPager().page() <= 1}
                                    onClick={() =>
                                        runSearch(currentPager().page() - 1)
                                    }
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    class="text-accent disabled:opacity-40"
                                    disabled={
                                        currentPager().page() >=
                                        currentPager().totalPages()
                                    }
                                    onClick={() =>
                                        runSearch(currentPager().page() + 1)
                                    }
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </Show>
                </div>
            </Modal>
        </>
    )
}
