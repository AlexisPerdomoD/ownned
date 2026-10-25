import { For, Show, createEffect, createSignal } from 'solid-js'

import { apiDownloadDoc, apiDownloadFolder } from '@/entities/docs/api'
import { CommentForm, CommentsList } from '@/features/comments/ui/CommentsList'
import {
    useCreateComment,
    useDeleteComment,
    useGetComments,
    useUpdateComment
} from '@/features/comments/usecase'
import { DocCard, NodeCard, NodeList } from '@/features/node/ui'
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
    Button,
    ConfirmDialog,
    Spinner,
    toast
} from '@/shared/ui'
import { useAuth } from '@/features/auth/providers/AuthProvider'
import {
    canCommentOnNode,
    canCreateFolder,
    canDeleteNode,
    canUploadDoc
} from '@/shared/authz'
import { useNavigate, useParams } from '@solidjs/router'

const MIN_SEARCH_CHARS = 2

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

    const pager = usePaginateNodes()
    const docsPager = usePaginateDocs()
    const [searchInput, setSearchInput] = createSignal('')
    const [searchScope, setSearchScope] = createSignal('folder') // 'folder' | 'global'
    const [showAdvanced, setShowAdvanced] = createSignal(false)
    const [docMime, setDocMime] = createSignal('')
    const [docMinSize, setDocMinSize] = createSignal('')
    const [docMaxSize, setDocMaxSize] = createSignal('')
    const [sortBy, setSortBy] = createSignal('name')
    const [sortDir, setSortDir] = createSignal('asc')
    const [showDotfiles, setShowDotfiles] = createSignal(
        localStorage.getItem('owned.showDotfiles') === 'true'
    )

    // persist dotfile preference (D6)
    createEffect(() => {
        localStorage.setItem('owned.showDotfiles', String(showDotfiles()))
    })

    // debounce search (>=300ms, min 2 chars); advanced mode queries docs
    const runSearch = async page => {
        const q = searchInput().trim()
        if (q.length < MIN_SEARCH_CHARS) return
        const rootId =
            searchScope() === 'global' ? undefined : nodeData()?.id
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
            await pager.run(rootId, { page, limit: 10, search: q })
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
    const { update: updateComment, loading: updatingComment } = useUpdateComment()
    const { remove: deleteComment, loading: deletingComment } =
        useDeleteComment()

    const handleDelete = target => {
        setDeleteTarget(target ?? nodeData())
        setShowDelete(true)
    }

    const confirmDelete = async () => {
        const target = deleteTarget()
        if (!target) return
        const [success, err] = await remove(target.id)
        if (!success) {
            toast({
                type: 'error',
                message:
                    err?.general ||
                    err?.message ||
                    err?.detail?.reason ||
                    'Delete failed'
            })
            return
        }
        if (target.id === nodeData()?.id) navigate('/nodes')
        else refresh()
    }

    const handleCreate = async () => {
        const [success, err] = await create(nodeData()?.id, newName(), newDesc())
        if (!success) {
            toast({
                type: 'error',
                message:
                    err?.general ||
                    err?.message ||
                    err?.detail?.reason ||
                    'Create failed'
            })
            return
        }
        setShowCreate(false)
        setNewName('')
        setNewDesc('')
        refresh()
    }

    const handleUpload = async file => {
        const [success, err] = await upload(file)
        if (!success) {
            toast({
                type: 'error',
                message:
                    err?.general ||
                    err?.message ||
                    err?.detail?.reason ||
                    'Upload failed'
            })
            return
        }
        toast({ type: 'success', message: 'File uploaded successfully' })
        refresh()
    }

    const handleFilePickerChange = e => {
        const files = Array.from(e.target?.files ?? [])
        if (files.length) {
            // sequential to keep feed order and avoid parallel server state races
            files.reduce(async (acc, f) => {
                await acc
                return handleUpload(f)
            }, Promise.resolve())
        }
        e.target.value = ''
    }

    // NOTE: subcarpetas locales se recrean como carpetas hijas del nivel 1
    // (webkitRelativePath); el backend no expone recursividad de subidas.
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

        let created = 0
        for (const [name, fileList] of Object.entries(groups)) {
            const [ok, createdNode] = await create(parentId, name, '')
            if (!ok) {
                toast({ type: 'error', message: `Could not create "${name}"` })
                continue
            }
            created += 1
            for (const singleFile of fileList) {
                await upload(singleFile, '', createdNode.id)
            }
        }
        for (const singleFile of looseFiles) {
            await upload(singleFile)
        }
        refresh()
        toast({
            type: 'success',
            message: `Uploaded ${created} folder${created === 1 ? '' : 's'}`
        })
    }

    const handleDownload = async doc => {
        try {
            await apiDownloadDoc(doc.id, doc.title)
        } catch (e) {
            toast({
                type: 'error',
                message:
                    e?.message ||
                    e?.detail?.reason ||
                    'Download failed'
            })
        }
    }

    const handleDownloadFolder = async () => {
        try {
            await apiDownloadFolder(nodeData()?.id)
            toast({ type: 'success', message: 'Folder download started' })
        } catch (e) {
            toast({
                type: 'error',
                message:
                    e?.message ||
                    e?.detail?.reason ||
                    'Folder download not available yet'
            })
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
            toast({
                type: 'error',
                message:
                    err?.general ||
                    err?.message ||
                    err?.detail?.reason ||
                    'Delete failed'
            })
            return
        }
        toast({ type: 'success', message: 'File deleted successfully' })
        refresh()
    }

    const handleUpdateComment = async (commentId, content) => {
        const [success] = await updateComment(commentId, content)
        if (success) refreshComments()
        return success
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

    const formatDate = dateStr =>
        new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    const displayName = () =>
        nodeData()?.name || nodeData()?.display_path || 'Node'

    const searchResultItems = () =>
        showAdvanced() ? docsPager.results() : pager.results()
    const searchPage = () => (showAdvanced() ? docsPager.page() : pager.page())

    return (
        <section class="flex flex-col p-4 sm:p-6">
            <Show
                when={!loading()}
                fallback={<Spinner size="lg" class="mx-auto mt-20" />}
            >
                {/* ── Header: título/descr/metas a la izquierda, acciones a la derecha ── */}
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
                                {displayName()}
                            </h1>
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
                                    Updated{' '}
                                    {formatDate(nodeData()?.updated_at)}
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
                                    onClick={() =>
                                        setShowComments(v => !v)
                                    }
                                >
                                    💬 Comments ({comments().length})
                                </Button>
                            </Show>
                            <Show
                                when={canDeleteNode(role(), accessLevel())}
                            >
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

                    {/* ── Search en la parte superior ── */}
                    <section class="mb-5 flex flex-col gap-2">
                        <div class="flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                placeholder={`Search nodes (min ${MIN_SEARCH_CHARS} characters)...`}
                                value={searchInput()}
                                onInput={e => setSearchInput(e.target.value)}
                                class="flex-1 min-w-48 font-sans font-light text-sm text-ink-dark bg-surface border border-border rounded-xs px-3 py-2 focus:outline-none focus:border-ink"
                            />
                            <select
                                value={searchScope()}
                                onChange={e => setSearchScope(e.target.value)}
                                class="bg-surface border border-border rounded-xs px-2 py-2 text-sm"
                            >
                                <option value="folder">This folder</option>
                                <option value="global">Global</option>
                            </select>
                            <button
                                type="button"
                                class="text-xs text-muted underline"
                                onClick={() => setShowAdvanced(v => !v)}
                            >
                                {showAdvanced()
                                    ? 'Hide'
                                    : 'Show'}{' '}
                                advanced document search
                            </button>
                        </div>
                        <Show when={showAdvanced()}>
                            <div class="flex flex-wrap items-center gap-2 text-sm">
                                <input
                                    type="text"
                                    placeholder="mimetype"
                                    value={docMime()}
                                    onInput={e => setDocMime(e.target.value)}
                                    class="bg-surface border border-border rounded-xs px-2 py-1"
                                />
                                <input
                                    type="number"
                                    placeholder="min size (bytes)"
                                    value={docMinSize()}
                                    onInput={e => setDocMinSize(e.target.value)}
                                    class="bg-surface border border-border rounded-xs px-2 py-1 w-32"
                                />
                                <input
                                    type="number"
                                    placeholder="max size (bytes)"
                                    value={docMaxSize()}
                                    onInput={e => setDocMaxSize(e.target.value)}
                                    class="bg-surface border border-border rounded-xs px-2 py-1 w-32"
                                />
                            </div>
                        </Show>
                    </section>

                    {/* ── Resultados de búsqueda (debajo, solo si hay query) ── */}
                    <Show
                        when={
                            searchInput().trim().length >= MIN_SEARCH_CHARS &&
                            searchResultItems().length > 0
                        }
                    >
                        <section class="mb-5">
                            <h4 class="text-sm font-medium text-muted mb-1">
                                Search results
                                <span class="ml-2">
                                    {showAdvanced()
                                        ? 'documents'
                                        : 'nodes'}{' '}
                                    · page {searchPage()}
                                </span>
                            </h4>
                            <Show
                                when={!showAdvanced()}
                                fallback={
                                    <div class="flex flex-col divide-y divide-border-subtle border border-border rounded-sm">
                                        <For each={docsPager.results()}>
                                            {singleDoc => (
                                                <button
                                                    type="button"
                                                    class="text-left px-3 py-2 hover:bg-bg-2 focus-visible:bg-bg-2 focus-visible:outline-none"
                                                    onClick={() =>
                                                        navigate(
                                                            `/nodes/${singleDoc.node_id}`
                                                        )
                                                    }
                                                >
                                                    <div class="text-sm text-ink-dark truncate">
                                                        {singleDoc.title}
                                                    </div>
                                                    <div class="text-xs text-muted truncate">
                                                        {singleDoc.filename}
                                                        {' · '}
                                                        {singleDoc.mime_type}
                                                        {' · '}
                                                        {singleDoc.size_in_bytes}{' '}
                                                        bytes
                                                    </div>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                }
                            >
                                <NodeList
                                    nodes={pager.results()}
                                    loading={pager.loading()}
                                    onNodeClick={n =>
                                        navigate(`/nodes/${n.id}`)
                                    }
                                />
                            </Show>
                            <div class="mt-2 flex items-center gap-2 text-sm">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={searchPage() <= 1}
                                    onClick={() =>
                                        runSearch(searchPage() - 1)
                                    }
                                >
                                    Prev
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={searchResultItems().length < 10}
                                    onClick={() =>
                                        runSearch(searchPage() + 1)
                                    }
                                >
                                    Next
                                </Button>
                            </div>
                        </section>
                    </Show>

                    {/* ── Sort/dotfiles: fila compacta ── */}
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
                                setSortDir(d =>
                                    d === 'asc' ? 'desc' : 'asc'
                                )
                            }
                        >
                            {sortDir() === 'asc' ? '↑' : '↓'}
                        </button>
                        <label class="flex items-center gap-1 text-muted">
                            <input
                                type="checkbox"
                                checked={showDotfiles()}
                                onChange={e =>
                                    setShowDotfiles(e.target.checked)
                                }
                            />
                            Dotfiles
                        </label>
                    </div>

                    {/* ── Grid principal único ── */}
                    <section class="flex-1">
                        <Show
                            when={
                                sortedFolders().length > 0 ||
                                sortedFiles().length > 0
                            }
                            fallback={
                                <p class="text-sm text-muted">
                                    This folder is empty
                                </p>
                            }
                        >
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                                <For each={sortedFolders()}>
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
                                                    ? () => handleDelete(nodeItem)
                                                    : undefined
                                            }
                                        />
                                    )}
                                </For>
                                <For each={sortedFiles()}>
                                    {fileNode => (
                                        <DocCard
                                            node={fileNode}
                                            doc={fileNode.doc}
                                            onDownload={handleDownload}
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
                    </section>

                    <Show when={!isFolderNode()}>
                        <DocCard doc={nodeData()?.doc} />
                    </Show>
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
                                onDelete={cId =>
                                    deleteComment(cId).then(isSuccess => {
                                        if (isSuccess) refreshComments()
                                        return isSuccess
                                    })
                                }
                            />
                            <Show
                                when={canCommentOnNode(
                                    auth.role(),
                                    nodeData()?.access_level
                                )}
                            >
                                <CommentForm
                                    loading={addingComment()}
                                    onSubmit={async content => {
                                        const [success, err] =
                                            await addComment(
                                                nodeData()?.id,
                                                content
                                            )
                                        if (!success) {
                                            toast({
                                                type: 'error',
                                                message:
                                                    err?.general ||
                                                    err?.message ||
                                                    err?.detail?.reason ||
                                                    'Comment failed'
                                            })
                                            return false
                                        }
                                        refreshComments()
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
