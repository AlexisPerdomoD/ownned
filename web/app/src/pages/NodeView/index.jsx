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
    usePaginateNodes,
    useUpdateNode
} from '@/features/node/usecase'
import {
    Button,
    ConfirmDialog,
    PageHeader,
    Spinner,
    Tabs,
    toast
} from '@/shared/ui'
import { useAuth } from '@/features/auth/providers/AuthProvider'
import {
    canCommentOnNode,
    canCreateFolder,
    canDeleteNode,
    canEditNode,
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

function NodeForm({ open, node, loading, onSubmit, onClose }) {
    const [name, setName] = createSignal('')
    const [description, setDescription] = createSignal('')

    createEffect(() => {
        if (open && node) {
            setName(node.name ?? '')
            setDescription(node.description ?? '')
        } else if (open) {
            setName('')
            setDescription('')
        }
    })

    const handleSubmit = e => {
        e.preventDefault()
        if (name().trim()) {
            onSubmit?.(name().trim(), description().trim())
        }
    }

    if (!open) return null

    return (
        <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            onClick={onClose}
        >
            <div
                class="bg-surface border border-border rounded-md w-full max-w-md p-6"
                onClick={e => e.stopPropagation()}
            >
                <h3 class="font-serif text-lg text-ink-dark mb-4">
                    {node ? 'Edit Node' : 'New Folder'}
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
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={loading}>
                            {node ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
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

    // debounce node search
    createEffect(() => {
        const q = searchInput()
        const scope = searchScope()
        const rootId = scope === 'global' ? undefined : nodeData()?.id
        const timer = setTimeout(() => {
            if (q.trim()) {
                pager.run(rootId, { page: 1, limit: 10, search: q.trim() })
            } else {
                // clear results when query empty
                // pager has no clear; set results via run with empty search? skip
            }
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
    const [deleteDocTarget, setDeleteDocTarget] = createSignal(null)
    const [showDeleteDoc, setShowDeleteDoc] = createSignal(false)
    const [newName, setNewName] = createSignal('')
    const [newDesc, setNewDesc] = createSignal('')
    const [tab, setTab] = createSignal('contents')

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

    const handleDelete = () => {
        setShowDelete(true)
    }

    const confirmDelete = async () => {
        const [success] = await remove(node().id)
        if (success) {
            navigate('/nodes')
        }
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
                message: e.message ?? 'Folder download not available yet'
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
    }

    const handleUpdateComment = async (commentId, content) => {
        const [success] = await updateComment(commentId, content)
        if (success) refreshComments()
        return success
    }

    const canEdit = () => nodeData()?.type === 'folder'

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
                            ? handleDelete
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
                                                    ? handleDelete
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

                    <Show when={pager.results().length > 0}>
                        <section class="mt-4">
                            <h3 class="font-serif text-lg mb-2">
                                Search results
                            </h3>
                            <NodeList
                                nodes={pager.results()}
                                loading={pager.loading()}
                                onNodeClick={n => navigate(`/nodes/${n.id}`)}
                            />
                            <div class="mt-2 flex items-center gap-2 text-sm">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={pager.page() <= 1}
                                    onClick={() =>
                                        pager.run(nodeData()?.id, {
                                            page: pager.page() - 1,
                                            limit: 10,
                                            search: searchInput()
                                        })
                                    }
                                >
                                    Prev
                                </Button>
                                <span>Page {pager.page()}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={
                                        pager.results().length < 10
                                    }
                                    onClick={() =>
                                        pager.run(nodeData()?.id, {
                                            page: pager.page() + 1,
                                            limit: 10,
                                            search: searchInput()
                                        })
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

                    <div class="mb-6 mt-6">
                        <Tabs
                            items={[
                                { key: 'contents', label: 'Contents' },
                                { key: 'comments', label: 'Comments' }
                            ]}
                            active={tab()}
                            onChange={setTab}
                        />
                    </div>
                </Show>

                <Show
                    when={nodeData()?.type === 'folder' && tab() === 'contents'}
                >
                    <section class="mt-4">
                        <h3 class="font-serif text-lg mb-2">Folders</h3>
                        <NodeList
                            nodes={sortedFolders()}
                            loading={loading()}
                            onNodeClick={n => navigate(`/nodes/${n.id}`)}
                        />
                    </section>
                </Show>

                <Show
                    when={nodeData()?.type === 'folder' && tab() === 'comments'}
                >
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
                                    isSuccess => isSuccess && refreshComments()
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
                                    onSubmit={content =>
                                        addComment(node().id, content).then(
                                            isSuccess =>
                                                isSuccess && refreshComments()
                                        )
                                    }
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
                    description={`Delete "${nodeData()?.name}" and all its contents? This cannot be undone.`}
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
