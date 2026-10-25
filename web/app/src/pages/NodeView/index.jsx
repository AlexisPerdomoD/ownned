import { For, Show, createEffect, createSignal } from 'solid-js'

import { apiDownloadDoc, apiDownloadFolder } from '@/entities/docs/api'
import { CommentForm, CommentsList } from '@/features/comments/ui/CommentsList'
import {
    useCreateComment,
    useDeleteComment,
    useGetComments,
    useUpdateComment
} from '@/features/comments/usecase'
import { DocCard, NodeCard, NodeList, UploadDropzone } from '@/features/node/ui'
import {
    useCreateDoc,
    useCreateFolder,
    useDeleteDoc,
    useDeleteNode,
    useGetNode,
    usePaginateDocs,
    usePaginateNodes,
    useUpdateNode
} from '@/features/node/usecase'
import {
    Button,
    ConfirmDialog,
    PageHeader,
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

function NodeOverview({ node, onEdit, onDelete }) {
    return (
        <section class="flex flex-col items-center">
            <section class="max-w-md w-full">
                <section class="mb-4 py-4">
                    <h1 class="text-2xl font-semibold text-center font-serif pb-2">
                        {node.name}
                    </h1>
                    <h3 class="text-sm text-center font-serif pb-2">
                        {node.type === 'folder' ? 'Folder' : 'File'}
                    </h3>
                    <p class="text-sm text-center">{node.description}</p>
                    <p class="text-sm text-center">Created {node.created_at}</p>
                    <Show when={node.updated_at !== node.created_at}>
                        <p class="text-sm text-center">
                            Last updated {node.updated_at}
                        </p>
                    </Show>
                </section>
                <section class="flex justify-center gap-2">
                    <Button variant="ghost" size="sm" onClick={onEdit}>
                        Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={onDelete}>
                        Delete
                    </Button>
                </section>
            </section>
        </section>
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

    // debounce search; advanced mode queries docs (mimetype/size filters)
    const runSearch = async page => {
        const q = searchInput().trim()
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
        const mime = docMime()
        const minS = docMinSize()
        const maxS = docMaxSize()
        const advanced = showAdvanced()
        const rootId = scope === 'global' ? undefined : nodeData()?.id
        const timer = setTimeout(() => {
            if (!q) {
                pager.clear()
                docsPager.clear()
                return
            }
            if (rootId || scope === 'global') runSearch(1)
        }, 300)
        return () => clearTimeout(timer)
    })
    const { create, loading: creating } = useCreateFolder()
    const { update, loading: updating } = useUpdateNode()
    const { remove, loading: deleting } = useDeleteNode()

    const { upload, loading: uploading } = useCreateDoc(() => params.id)
    const { remove: deleteDoc, loading: deletingDoc } = useDeleteDoc()

    const [showForm, setShowForm] = createSignal(false)
    const [editingNode, setEditingNode] = createSignal(null)
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

    const handleEdit = () => {
        setEditingNode(node())
        setShowForm(true)
    }

    const handleDelete = target => {
        setDeleteTarget(target ?? nodeData())
        setShowDelete(true)
    }

    const confirmDelete = async () => {
        const target = deleteTarget()
        if (!target) return
        const [success] = await remove(target.id)
        if (!success) return
        if (target.id === nodeData()?.id) navigate('/nodes')
        else refresh()
    }

    const handleUpdate = async (name, description) => {
        const [success] = await update(node().id, name, description)
        if (success) {
            setShowForm(false)
            setEditingNode(null)
        }
    }

    const handleCreate = async () => {
        const [success, err] = await create(node().id, newName(), newDesc())
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

    return (
        <section class="flex flex-col p-6">
            <Show
                when={!loading()}
                fallback={<Spinner size="lg" class="mx-auto mt-20" />}
            >
                <PageHeader
                    title={nodeData()?.display_path ?? nodeData()?.name ?? 'Node'}
                    subtitle={nodeData()?.type}
                    backTo="/nodes"
                />

                <Show
                    when={
                        nodeData()?.type === 'folder' &&
                        canCreateFolder(role(), accessLevel())
                    }
                >
                    <div class="mb-4">
                        <Button onClick={() => setShowCreate(true)}>
                            + New Folder
                        </Button>
                    </div>
                </Show>

                <Show when={nodeData()?.type === 'folder'}>
                    <div class="mb-4">
                        <Button variant="ghost" onClick={handleDownloadFolder}>
                            Download folder
                        </Button>
                    </div>
                </Show>

                <NodeOverview
                    node={nodeData()}
                    onEdit={undefined}
                    onDelete={
                        canDeleteNode(role(), accessLevel())
                            ? () => handleDelete()
                            : undefined
                    }
                />

                <Show when={nodeData()?.type === 'folder'}>
                    <section class="mt-4">
                        <h3 class="font-serif text-lg mb-2">Contents</h3>
                        <Show
                            when={
                                sortedFolders().length > 0 ||
                                sortedFiles().length > 0
                            }
                            fallback={
                                <p class="text-sm text-muted">
                                    No files in this folder
                                </p>
                            }
                        >
                            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                <For each={sortedFolders()}>
                                    {nodeItem => (
                                        <NodeCard
                                            node={nodeItem}
                                            onClick={n =>
                                                navigate(`/nodes/${n.id}`)
                                            }
                                            onEdit={undefined}
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
                                            doc={fileNode.doc}
                                            node={fileNode}
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

                    <Show
                        when={canUploadDoc(role(), accessLevel())}
                    >
                        <section class="mt-4">
                            <UploadDropzone
                                onUpload={handleUpload}
                                loading={uploading()}
                            />
                        </section>
                    </Show>
                </Show>

                <Show when={nodeData()?.type === 'file'}>
                    <DocCard doc={nodeData()?.doc} />
                </Show>

                <Show when={nodeData()?.type === 'folder'}>
                    <section class="mt-4 flex flex-col gap-2">
                        <div class="flex items-center gap-2">
                            <select
                                value={searchScope()}
                                onChange={e => setSearchScope(e.target.value)}
                                class="bg-surface border border-border rounded-xs px-2 py-2 text-sm"
                            >
                                <option value="folder">This folder</option>
                                <option value="global">Global</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Search nodes..."
                                value={searchInput()}
                                onInput={e => setSearchInput(e.target.value)}
                                class="flex-1 font-sans font-light text-sm text-ink-dark bg-surface border border-border rounded-xs px-3 py-2 focus:outline-none focus:border-ink"
                            />
                        </div>
                        <button
                            type="button"
                            class="text-xs text-muted underline self-start"
                            onClick={() => setShowAdvanced(v => !v)}
                        >
                            {showAdvanced() ? 'Hide' : 'Show'} advanced document search
                        </button>
                        <Show when={showAdvanced()}>
                            <div class="flex items-center gap-2 text-sm">
                                <input
                                    type="text"
                                    placeholder="mimetype"
                                    value={docMime()}
                                    onInput={e => setDocMime(e.target.value)}
                                    class="bg-surface border border-border rounded-xs px-2 py-1"
                                />
                                <input
                                    type="number"
                                    placeholder="min size"
                                    value={docMinSize()}
                                    onInput={e => setDocMinSize(e.target.value)}
                                    class="bg-surface border border-border rounded-xs px-2 py-1 w-24"
                                />
                                <input
                                    type="number"
                                    placeholder="max size"
                                    value={docMaxSize()}
                                    onInput={e => setDocMaxSize(e.target.value)}
                                    class="bg-surface border border-border rounded-xs px-2 py-1 w-24"
                                />
                            </div>
                        </Show>
                    </section>

                    <Show
                        when={
                            showAdvanced()
                                ? docsPager.results().length > 0
                                : pager.results().length > 0
                        }
                    >
                        <section class="mt-4">
                            <h3 class="font-serif text-lg mb-2">
                                Search results
                                <span class="text-sm font-normal text-muted ml-2">
                                    {showAdvanced()
                                        ? 'documents'
                                        : 'nodes'}
                                </span>
                            </h3>
                            <Show
                                when={!showAdvanced()}
                                fallback={
                                    <div class="flex flex-col divide-y divide-border-subtle">
                                        <For
                                            each={docsPager.results()}
                                        >
                                            {singleDoc => (
                                                <button
                                                    type="button"
                                                    class="text-left px-3 py-2 hover:bg-bg-2"
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
                                    disabled={(showAdvanced() ? docsPager.page() : pager.page()) <= 1}
                                    onClick={() =>
                                        runSearch(
                                            (showAdvanced()
                                                ? docsPager.page()
                                                : pager.page()) - 1
                                        )
                                    }
                                >
                                    Prev
                                </Button>
                                <span>
                                    Page{' '}
                                    {showAdvanced()
                                        ? docsPager.page()
                                        : pager.page()}
                                </span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={
                                        (showAdvanced()
                                            ? docsPager.results()
                                            : pager.results()).length < 10
                                    }
                                    onClick={() =>
                                        runSearch(
                                            (showAdvanced()
                                                ? docsPager.page()
                                                : pager.page()) + 1
                                        )
                                    }
                                >
                                    Next
                                </Button>
                            </div>
                        </section>
                    </Show>

                    <section class="mt-4 flex items-center gap-2 text-sm">
                        <label>Sort:</label>
                        <select
                            value={sortBy()}
                            onChange={e => setSortBy(e.target.value)}
                            class="bg-surface border border-border rounded-xs px-2 py-1"
                        >
                            <option value="name">Name</option>
                            <option value="created">Created</option>
                            <option value="updated">Updated</option>
                        </select>
                        <button
                            type="button"
                            class="px-2 py-1 border border-border rounded-xs"
                            onClick={() =>
                                setSortDir(d =>
                                    d === 'asc' ? 'desc' : 'asc'
                                )
                            }
                        >
                            {sortDir() === 'asc' ? '↑' : '↓'}
                        </button>
                        <label class="ml-4 flex items-center gap-1">
                            <input
                                type="checkbox"
                                checked={showDotfiles()}
                                onChange={e =>
                                    setShowDotfiles(e.target.checked)
                                }
                            />
                            Show dotfiles
                        </label>
                    </section>

                    <section class="mt-4">
                        <h3 class="font-serif text-lg mb-2">Comments</h3>
                        <CommentsList
                            comments={comments()}
                            loading={commentsLoading()}
                            currentUsrId={auth.state.usr?.id}
                            isSuper={auth.role() === 'super_usr_role'}
                            onEdit={handleUpdateComment}
                            onDelete={cId =>
                                deleteComment(cId).then(
                                    isSuccess => {
                                        if (isSuccess) refreshComments()
                                        return isSuccess
                                    }
                                )
                            }
                        />
                        <Show
                            when={canCommentOnNode(
                                auth.role(),
                                nodeData()?.access_level
                            )}
                        >
                            <div class="mt-4">
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
                            </div>
                        </Show>
                    </section>
                </Show>

                <NodeForm
                    open={showForm()}
                    node={editingNode()}
                    loading={updating() || deleting()}
                    onSubmit={handleUpdate}
                    onClose={() => {
                        setShowForm(false)
                        setEditingNode(null)
                    }}
                />

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
