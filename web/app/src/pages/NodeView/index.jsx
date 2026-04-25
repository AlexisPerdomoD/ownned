import { Show, createEffect, createSignal } from 'solid-js'

import { CommentForm, CommentsList } from '@/features/comments/ui/CommentsList'
import {
    useCreateComment,
    useDeleteComment,
    useGetComments
} from '@/features/comments/usecase'
import { DocCard, NodeList } from '@/features/node/ui'
import {
    useCreateFolder,
    useDeleteNode,
    useGetNode,
    useUpdateNode
} from '@/features/node/usecase'
import { Button, PageHeader, Spinner, Tabs } from '@/shared/ui'
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
                class="bg-[--color-surface] border border-[--color-border] rounded-[--radius-md] w-full max-w-md p-6"
                onClick={e => e.stopPropagation()}
            >
                <h3 class="font-serif text-lg text-[--color-ink-dark] mb-4">
                    {node ? 'Edit Node' : 'New Folder'}
                </h3>

                <form onSubmit={handleSubmit} class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-[--color-muted] uppercase tracking-wide">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={name()}
                            onInput={e => setName(e.target.value)}
                            maxLength={255}
                            class="
                                w-full font-sans font-light text-sm
                                text-[--color-ink-dark]
                                bg-[--color-bg] border border-[--color-border] rounded-xs
                                px-3 py-2
                                focus:outline-none focus:border-[--color-ink]
                            "
                            required
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-[--color-muted] uppercase tracking-wide">
                            Description
                        </label>
                        <textarea
                            value={description()}
                            onInput={e => setDescription(e.target.value)}
                            rows={2}
                            maxLength={255}
                            class="
                                w-full font-sans font-light text-sm
                                text-[--color-ink-dark]
                                bg-[--color-bg] border border-[--color-border] rounded-xs
                                px-3 py-2 resize-none
                                focus:outline-none focus:border-[--color-ink]
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
    const { node, loading } = useGetNode(() => params.id)
    const { create, loading: creating } = useCreateFolder()
    const { update, loading: updating } = useUpdateNode()
    const { remove, loading: deleting } = useDeleteNode()

    const [showForm, setShowForm] = createSignal(false)
    const [editingNode, setEditingNode] = createSignal(null)
    const [showCreate, setShowCreate] = createSignal(false)
    const [newName, setNewName] = createSignal('')
    const [newDesc, setNewDesc] = createSignal('')
    const [tab, setTab] = createSignal('contents')

    const {
        comments,
        loading: commentsLoading,
        refresh: refreshComments
    } = useGetComments(() => params.id)
    const { create: addComment, loading: addingComment } = useCreateComment()
    const { remove: deleteComment, loading: deletingComment } =
        useDeleteComment()

    const handleEdit = () => {
        setEditingNode(node())
        setShowForm(true)
    }

    const handleDelete = async () => {
        if (confirm(`Delete "${node().name}"?`)) {
            const [success] = await remove(node().id)
            if (success) {
                navigate('/nodes')
            }
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
        const [success] = await create(node().id, newName(), newDesc())
        if (success) {
            setShowCreate(false)
            setNewName('')
            setNewDesc('')
        }
    }

    const nodeData = () => node()
    const canEdit = () => nodeData()?.type === 'folder'

    return (
        <section class="flex flex-col p-6">
            <Show
                when={!loading()}
                fallback={<Spinner size="lg" class="mx-auto mt-20" />}
            >
                <PageHeader
                    title={nodeData()?.name ?? 'Node'}
                    subtitle={nodeData()?.type}
                    backTo="/nodes"
                />

                <Show when={canEdit()}>
                    <div class="mb-4">
                        <Button onClick={() => setShowCreate(true)}>
                            + New Folder
                        </Button>
                    </div>
                </Show>

                <NodeOverview
                    node={nodeData()}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />

                <Show when={nodeData()?.type === 'folder'}>
                    <section class="mt-4">
                        <h3 class="font-serif text-lg mb-2">
                            {nodeData()?.name}'s contents
                        </h3>
                        <NodeList
                            nodes={nodeData()?.children ?? []}
                            loading={loading()}
                            onNodeClick={n => navigate(`/nodes/${n.id}`)}
                        />
                    </section>
                </Show>

                <Show when={nodeData()?.type === 'file'}>
                    <DocCard doc={nodeData()?.doc} />
                </Show>

                <Show when={nodeData()?.type === 'folder'}>
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
                        <h3 class="font-serif text-lg mb-2">
                            {nodeData()?.name}'s contents
                        </h3>
                        <NodeList
                            nodes={nodeData()?.children ?? []}
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
                            onDelete={cId =>
                                deleteComment(cId).then(
                                    isSuccess => isSuccess && refreshComments()
                                )
                            }
                        />
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
            </Show>
        </section>
    )
}

