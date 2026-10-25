import { For, Show, createEffect, createSignal } from 'solid-js'

import {
    apiDocURL,
    apiDownloadDoc,
    apiDownloadFolder
} from '@/entities/docs/api'
import { useAuth } from '@/features/auth/providers/AuthProvider'
import { CommentForm, CommentsList } from '@/features/comments/ui/CommentsList'
import {
    useCreateComment,
    useDeleteComment,
    useGetComments,
    useUpdateComment
} from '@/features/comments/usecase'
import { DocCard, NodeCard } from '@/features/node/ui'
import {
    useCreateDoc,
    useCreateFolder,
    useDeleteDoc,
    useDeleteNode,
    useGetNode,
    usePaginateDocs,
    usePaginateNodes
} from '@/features/node/usecase'
import {
    CHILDREN_PAGE_SIZE,
    paginateChildren
} from '@/features/node/usecase/paginateChildren'
import {
    canCommentOnNode,
    canCreateFolder,
    canDeleteNode,
    canReadNode,
    canUploadDoc
} from '@/shared/authz'
import { getErrorMessage } from '@/shared/errors'
import { Button, ConfirmDialog, Spinner, toast } from '@/shared/ui'
import { useNavigate, useParams } from '@solidjs/router'

const MIN_SEARCH_CHARS = 2

const isViewableMime = mime =>
    /^(image\/|text\/|application\/pdf)/.test(mime ?? '')

const formatBytes = bytes => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatRelativeDate = dateStr => {
    if (!dateStr) return ''
    const diffDays = Math.floor((new Date() - new Date(dateStr)) / 86400000)
    if (diffDays <= 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 30)
        return new Date(dateStr).toLocaleDateString('es-ES', {
            month: 'short',
            day: 'numeric'
        })
    return new Date(dateStr).toLocaleDateString('es-ES', {
        month: 'short',
        year: 'numeric'
    })
}

const FolderRowIcon = () => (
    <svg
        width="16"
        height="16"
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

const FileRowIcon = () => (
    <svg
        width="16"
        height="16"
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

const TrashRowIcon = () => (
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

const DownloadRowIcon = () => (
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
 * Fila compacta estilo lista (search dropdown y vista lista).
 *
 * @param {Object} props
 * @param {import('solid-js').JSX.Element} props.icon
 * @param {import('solid-js').JSX.Element} props.title
 * @param {import('solid-js').JSX.Element} [props.subtitle]
 * @param {() => void} [props.onOpen]
 * @param {import('solid-js').JSX.Element} [props.actions]
 */
function CompactItemRow(props) {
    return (
        <div
            class="group flex items-center gap-3 px-3 py-2 border-b border-border-subtle last:border-b-0 hover:bg-bg-2 cursor-pointer"
            onClick={() => props.onOpen?.()}
        >
            <span class="shrink-0 text-muted">{props.icon}</span>
            <div class="min-w-0 flex-1">
                <div class="text-sm text-ink-dark truncate">{props.title}</div>
                <Show when={props.subtitle}>
                    <div class="text-xs text-muted truncate">
                        {props.subtitle}
                    </div>
                </Show>
            </div>
            <div class="flex items-center gap-1 shrink-0">{props.actions}</div>
        </div>
    )
}

function NodeForm(props) {
    const [name, setName] = createSignal('')
    const [description, setDescription] = createSignal('')

    createEffect(() => {
        if (props.open) {
            setName(props.node?.name ?? '')
            setDescription(props.node?.description ?? '')
        }
    })

    const handleSubmit = e => {
        e.preventDefault()
        if (name().trim()) {
            props.onSubmit?.(name().trim(), description().trim())
        }
    }

    return (
        <Show when={props.open}>
            <div
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                onClick={() => props.onClose?.()}
            >
                <div
                    class="bg-surface border border-border rounded-md w-full max-w-md p-6"
                    onClick={e => e.stopPropagation()}
                >
                    <h3 class="font-serif text-lg text-ink-dark mb-4">
                        {props.node ? 'Edit Node' : 'New Folder'}
                    </h3>

                    <form onSubmit={handleSubmit} class="flex flex-col gap-4">
                        <div class="flex flex-col gap-1">
                            <label class="text-xs text-muted uppercase tracking-wide">
                                Name *
                            </label>
                            <input
                                type="text"
                                value={name()}
                                onInput={e => setName(e.target.value)}
                                maxLength={255}
                                class="
                                    w-full font-sans font-light text-sm
                                    text-ink-dark
                                    bg-bg border border-border rounded-xs
                                    px-3 py-2
                                    focus:outline-none focus:border-ink
                                "
                                required
                            />
                        </div>

                        <div class="flex flex-col gap-1">
                            <label class="text-xs text-muted uppercase tracking-wide">
                                Description
                            </label>
                            <textarea
                                value={description()}
                                onInput={e => setDescription(e.target.value)}
                                rows={2}
                                maxLength={255}
                                class="
                                    w-full font-sans font-light text-sm
                                    text-ink-dark
                                    bg-bg border border-border rounded-xs
                                    px-3 py-2 resize-none
                                    focus:outline-none focus:border-ink
                                "
                            />
                        </div>

                        <div class="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => props.onClose?.()}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" loading={props.loading}>
                                {props.node ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </Show>
    )
}

export function NodeView() {
    const params = useParams()
    const navigate = useNavigate()
    const auth = useAuth()
    const { node, loading, refresh } = useGetNode(() => params.id)
    const nodeData = () => node()
    const role = () => auth.role()
    const accessLevel = () => nodeData()?.access_level
    const isFolderNode = () => nodeData()?.type === 'folder'

    const [fileInput, setFileInput] = createSignal(null)
    const [folderInput, setFolderInput] = createSignal(null)
    const [showComments, setShowComments] = createSignal(false)
    const [childrenPage, setChildrenPage] = createSignal(1)
    const [viewMode, setViewMode] = createSignal(
        localStorage.getItem('owned.viewMode') ?? 'grid'
    )

    const pager = usePaginateNodes()
    const docsPager = usePaginateDocs()
    const [searchInput, setSearchInput] = createSignal('')
    const [searchScope, setSearchScope] = createSignal('folder') // 'folder' | 'global'
    const [showAdvanced, setShowAdvanced] = createSignal(false)
    const [searchOpen, setSearchOpen] = createSignal(false)
    const [docMime, setDocMime] = createSignal('')
    const [docMinSize, setDocMinSize] = createSignal('')
    const [docMaxSize, setDocMaxSize] = createSignal('')
    const [sortBy, setSortBy] = createSignal('name')
    const [sortDir, setSortDir] = createSignal('asc')
    const [showDotfiles, setShowDotfiles] = createSignal(
        localStorage.getItem('owned.showDotfiles') === 'true'
    )

    // persist preferences (D6)
    createEffect(() => {
        localStorage.setItem('owned.showDotfiles', String(showDotfiles()))
    })
    createEffect(() => {
        localStorage.setItem('owned.viewMode', viewMode())
    })

    // NOTE: en paginación el backend no envía display_path; se usa el name.
    // Cuando el backend lo incluya la UI lo consumirá sin cambios.
    const parentPath = () => nodeData()?.display_path || nodeData()?.name || ''

    // debounce search (>=300ms, min 2 chars folders-only in node mode)
    const runSearch = async page => {
        const q = searchInput().trim()
        if (q.length < MIN_SEARCH_CHARS) return
        const rootId = searchScope() === 'global' ? undefined : nodeData()?.id
        if (searchScope() === 'folder' && !rootId) return
        if (showAdvanced()) {
            await docsPager.run(rootId, {
                page,
                limit: 10,
                search: q,
                mimetype: docMime().trim() || undefined,
                minSize: docMinSize() || undefined,
                maxSize: docMaxSize() || undefined
            })
        } else {
            await pager.run(rootId, {
                page,
                limit: 10,
                search: q,
                type: 'folder'
            })
        }
    }

    createEffect(() => {
        const q = searchInput().trim()
        const scope = searchScope()
        // subscribed so the debounce restarts when filters change
        const _mime = docMime()
        const _minSize = docMinSize()
        const _maxSize = docMaxSize()
        const _advanced = showAdvanced()
        const rootId = scope === 'global' ? undefined : nodeData()?.id
        if (q.length >= MIN_SEARCH_CHARS) {
            pager.clear()
            docsPager.clear()
        }
        const timer = setTimeout(() => {
            if (q.length < MIN_SEARCH_CHARS) {
                pager.clear()
                docsPager.clear()
                return
            }
            if (rootId || scope === 'global') runSearch(1)
        }, 300)
        return () => clearTimeout(timer)
    })

    const { create, loading: creating } = useCreateFolder()
    const { remove, loading: deleting } = useDeleteNode()

    const { upload, loading: uploading } = useCreateDoc(() => params.id)
    const { remove: deleteDoc, loading: deletingDoc } = useDeleteDoc()

    const [showCreate, setShowCreate] = createSignal(false)
    const [showDelete, setShowDelete] = createSignal(false)
    const [deleteTarget, setDeleteTarget] = createSignal(null)
    const [deleteDocTarget, setDeleteDocTarget] = createSignal(null)
    const [showDeleteDoc, setShowDeleteDoc] = createSignal(false)
    const [newName, setNewName] = createSignal('')
    const [newDesc, setNewDesc] = createSignal('')

    const {
        comments,
        loading: commentsLoading,
        refresh: refreshComments
    } = useGetComments(() => params.id)
    const { create: addComment, loading: addingComment } = useCreateComment()
    const { update: updateComment, loading: updatingComment } =
        useUpdateComment()
    const { remove: deleteComment, loading: deletingComment } =
        useDeleteComment()

    const handleDelete = target => {
        setDeleteTarget(target ?? nodeData())
        setShowDelete(true)
    }

    const confirmDelete = async () => {
        const target = deleteTarget()
        if (!target) return
        const [success, result] = await remove(target.id)
        if (!success) {
            toast.error(getErrorMessage(result, 'Delete failed'))
            return
        }
        if (target.id === nodeData()?.id) navigate('/nodes')
        else refresh()
    }

    const handleCreate = async () => {
        const [success, result] = await create(
            nodeData()?.id,
            newName(),
            newDesc()
        )
        if (!success) {
            toast.error(getErrorMessage(result, 'Create failed'))
            return
        }
        setShowCreate(false)
        setNewName('')
        setNewDesc('')
        refresh()
    }

    // Subidas en lote: takenNames se acumula localmente con el nombre que
    // devuelve el backend (result.name, ya resuelto), así los duplicados del
    // mismo lote enumeran a (1), a (2)... sin consultas extra.
    const uploadBatch = async (files, parentIdOverride, takenNames) => {
        for (const batchFile of files) {
            const [success, result] = await upload(
                batchFile,
                '',
                parentIdOverride,
                takenNames ? [...takenNames] : []
            )
            if (!success) {
                toast.error(getErrorMessage(result, 'Upload failed'))
                continue
            }
            takenNames?.add?.(
                result?.name ?? batchFile.name
            )
        }
    }

    const handleFilePickerChange = async e => {
        const files = Array.from(e.target?.files ?? [])
        e.target.value = ''
        if (!files.length) return
        const taken = new Set((nodeData()?.children ?? []).map(n => n.name))
        await uploadBatch(files, undefined, taken)
        refresh()
    }

    // NOTE: subcarpetas locales se recrean como carpetas hijas del nivel 1
    // (webkitRelativePath); el backend no expone recursividad de subidas.
    // Cada subcarpeta recién creada arranca con un set vacío y los nombres
    // que este lote ya resolvió se acumulan ahí (doc.name).
    const handleFolderPickerChange = async e => {
        const files = Array.from(e.target?.files ?? [])
        e.target.value = ''
        const parentId = nodeData()?.id
        if (!parentId) return

        const groups = {}
        const looseFiles = []
        for (const singleFile of files) {
            const rel = singleFile.webkitRelativePath || singleFile.name
            const first = rel.split('/')[0]
            if (first && first !== singleFile.name) {
                groups[first] = groups[first] ?? []
                groups[first].push(singleFile)
            } else {
                looseFiles.push(singleFile)
            }
        }

        const takenRoot = new Set((nodeData()?.children ?? []).map(n => n.name))
        let created = 0
        for (const [name, fileList] of Object.entries(groups)) {
            const [ok, result] = await create(parentId, name, '')
            if (!ok) {
                toast.error(
                    getErrorMessage(result, `Could not create "${name}"`)
                )
                continue
            }
            created += 1
            await uploadBatch(fileList, result.id, new Set())
        }
        await uploadBatch(looseFiles, undefined, takenRoot)
        refresh()
        toast.success(`Uploaded ${created} folder${created === 1 ? '' : 's'}`)
    }

    const handleDownload = async doc => {
        try {
            await apiDownloadDoc(doc.id, doc.title)
        } catch (e) {
            toast.error(getErrorMessage(e, 'Download failed'))
        }
    }

    const handleDownloadFolder = async () => {
        try {
            await apiDownloadFolder(nodeData()?.id)
            toast.success('Folder download started')
        } catch (e) {
            toast.error(
                getErrorMessage(e, 'Folder download not available yet')
            )
        }
    }

    const handleDeleteDoc = doc => {
        setDeleteDocTarget(doc)
        setShowDeleteDoc(true)
    }

    const confirmDeleteDoc = async () => {
        const doc = deleteDocTarget()
        if (!doc) return
        const [success, err] = await deleteDoc(doc.id)
        if (!success) {
            toast.error(getErrorMessage(err, 'Delete failed'))
            return
        }
        toast.success('File deleted successfully')
        refresh()
    }

    const handleUpdateComment = async (commentId, content) => {
        const [success, result] = await updateComment(commentId, content)
        if (success) refreshComments()
        else toast.error(getErrorMessage(result, 'Comment update failed'))
        return success
    }

    const handleDeleteComment = async commentId => {
        const [success, result] = await deleteComment(commentId)
        if (success) refreshComments()
        else toast.error(getErrorMessage(result, 'Comment delete failed'))
    }

    const folderChildren = () =>
        nodeData()?.children?.filter(n => n.type === 'folder') ?? []
    const fileChildren = () =>
        nodeData()?.children?.filter(n => n.type === 'file') ?? []

    const sortNodes = list => {
        const filtered = showDotfiles()
            ? list
            : list.filter(n => !String(n.name ?? '').startsWith('.'))
        return [...filtered].sort((a, b) => {
            let va
            let vb
            if (sortBy() === 'name') {
                va = String(a.name ?? '')
                vb = String(b.name ?? '')
            } else if (sortBy() === 'created') {
                va = a.created_at ?? ''
                vb = b.created_at ?? ''
            } else {
                va = a.updated_at ?? ''
                vb = b.updated_at ?? ''
            }
            if (va < vb) return sortDir() === 'asc' ? -1 : 1
            if (va > vb) return sortDir() === 'asc' ? 1 : -1
            return 0
        })
    }

    const sortedFolders = () => sortNodes(folderChildren())
    const sortedFiles = () => sortNodes(fileChildren())
    const paginatedChildren = () =>
        paginateChildren(sortedFolders(), sortedFiles(), childrenPage())

    createEffect(() => {
        nodeData()?.id
        showDotfiles()
        sortBy()
        sortDir()
        setChildrenPage(1)
    })

    createEffect(() => {
        const { page } = paginatedChildren()
        if (childrenPage() !== page) setChildrenPage(page)
    })

    const formatDate = dateStr =>
        new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })

    const searchResultItems = () =>
        showAdvanced() ? docsPager.results() : pager.results()
    const searchPage = () => (showAdvanced() ? docsPager.page() : pager.page())
    const hasSearchQuery = () => searchInput().trim().length >= MIN_SEARCH_CHARS
    const searchLoading = () =>
        showAdvanced() ? docsPager.loading() : pager.loading()
    const searchError = () =>
        showAdvanced() ? docsPager.error() : pager.error()
    const searchHasSearched = () =>
        showAdvanced() ? docsPager.hasSearched() : pager.hasSearched()
    const searchTotalPages = () =>
        showAdvanced() ? docsPager.totalPages() : pager.totalPages()

    // rows for list view and search dropdown
    const folderRowActions = folderNode => (
        <Show when={canDeleteNode(role(), folderNode.access_level)}>
            <button
                type="button"
                aria-label={`Delete ${folderNode.name}`}
                class="p-1.5 rounded-xs text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger transition-opacity"
                onClick={e => {
                    e.stopPropagation()
                    handleDelete(folderNode)
                }}
            >
                <TrashRowIcon />
            </button>
        </Show>
    )

    const fileRowActions = fileNode => (
        <>
            <Show
                when={
                    fileNode.doc &&
                    canReadNode(role(), fileNode.access_level)
                }
            >
                <button
                    type="button"
                    aria-label="Download"
                    title="Download"
                    class="p-1.5 rounded-xs text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink transition-opacity"
                    onClick={e => {
                        e.stopPropagation()
                        handleDownload(fileNode.doc)
                    }}
                >
                    <DownloadRowIcon />
                </button>
            </Show>
            <Show when={canDeleteNode(role(), fileNode.access_level)}>
                <button
                    type="button"
                    aria-label="Delete"
                    title="Delete"
                    class="p-1.5 rounded-xs text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger transition-opacity"
                    onClick={e => {
                        e.stopPropagation()
                        handleDeleteDoc(fileNode.doc ?? fileNode)
                    }}
                >
                    <TrashRowIcon />
                </button>
            </Show>
        </>
    )

    return (
        <section class="flex flex-col p-4 sm:p-6">
            <Show
                when={!loading()}
                fallback={<Spinner size="lg" class="mx-auto mt-20" />}
            >
                {/* ── Header: título (+ ruta), metas y acciones ── */}
                <header class="mb-6">
                    <a
                        href="/nodes"
                        class="text-sm text-accent hover:underline"
                    >
                        ← Back
                    </a>
                    <div class="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div class="min-w-0">
                            <h1 class="font-serif text-2xl text-ink-dark truncate">
                                {nodeData()?.name || 'Node'}
                            </h1>
                            <Show when={parentPath()}>
                                <p class="text-xs text-muted mt-0.5 truncate">
                                    {parentPath()}
                                </p>
                            </Show>
                            <p class="text-sm text-muted mt-1">
                                {isFolderNode() ? 'Folder' : 'File'}
                                {' · '}
                                Created {formatDate(nodeData()?.created_at)}
                                <Show
                                    when={
                                        nodeData()?.updated_at !==
                                        nodeData()?.created_at
                                    }
                                >
                                    {' · '}
                                    Updated {formatDate(nodeData()?.updated_at)}
                                </Show>
                            </p>
                            <Show when={nodeData()?.description}>
                                <p class="text-sm text-ink mt-1">
                                    {nodeData()?.description}
                                </p>
                            </Show>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <Show when={isFolderNode()}>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowComments(v => !v)}
                                >
                                    💬 Comments ({comments().length})
                                </Button>
                            </Show>
                            <Show when={canDeleteNode(role(), accessLevel())}>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleDelete()}
                                >
                                    Delete
                                </Button>
                            </Show>
                        </div>
                    </div>
                </header>

                <Show when={isFolderNode()}>
                    {/* ── Toolbar: acciones agrupadas ── */}
                    <div class="flex flex-wrap items-center gap-2 mb-3">
                        <Show when={canCreateFolder(role(), accessLevel())}>
                            <Button
                                size="sm"
                                onClick={() => setShowCreate(true)}
                            >
                                + New Folder
                            </Button>
                        </Show>
                        <Show when={canUploadDoc(role(), accessLevel())}>
                            <input
                                type="file"
                                multiple
                                hidden
                                ref={setFileInput}
                                onChange={handleFilePickerChange}
                            />
                            <Button
                                size="sm"
                                onClick={() => fileInput()?.click()}
                            >
                                ⬆ Upload file
                            </Button>
                            <input
                                type="file"
                                multiple
                                hidden
                                webkitdirectory="true"
                                directory=""
                                ref={setFolderInput}
                                onChange={handleFolderPickerChange}
                            />
                            <Show when={role() === 'super_usr_role'}>
                                <Button
                                    size="sm"
                                    onClick={() => folderInput()?.click()}
                                >
                                    📁 Upload folder
                                </Button>
                            </Show>
                        </Show>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDownloadFolder}
                        >
                            ⬇ Download folder
                        </Button>
                    </div>

                    {/* ── Search flotante ── */}
                    <section class="relative z-30 mb-5">
                        <div class="flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                placeholder={`Search folders (min ${MIN_SEARCH_CHARS} characters)...`}
                                value={searchInput()}
                                onInput={e => setSearchInput(e.target.value)}
                                onFocus={() => setSearchOpen(true)}
                                onKeyDown={e => {
                                    if (e.key === 'Escape') setSearchOpen(false)
                                }}
                                class="w-full max-w-xl font-sans font-light text-sm text-ink-dark bg-surface border border-border rounded-xs px-3 py-2 focus:outline-none focus:border-ink"
                            />
                            <div class="flex items-center rounded-xs border border-border overflow-hidden shrink-0 text-sm">
                                <button
                                    type="button"
                                    class={`px-3 py-1.5 cursor-pointer transition-colors ${
                                        searchScope() === 'folder'
                                            ? 'bg-bg-2 text-ink'
                                            : 'text-muted hover:bg-bg-2'
                                    }`}
                                    onClick={() => setSearchScope('folder')}
                                    title="Search inside the current folder"
                                >
                                    📂 Current folder
                                </button>
                                <button
                                    type="button"
                                    class={`px-3 py-1.5 cursor-pointer border-l border-border transition-colors ${
                                        searchScope() === 'global'
                                            ? 'bg-bg-2 text-ink'
                                            : 'text-muted hover:bg-bg-2'
                                    }`}
                                    onClick={() => setSearchScope('global')}
                                    title="Search everywhere"
                                >
                                    🌐 Everywhere
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            class="mt-1.5 text-xs text-muted underline self-start"
                            onClick={() => setShowAdvanced(v => !v)}
                        >
                            {showAdvanced()
                                ? 'Hide filters'
                                : 'Search documents with filters'}
                        </button>

                        {/* Filtros avanzados organizados */}
                        <Show when={showAdvanced()}>
                            <div class="mt-2 flex flex-wrap items-end gap-3 max-w-xl bg-bg-2 border border-border-subtle rounded-sm px-3 py-2">
                                <label class="flex flex-col gap-0.5 text-xs text-muted">
                                    Mimetype
                                    <input
                                        type="text"
                                        placeholder="e.g. application/pdf"
                                        value={docMime()}
                                        onInput={e =>
                                            setDocMime(e.target.value)
                                        }
                                        class="bg-surface border border-border rounded-xs px-2 py-1 text-sm w-48"
                                    />
                                </label>
                                <label class="flex flex-col gap-0.5 text-xs text-muted">
                                    Min size
                                    <input
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                        value={docMinSize()}
                                        onInput={e =>
                                            setDocMinSize(e.target.value)
                                        }
                                        class="bg-surface border border-border rounded-xs px-2 py-1 text-sm w-24"
                                    />
                                </label>
                                <label class="flex flex-col gap-0.5 text-xs text-muted">
                                    Max size
                                    <input
                                        type="number"
                                        placeholder="∞"
                                        min="0"
                                        value={docMaxSize()}
                                        onInput={e =>
                                            setDocMaxSize(e.target.value)
                                        }
                                        class="bg-surface border border-border rounded-xs px-2 py-1 text-sm w-24"
                                    />
                                </label>
                                <button
                                    type="button"
                                    class="text-xs text-muted underline pb-1"
                                    onClick={() => {
                                        setDocMime('')
                                        setDocMinSize('')
                                        setDocMaxSize('')
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        </Show>

                        {/* Dropdown flotante de resultados */}
                        <Show
                            when={
                                searchOpen() &&
                                hasSearchQuery() &&
                                (searchLoading() ||
                                    searchError() ||
                                    searchHasSearched())
                            }
                        >
                            <div
                                class="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-sm shadow-lg max-h-96 overflow-y-auto"
                                role="listbox"
                                aria-label="Search results"
                            >
                                <div class="sticky top-0 bg-surface border-b border-border-subtle flex items-center justify-between px-3 py-1.5 z-10">
                                    <span class="text-xs text-muted">
                                        {showAdvanced()
                                            ? 'Documents'
                                            : 'Folders'}
                                        {' · '}
                                        page {searchPage()} of{' '}
                                        {searchTotalPages() || 1}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Close results"
                                        class="text-muted hover:text-ink text-sm cursor-pointer"
                                        onClick={() => setSearchOpen(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <Show when={searchLoading()}>
                                    <p class="px-3 py-4 text-sm text-muted" role="status">
                                        Searching…
                                    </p>
                                </Show>
                                <Show when={searchError()}>
                                    <p class="px-3 py-4 text-sm text-danger" role="alert">
                                        {searchError()}
                                    </p>
                                </Show>
                                <Show
                                    when={
                                        searchHasSearched() &&
                                        !searchLoading() &&
                                        !searchError() &&
                                        searchResultItems().length === 0
                                    }
                                >
                                    <p class="px-3 py-4 text-sm text-muted">
                                        No matching{' '}
                                        {showAdvanced() ? 'documents' : 'folders'}.
                                    </p>
                                </Show>
                                <Show
                                    when={searchResultItems().length > 0}
                                >
                                    <Show
                                        when={!showAdvanced()}
                                        fallback={
                                        <>
                                            <For each={docsPager.results()}>
                                                {singleDoc => (
                                                    <CompactItemRow
                                                        icon={<FileRowIcon />}
                                                        title={singleDoc.title}
                                                        subtitle={`${singleDoc.filename} · ${singleDoc.mime_type} · ${formatBytes(singleDoc.size_in_bytes)}`}
                                                        onOpen={() => {
                                                            setSearchOpen(false)
                                                            navigate(
                                                                `/nodes/${singleDoc.node_id}`
                                                            )
                                                        }}
                                                        actions={
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    aria-label="Download"
                                                                    title="Download"
                                                                    class="p-1.5 rounded-xs text-muted hover:text-ink transition-colors"
                                                                    onClick={e => {
                                                                        e.stopPropagation()
                                                                        handleDownload(
                                                                            singleDoc
                                                                        )
                                                                    }}
                                                                >
                                                                    <DownloadRowIcon />
                                                                </button>
                                                                <Show
                                                                    when={isViewableMime(
                                                                        singleDoc.mime_type
                                                                    )}
                                                                >
                                                                    <a
                                                                        href={apiDocURL(
                                                                            singleDoc.id
                                                                        )}
                                                                        target="_blank"
                                                                        rel="noopener"
                                                                        aria-label="Open in browser"
                                                                        title="Open in browser"
                                                                        class="p-1.5 rounded-xs text-muted hover:text-ink text-xs"
                                                                        onClick={e =>
                                                                            e.stopPropagation()
                                                                        }
                                                                    >
                                                                        ↗
                                                                    </a>
                                                                </Show>
                                                            </>
                                                        }
                                                    />
                                                )}
                                            </For>
                                            <div class="flex items-center gap-2 px-3 py-1.5 border-t border-border-subtle text-xs">
                                                <button
                                                    type="button"
                                                    class="text-accent disabled:opacity-40 hover:underline"
                                                    disabled={searchPage() <= 1}
                                                    onClick={() =>
                                                        runSearch(
                                                            searchPage() - 1
                                                        )
                                                    }
                                                >
                                                    ← Prev
                                                </button>
                                                <button
                                                    type="button"
                                                    class="text-accent disabled:opacity-40 hover:underline"
                                                    disabled={
                                                        searchPage() >=
                                                        searchTotalPages()
                                                    }
                                                    onClick={() =>
                                                        runSearch(
                                                            searchPage() + 1
                                                        )
                                                    }
                                                >
                                                    Next →
                                                </button>
                                            </div>
                                        </>
                                        }
                                    >
                                    <For each={pager.results()}>
                                        {folderResult => (
                                            <CompactItemRow
                                                icon={<FolderRowIcon />}
                                                title={folderResult.name}
                                                subtitle={`Folder · updated ${formatRelativeDate(folderResult.updated_at)}`}
                                                onOpen={() => {
                                                    setSearchOpen(false)
                                                    navigate(
                                                        `/nodes/${folderResult.id}`
                                                    )
                                                }}
                                                actions={folderRowActions(
                                                    folderResult
                                                )}
                                            />
                                        )}
                                    </For>
                                    <div class="flex items-center gap-2 px-3 py-1.5 border-t border-border-subtle text-xs">
                                        <button
                                            type="button"
                                            class="text-accent disabled:opacity-40 disabled:hover:no-underline hover:underline"
                                            disabled={searchPage() <= 1}
                                            onClick={() =>
                                                runSearch(searchPage() - 1)
                                            }
                                        >
                                            ← Prev
                                        </button>
                                        <button
                                            type="button"
                                            class="text-accent disabled:opacity-40 hover:underline"
                                            disabled={
                                                searchPage() >=
                                                searchTotalPages()
                                            }
                                            onClick={() =>
                                                runSearch(searchPage() + 1)
                                            }
                                        >
                                            Next →
                                        </button>
                                    </div>
                                    </Show>
                                </Show>
                            </div>
                        </Show>
                    </section>

                    {/* ── Controles: sort, vista, ocultos ── */}
                    <div class="flex flex-wrap items-center gap-2 text-sm mb-2">
                        <select
                            value={sortBy()}
                            onChange={e => setSortBy(e.target.value)}
                            class="bg-surface border border-border rounded-xs px-2 py-1"
                        >
                            <option value="name">Sort by: Name</option>
                            <option value="created">Sort by: Created</option>
                            <option value="updated">Sort by: Updated</option>
                        </select>
                        <button
                            type="button"
                            aria-label="Toggle sort direction"
                            class="px-2 py-1 border border-border rounded-xs hover:bg-bg-2"
                            onClick={() =>
                                setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
                            }
                        >
                            {sortDir() === 'asc' ? '↑' : '↓'}
                        </button>
                        <div class="flex items-center rounded-xs border border-border overflow-hidden">
                            <button
                                type="button"
                                aria-label="Grid view"
                                title="Grid view"
                                class={`px-2 py-1 cursor-pointer transition-colors ${
                                    viewMode() === 'grid'
                                        ? 'bg-bg-2 text-ink'
                                        : 'text-muted hover:bg-bg-2'
                                }`}
                                onClick={() => setViewMode('grid')}
                            >
                                ▦
                            </button>
                            <button
                                type="button"
                                aria-label="List view"
                                title="List view"
                                class={`px-2 py-1 cursor-pointer border-l border-border transition-colors ${
                                    viewMode() === 'list'
                                        ? 'bg-bg-2 text-ink'
                                        : 'text-muted hover:bg-bg-2'
                                }`}
                                onClick={() => setViewMode('list')}
                            >
                                ☰
                            </button>
                        </div>
                        <label class="ml-auto flex items-center gap-1 text-muted">
                            <input
                                type="checkbox"
                                checked={showDotfiles()}
                                onChange={e =>
                                    setShowDotfiles(e.target.checked)
                                }
                            />
                            Show hidden
                        </label>
                    </div>

                    {/* ── Grid/lista principal único ── */}
                    <section class="flex-1">
                        <Show
                            when={
                                paginatedChildren().total > 0
                            }
                            fallback={
                                <p class="text-sm text-muted">
                                    This folder is empty
                                </p>
                            }
                        >
                            <Show
                                when={viewMode() === 'grid'}
                                fallback={
                                    <div class="border border-border rounded-sm">
                                        <For each={paginatedChildren().folders}>
                                            {nodeItem => (
                                                <CompactItemRow
                                                    icon={<FolderRowIcon />}
                                                    title={nodeItem.name}
                                                    subtitle={`Folder · updated ${formatRelativeDate(nodeItem.updated_at)}`}
                                                    onOpen={() =>
                                                        navigate(
                                                            `/nodes/${nodeItem.id}`
                                                        )
                                                    }
                                                    actions={folderRowActions(
                                                        nodeItem
                                                    )}
                                                />
                                            )}
                                        </For>
                                        <For each={paginatedChildren().files}>
                                            {fileNode => (
                                                <CompactItemRow
                                                    icon={<FileRowIcon />}
                                                    title={fileNode.name}
                                                    subtitle={[
                                                        'File',
                                                        fileNode.doc?.mime_type,
                                                        fileNode.doc
                                                            ?.size_in_bytes
                                                            ? formatBytes(
                                                                  fileNode.doc
                                                                      .size_in_bytes
                                                              )
                                                            : null
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                    onOpen={() =>
                                                        navigate(
                                                            `/nodes/${fileNode.id}`
                                                        )
                                                    }
                                                    actions={fileRowActions(
                                                        fileNode
                                                    )}
                                                />
                                            )}
                                        </For>
                                    </div>
                                }
                            >
                                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                                    <For each={paginatedChildren().folders}>
                                        {nodeItem => (
                                            <NodeCard
                                                node={nodeItem}
                                                onClick={n =>
                                                    navigate(`/nodes/${n.id}`)
                                                }
                                                onDelete={
                                                    canDeleteNode(
                                                        role(),
                                                        nodeItem.access_level
                                                    )
                                                        ? () =>
                                                              handleDelete(
                                                                  nodeItem
                                                              )
                                                        : undefined
                                                }
                                            />
                                        )}
                                    </For>
                                    <For each={paginatedChildren().files}>
                                        {fileNode => (
                                            <DocCard
                                                node={fileNode}
                                                doc={fileNode.doc}
                                                onDownload={
                                                    canReadNode(
                                                        role(),
                                                        fileNode.access_level
                                                    )
                                                        ? handleDownload
                                                        : undefined
                                                }
                                                onDelete={
                                                    canDeleteNode(
                                                        role(),
                                                        fileNode.access_level
                                                    )
                                                        ? handleDeleteDoc
                                                        : undefined
                                                }
                                            />
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </Show>
                        <Show
                            when={
                                paginatedChildren().total >
                                CHILDREN_PAGE_SIZE
                            }
                        >
                            <div class="mt-3 flex items-center justify-between text-xs text-muted">
                                <span>
                                    Showing{' '}
                                    {(paginatedChildren().page - 1) *
                                        CHILDREN_PAGE_SIZE +
                                        1}
                                    –
                                    {Math.min(
                                        paginatedChildren().page *
                                            CHILDREN_PAGE_SIZE,
                                        paginatedChildren().total
                                    )}{' '}
                                    of {paginatedChildren().total} items · 100 per page
                                </span>
                                <div class="flex items-center gap-2">
                                    <button
                                        type="button"
                                        class="text-accent disabled:opacity-40 hover:underline"
                                        disabled={paginatedChildren().page <= 1}
                                        onClick={() =>
                                            setChildrenPage(page => page - 1)
                                        }
                                    >
                                        Previous
                                    </button>
                                    <span>
                                        {paginatedChildren().page} /{' '}
                                        {paginatedChildren().totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        class="text-accent disabled:opacity-40 hover:underline"
                                        disabled={
                                            paginatedChildren().page >=
                                            paginatedChildren().totalPages
                                        }
                                        onClick={() =>
                                            setChildrenPage(page => page + 1)
                                        }
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </Show>
                    </section>
                </Show>

                <Show when={!isFolderNode() && nodeData()?.type === 'file'}>
                    <DocCard doc={nodeData()?.doc} />
                </Show>

                {/* ── Comentarios: drawer lateral con toggle ── */}
                <Show when={showComments() && isFolderNode()}>
                    <div
                        class="fixed inset-0 z-40 bg-black/30 sm:hidden"
                        onClick={() => setShowComments(false)}
                        aria-hidden="true"
                    />
                    <aside
                        role="complementary"
                        aria-label="Comments"
                        class="fixed top-0 right-0 h-full w-full sm:w-96 z-50 bg-surface border-l border-border shadow-md flex flex-col overflow-hidden"
                    >
                        <div class="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                            <h3 class="font-serif text-lg text-ink-dark">
                                Comments
                            </h3>
                            <button
                                type="button"
                                aria-label="Close comments"
                                class="text-muted hover:text-ink px-1 text-lg cursor-pointer"
                                onClick={() => setShowComments(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                            <CommentsList
                                comments={comments()}
                                loading={commentsLoading()}
                                currentUsrId={auth.state.usr?.id}
                                isSuper={auth.role() === 'super_usr_role'}
                                onEdit={handleUpdateComment}
                                onDelete={handleDeleteComment}
                            />
                            <Show
                                when={canCommentOnNode(
                                    auth.role(),
                                    nodeData()?.access_level
                                )}
                            >
                                <CommentForm
                                    loading={addingComment()}
                                    onSubmit={content => {
                                        addComment(
                                            nodeData()?.id,
                                            content
                                        ).then(([isSuccess, result]) => {
                                            if (!isSuccess) {
                                                toast.error(
                                                    getErrorMessage(
                                                        result,
                                                        'Comment failed'
                                                    )
                                                )
                                                return false
                                            }

                                            refreshComments()
                                        })
                                    }}
                                />
                            </Show>
                        </div>
                    </aside>
                </Show>

                <NodeForm
                    open={showCreate()}
                    node={null}
                    loading={creating()}
                    onSubmit={(name, desc) => {
                        setNewName(name)
                        setNewDesc(desc)
                        handleCreate()
                    }}
                    onClose={() => setShowCreate(false)}
                />

                <ConfirmDialog
                    open={showDelete()}
                    onClose={() => setShowDelete(false)}
                    onConfirm={confirmDelete}
                    title="Delete folder"
                    description={`Delete "${deleteTarget()?.name}" and all its contents? This cannot be undone.`}
                    confirmLabel="Delete"
                />

                <ConfirmDialog
                    open={showDeleteDoc()}
                    onClose={() => setShowDeleteDoc(false)}
                    onConfirm={confirmDeleteDoc}
                    title="Delete document"
                    description={`Delete "${deleteDocTarget()?.title}"? This cannot be undone.`}
                    confirmLabel="Delete"
                />
            </Show>
        </section>
    )
}
