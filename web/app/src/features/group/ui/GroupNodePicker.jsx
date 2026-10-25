import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js'

import { apiGetNode, apiGetRoot, apiPaginateNodes } from '@/entities/nodes/api'
import { getErrorMessage } from '@/shared/errors'
import { Modal } from '@/shared/ui'

const PAGE_SIZE = 20

/**
 * Navigable picker for sharing an accessible node with a group.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(nodeId: string) => Promise<boolean>} props.onSelect
 * @param {string[]} [props.assignedNodeIds]
 * @param {boolean} [props.busy]
 */
export function GroupNodePicker(props) {
    const [roots, setRoots] = createSignal([])
    const [stack, setStack] = createSignal([])
    const [children, setChildren] = createSignal([])
    const [loading, setLoading] = createSignal(false)
    const [loadError, setLoadError] = createSignal(null)
    const [search, setSearch] = createSignal('')
    const [searchPage, setSearchPage] = createSignal(1)
    const [searchResults, setSearchResults] = createSignal([])
    const [searchLoading, setSearchLoading] = createSignal(false)
    const [searchError, setSearchError] = createSignal(null)
    const [searchTotal, setSearchTotal] = createSignal(0)
    const [searchTotalPages, setSearchTotalPages] = createSignal(0)
    let searchRequest = 0

    const currentFolder = () => stack().at(-1)
    const isSearching = () => search().trim().length >= 2
    const visibleNodes = () =>
        isSearching()
            ? searchResults()
            : stack().length > 0
              ? children()
              : roots()
    const assignedIds = () => new Set(props.assignedNodeIds ?? [])
    const isAssigned = nodeId => assignedIds().has(nodeId)

    const loadRoots = async () => {
        setLoading(true)
        setLoadError(null)
        try {
            setRoots((await apiGetRoot()) ?? [])
        } catch (error) {
            setLoadError(getErrorMessage(error, 'Could not load accessible nodes.'))
        } finally {
            setLoading(false)
        }
    }

    createEffect(() => {
        if (!props.open) return
        setRoots([])
        setStack([])
        setChildren([])
        setSearch('')
        setSearchPage(1)
        void loadRoots()
    })

    createEffect(() => {
        const query = search().trim()
        const rootId = currentFolder()?.id
        const page = searchPage()
        const open = props.open
        const requestId = ++searchRequest
        setSearchResults([])
        setSearchError(null)
        setSearchTotal(0)
        setSearchTotalPages(0)

        if (!open || query.length < 2) {
            setSearchLoading(false)
            return
        }

        setSearchLoading(true)
        const timer = setTimeout(async () => {
            try {
                const result = await apiPaginateNodes({
                    rootId,
                    page,
                    limit: PAGE_SIZE,
                    search: query
                })
                if (requestId !== searchRequest) return
                setSearchResults(result.data ?? [])
                setSearchTotal(result.total_count ?? 0)
                setSearchTotalPages(result.total_pages ?? 0)
            } catch (error) {
                if (requestId === searchRequest) {
                    setSearchError(
                        getErrorMessage(error, 'Could not search nodes.')
                    )
                }
            } finally {
                if (requestId === searchRequest) setSearchLoading(false)
            }
        }, 300)

        onCleanup(() => clearTimeout(timer))
    })

    const openFolder = async folder => {
        setLoading(true)
        setLoadError(null)
        try {
            const result = await apiGetNode(folder.id)
            setStack(previous => [
                ...previous,
                {
                    id: result.id,
                    name: result.name,
                    display_path: result.display_path,
                    children: result.children ?? []
                }
            ])
            setChildren(result.children ?? [])
            setSearch('')
            setSearchPage(1)
        } catch (error) {
            setLoadError(
                getErrorMessage(error, 'Could not open this folder.')
            )
        } finally {
            setLoading(false)
        }
    }

    const navigateTo = index => {
        if (index < 0) {
            setStack([])
            setChildren([])
        } else {
            const next = stack().slice(0, index + 1)
            setStack(next)
            setChildren(next.at(-1)?.children ?? [])
        }
        setSearch('')
        setSearchPage(1)
        setLoadError(null)
    }

    const selectNode = async node => {
        if (isAssigned(node.id)) return
        if (await props.onSelect?.(node.id)) props.onClose?.()
    }

    const selectCurrentFolder = async () => {
        const folder = currentFolder()
        if (folder) await selectNode(folder)
    }

    return (
        <Modal
            open={props.open}
            onClose={props.onClose}
            title="Choose a node to share"
            description="Browse accessible folders or search within the current location."
            size="lg"
        >
            <div class="flex flex-col gap-3">
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <button
                        type="button"
                        class="text-accent hover:underline disabled:opacity-50"
                        disabled={stack().length === 0}
                        onClick={() => navigateTo(-1)}
                    >
                        All roots
                    </button>
                    <For each={stack()}>
                        {(folder, index) => (
                            <>
                                <span aria-hidden="true">/</span>
                                <button
                                    type="button"
                                    class="text-accent hover:underline"
                                    onClick={() => navigateTo(index())}
                                >
                                    {folder.name}
                                </button>
                            </>
                        )}
                    </For>
                </div>

                <div class="flex flex-wrap gap-2">
                    <input
                        type="search"
                        value={search()}
                        onInput={event => {
                            setSearch(event.currentTarget.value)
                            setSearchPage(1)
                        }}
                        placeholder="Search nodes (min 2 characters)"
                        aria-label="Search nodes in this location"
                        class="min-w-0 flex-1 bg-bg border border-border rounded-xs px-3 py-2 text-sm"
                    />
                    <Show when={currentFolder()}>
                        <button
                            type="button"
                            class="px-3 py-2 bg-accent text-on-accent rounded-xs text-sm disabled:opacity-50"
                            disabled={
                                props.busy ||
                                isAssigned(currentFolder()?.id) ||
                                loading()
                            }
                            onClick={selectCurrentFolder}
                        >
                            {isAssigned(currentFolder()?.id)
                                ? 'Already shared'
                                : 'Share this folder'}
                        </button>
                    </Show>
                </div>

                <Show when={search().trim().length === 1}>
                    <p class="text-xs text-muted">
                        Enter at least 2 characters to search.
                    </p>
                </Show>

                <Show when={loading() || searchLoading()}>
                    <p class="py-4 text-center text-sm text-muted" role="status">
                        Loading nodes…
                    </p>
                </Show>
                <Show when={props.busy}>
                    <p class="text-sm text-muted" role="status">
                        Sharing node…
                    </p>
                </Show>
                <Show when={loadError() || searchError()}>
                    <p class="py-3 text-sm text-danger" role="alert">
                        {isSearching() ? searchError() : loadError()}
                    </p>
                </Show>

                <Show
                    when={
                        !loading() &&
                        !searchLoading() &&
                        !loadError() &&
                        !searchError() &&
                        visibleNodes().length > 0
                    }
                    fallback={
                        <Show
                            when={
                                !loading() &&
                                !searchLoading() &&
                                !loadError() &&
                                !searchError()
                            }
                        >
                            <p class="py-4 text-center text-sm text-muted">
                                {isSearching()
                                    ? 'No matching nodes.'
                                    : 'No nodes in this location.'}
                            </p>
                        </Show>
                    }
                >
                    <div class="max-h-72 overflow-y-auto border border-border-subtle rounded-sm">
                        <For each={visibleNodes()}>
                            {node => (
                                <div class="flex items-center gap-2 px-3 py-2 border-b border-border-subtle last:border-b-0">
                                    <button
                                        type="button"
                                        class="min-w-0 flex-1 text-left hover:text-accent"
                                        onClick={() =>
                                            node.type === 'folder'
                                                ? openFolder(node)
                                                : selectNode(node)
                                        }
                                    >
                                        <span class="mr-2" aria-hidden="true">
                                            {node.type === 'folder' ? '📁' : '📄'}
                                        </span>
                                        <span class="text-sm font-medium">
                                            {node.name || 'Untitled'}
                                        </span>
                                        <Show when={node.display_path}>
                                            <span class="block pl-7 text-xs text-muted truncate">
                                                {node.display_path}
                                            </span>
                                        </Show>
                                    </button>
                                    <Show when={node.type === 'folder'}>
                                        <button
                                            type="button"
                                            class="px-2 py-1 text-xs text-accent hover:underline"
                                            disabled={props.busy || loading()}
                                            onClick={() => openFolder(node)}
                                        >
                                            Open
                                        </button>
                                    </Show>
                                    <button
                                        type="button"
                                        class="px-2 py-1 text-xs text-accent hover:underline disabled:opacity-50"
                                        disabled={
                                            props.busy ||
                                            isAssigned(node.id) ||
                                            loading()
                                        }
                                        onClick={() => selectNode(node)}
                                    >
                                        {isAssigned(node.id)
                                            ? 'Shared'
                                            : 'Select'}
                                    </button>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>

                <Show when={isSearching() && searchTotalPages() > 1}>
                    <div class="flex items-center justify-between text-xs text-muted">
                        <span>
                            {searchPage()} / {searchTotalPages()} ·{' '}
                            {searchTotal()} nodes
                        </span>
                        <div class="flex gap-3">
                            <button
                                type="button"
                                class="text-accent disabled:opacity-50"
                                disabled={searchPage() <= 1}
                                onClick={() => setSearchPage(page => page - 1)}
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                class="text-accent disabled:opacity-50"
                                disabled={searchPage() >= searchTotalPages()}
                                onClick={() => setSearchPage(page => page + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </Show>
            </div>
        </Modal>
    )
}
