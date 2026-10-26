import {
    Download,
    FileText,
    Folder,
    FolderUp,
    MessageCircle,
    Trash2
} from 'lucide-solid'
import { For, Show, createEffect, createSignal } from 'solid-js'

import { apiDownloadDoc, apiDownloadFolder } from '@/entities/docs/api'
import { useAuth } from '@/features/auth/providers/AuthProvider'
import { CommentsDrawer } from '@/features/comments/ui/CommentsDrawer'
import {
    useCreateComment,
    useDeleteComment,
    useGetComments,
    useUpdateComment
} from '@/features/comments/usecase'
import {
    formatBytes,
    formatRelativeDate
} from '@/features/node/lib/formatMetadata'
import {
    CompactNodeRow,
    DocCard,
    FolderUploadQueue,
    NodeCard,
    NodeSearch
} from '@/features/node/ui'
import {
    useCreateFolder,
    useDeleteDoc,
    useDeleteNode,
    useGetNode,
    useUploadFolder
} from '@/features/node/usecase'
import {
    CHILDREN_PAGE_SIZE,
    paginateChildren
} from '@/features/node/usecase/paginateChildren'
import { sortNodeChildren } from '@/features/node/usecase/sortNodeChildren'
import {
    canCommentOnNode,
    canCreateFolder,
    canDeleteNode,
    canReadNode,
    canUploadDoc
} from '@/shared/authz'
import { getErrorMessage } from '@/shared/errors'
import { Button, ConfirmDialog, Spinner, toast } from '@/shared/ui'
import { useLocation, useNavigate, useParams } from '@solidjs/router'

import { NodeForm } from './NodeForm'

const supportsDirectoryUpload = () =>
    typeof document !== 'undefined' &&
    'webkitdirectory' in document.createElement('input')

export function NodeView() {
    const params = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const returnTo = () => location.state?.returnTo || '/nodes'
    const openNode = nodeId =>
        navigate(`/nodes/${nodeId}`, {
            state: { returnTo: location.pathname }
        })
    const auth = useAuth()
    const { node, loading, error, refresh } = useGetNode(() => params.id)
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

    const { create, loading: creating } = useCreateFolder()
    const { remove } = useDeleteNode()

    const folderUpload = useUploadFolder(
        () => params.id,
        () => nodeData()?.children ?? [],
        refresh
    )
    const { remove: deleteDoc } = useDeleteDoc()

    const [showCreate, setShowCreate] = createSignal(false)
    const [showDelete, setShowDelete] = createSignal(false)
    const [deleteTarget, setDeleteTarget] = createSignal(null)
    const [deleteDocTarget, setDeleteDocTarget] = createSignal(null)
    const [showDeleteDoc, setShowDeleteDoc] = createSignal(false)
    const {
        comments,
        loading: commentsLoading,
        error: commentsError,
        refresh: refreshComments
    } = useGetComments(() => params.id)
    const { create: addComment, loading: addingComment } = useCreateComment()
    const { update: updateComment } = useUpdateComment()
    const { remove: deleteComment } = useDeleteComment()

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
        if (target.id === nodeData()?.id) navigate(returnTo())
        else refresh()
    }

    const handleCreate = async (name, description) => {
        const [success, result] = await create(
            nodeData()?.id,
            name,
            description
        )
        if (!success) {
            toast.error(getErrorMessage(result, 'Create failed'))
            return
        }
        setShowCreate(false)
        refresh()
    }

    const handleFilePickerChange = async e => {
        const files = Array.from(e.target?.files ?? [])
        e.target.value = ''
        if (!files.length) return
        await folderUpload.start(files)
    }

    const handleFolderPickerChange = async e => {
        const files = Array.from(e.target?.files ?? [])
        e.target.value = ''
        await folderUpload.start(files)
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
            toast.error(getErrorMessage(e, 'Folder download not available yet'))
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

    const handleCreateComment = async content => {
        const [success, result] = await addComment(nodeData()?.id, content)
        if (!success) {
            toast.error(getErrorMessage(result, 'Comment failed'))
            return false
        }
        void refreshComments()
        return true
    }

    const folderChildren = () =>
        nodeData()?.children?.filter(n => n.type === 'folder') ?? []
    const fileChildren = () =>
        nodeData()?.children?.filter(n => n.type === 'file') ?? []

    const sortNodes = list =>
        sortNodeChildren(list, sortBy(), sortDir(), showDotfiles())

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

    // Contextual row actions for the folder's compact list view.
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
                <Trash2 size={14} aria-hidden="true" />
            </button>
        </Show>
    )

    const fileRowActions = fileNode => (
        <>
            <Show
                when={
                    fileNode.doc && canReadNode(role(), fileNode.access_level)
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
                    <Download size={14} aria-hidden="true" />
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
                    <Trash2 size={14} aria-hidden="true" />
                </button>
            </Show>
        </>
    )

    return (
        <section class="flex flex-col p-4 sm:p-6">
            <Show
                when={!loading() && !error()}
                fallback={
                    <Show
                        when={loading()}
                        fallback={
                            <div
                                class="mx-auto mt-20 flex max-w-md flex-col items-center gap-3 text-center"
                                role="alert"
                            >
                                <p class="text-sm text-danger">
                                    {error() || 'Could not load this node.'}
                                </p>
                                <Button size="sm" onClick={() => refresh()}>
                                    Retry
                                </Button>
                            </div>
                        }
                    >
                        <Spinner size="lg" class="mx-auto mt-20" />
                    </Show>
                }
            >
                {/* ── Header: título (+ ruta), metas y acciones ── */}
                <header class="mb-6">
                    <button
                        type="button"
                        onClick={() => navigate(returnTo())}
                        class="text-sm text-accent hover:underline"
                    >
                        ← Back
                    </button>
                    <div class="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div class="min-w-0">
                            <h1 class="font-sans font-medium text-2xl text-ink-dark truncate">
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
                                    <MessageCircle
                                        size={15}
                                        aria-hidden="true"
                                    />
                                    Comments ({comments().length})
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
                                disabled={folderUpload.uploading()}
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
                                loading={folderUpload.uploading()}
                                onClick={() => fileInput()?.click()}
                            >
                                ⬆ Upload file
                            </Button>
                            <Show when={role() === 'super_usr_role'}>
                                <Show
                                    when={supportsDirectoryUpload()}
                                    fallback={
                                        <p class="text-xs text-muted" role="status">
                                            Folder upload is not supported in this browser.
                                        </p>
                                    }
                                >
                                    <input
                                        type="file"
                                        multiple
                                        hidden
                                        webkitdirectory="true"
                                        directory=""
                                        ref={setFolderInput}
                                        onChange={handleFolderPickerChange}
                                    />
                                <Button
                                    size="sm"
                                    loading={folderUpload.uploading()}
                                    onClick={() => folderInput()?.click()}
                                >
                                    <FolderUp size={16} aria-hidden="true" />
                                    Upload folder
                                </Button>
                                </Show>
                            </Show>
                        </Show>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleDownloadFolder}
                        >
                            <Download size={16} aria-hidden="true" />
                            Download folder
                        </Button>
                    </div>

                    <Show
                        when={
                            folderUpload.items().length > 0 ||
                            folderUpload.error()
                        }
                    >
                        <div class="mb-4">
                            <FolderUploadQueue
                                items={folderUpload.items}
                                progress={folderUpload.progress}
                                failedItems={folderUpload.failedItems}
                                retryItems={folderUpload.retryItems}
                                uploading={folderUpload.uploading}
                                cancelled={folderUpload.cancelled}
                                error={folderUpload.error}
                                onCancel={folderUpload.cancel}
                                onRetry={() => folderUpload.retryFailed()}
                                onClear={folderUpload.clear}
                            />
                        </div>
                    </Show>

                    <NodeSearch
                        rootId={() => nodeData()?.id}
                        onOpenNode={openNode}
                        onDownloadDoc={handleDownload}
                        folderActions={folderRowActions}
                        triggerClass="w-full justify-start sm:w-auto"
                    />

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
                            when={paginatedChildren().total > 0}
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
                                                <CompactNodeRow
                                                    icon={
                                                        <Folder
                                                            size={16}
                                                            aria-hidden="true"
                                                        />
                                                    }
                                                    title={nodeItem.name}
                                                    subtitle={`Folder · updated ${formatRelativeDate(nodeItem.updated_at)}`}
                                                    onOpen={() =>
                                                        openNode(nodeItem.id)
                                                    }
                                                    actions={folderRowActions(
                                                        nodeItem
                                                    )}
                                                />
                                            )}
                                        </For>
                                        <For each={paginatedChildren().files}>
                                            {fileNode => (
                                                <CompactNodeRow
                                                    icon={
                                                        <FileText
                                                            size={16}
                                                            aria-hidden="true"
                                                        />
                                                    }
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
                                                        openNode(fileNode.id)
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
                                                onClick={n => openNode(n.id)}
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
                                paginatedChildren().total > CHILDREN_PAGE_SIZE
                            }
                        >
                            <div class="mt-3 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
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
                                    of {paginatedChildren().total} items · 100
                                    per page
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

                <CommentsDrawer
                    open={showComments() && isFolderNode()}
                    onClose={() => setShowComments(false)}
                    comments={comments()}
                    loading={commentsLoading()}
                    error={commentsError()}
                    onRetry={() => refreshComments()}
                    currentUsrId={auth.state.usr?.id}
                    isSuper={auth.role() === 'super_usr_role'}
                    canComment={canCommentOnNode(
                        auth.role(),
                        nodeData()?.access_level
                    )}
                    creating={addingComment()}
                    onEdit={handleUpdateComment}
                    onDelete={handleDeleteComment}
                    onCreate={handleCreateComment}
                />

                <NodeForm
                    open={showCreate()}
                    loading={creating()}
                    onSubmit={handleCreate}
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
