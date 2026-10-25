import { Show, createSignal } from 'solid-js'

import { GroupForm, GroupsTable } from '@/features/group/ui'
import {
    useCreateGroup,
    useDeleteGroup,
    usePaginateGroups,
    useUpdateGroup
} from '@/features/group/usecase'
import { getErrorMessage } from '@/shared/errors'
import {
    Button,
    ConfirmDialog,
    ErrView,
    PageHeader,
    Pagination,
    toast
} from '@/shared/ui'
import { useNavigate } from '@solidjs/router'

export function GroupsView() {
    const navigate = useNavigate()
    const {
        groups,
        page,
        total,
        loading,
        error,
        setSearch,
        goTo,
        refresh
    } = usePaginateGroups({ pageSize: 20 })
    const { create, loading: creating } = useCreateGroup()
    const { update, loading: updating } = useUpdateGroup()
    const { remove } = useDeleteGroup()

    const [showForm, setShowForm] = createSignal(false)
    const [editingGroup, setEditingGroup] = createSignal(null)
    const [searchInput, setSearchInput] = createSignal('')
    const [deleteTarget, setDeleteTarget] = createSignal(null)
    const [showDelete, setShowDelete] = createSignal(false)

    const handleCreate = async ({ name, description }) => {
        const [success, error] = await create(name, description)
        if (!success) {
            toast.error(getErrorMessage(error, 'Could not create group.'))
            return
        }
        setShowForm(false)
        await refresh()
    }

    const handleEdit = group => {
        setEditingGroup(group)
        setShowForm(true)
    }

    const handleUpdate = async ({ name, description }) => {
        const [success, error] = await update(
            editingGroup().id,
            name,
            description
        )
        if (!success) {
            toast.error(getErrorMessage(error, 'Could not update group.'))
            return
        }
        setEditingGroup(null)
        setShowForm(false)
        await refresh()
    }

    const handleDelete = group => {
        setDeleteTarget(group)
        setShowDelete(true)
    }

    const confirmDelete = async () => {
        const group = deleteTarget()
        if (!group) return
        const [success, error] = await remove(group.id)
        if (!success) {
            toast.error(getErrorMessage(error, 'Could not delete group.'))
            return
        }
        await refresh()
    }

    const handleSearch = () => {
        setSearch(searchInput())
        goTo(1)
    }

    const handleRowClick = group => {
        navigate(`/groups/${group.id}`)
    }

    return (
        <section class="flex flex-col p-6">
            <PageHeader
                title="Groups"
                subtitle="Organize collaboration with groups."
                actions={
                    <Button onClick={() => setShowForm(true)}>
                        + New Group
                    </Button>
                }
            />

            <div class="mb-4 flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Search groups..."
                    aria-label="Search groups"
                    value={searchInput()}
                    onInput={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    class="
                        w-64 font-sans font-light text-sm
                        text-ink-dark placeholder:text-muted
                        bg-surface border border-border rounded-xs
                        px-3 py-2
                        focus:outline-none focus:border-ink
                    "
                />
                <Button variant="ghost" size="sm" onClick={handleSearch}>
                    Search
                </Button>
            </div>

            <Show
                when={!error()}
                fallback={<ErrView error={error()} onRetry={() => refresh()} />}
            >
                <GroupsTable
                    groups={groups()}
                    loading={loading()}
                    onRowClick={handleRowClick}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />

                <div class="mt-4">
                    <Pagination
                        page={page()}
                        total={total()}
                        pageSize={20}
                        onChange={goTo}
                    />
                </div>
            </Show>

            <GroupForm
                open={showForm()}
                group={editingGroup()}
                loading={creating() || updating()}
                onSubmit={editingGroup() ? handleUpdate : handleCreate}
                onClose={() => {
                    setShowForm(false)
                    setEditingGroup(null)
                }}
            />

            <ConfirmDialog
                open={showDelete()}
                onClose={() => setShowDelete(false)}
                onConfirm={confirmDelete}
                title="Delete group"
                description={`Delete "${deleteTarget()?.name}"? This cannot be undone.`}
                confirmLabel="Delete"
            />
        </section>
    )
}
