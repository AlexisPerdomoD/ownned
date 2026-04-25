import { createSignal } from 'solid-js'

import { GroupForm, GroupsTable } from '@/features/group/ui'
import {
    useCreateGroup,
    useDeleteGroup,
    usePaginateGroups,
    useUpdateGroup
} from '@/features/group/usecase'
import { Button, PageHeader, Pagination } from '@/shared/ui'
import { useNavigate } from '@solidjs/router'

export function GroupsView() {
    const navigate = useNavigate()
    const { groups, page, total, loading, search, setSearch, goTo, refresh } =
        usePaginateGroups({ pageSize: 20 })
    const { create, loading: creating } = useCreateGroup()
    const { update, loading: updating } = useUpdateGroup()
    const { remove, loading: deleting } = useDeleteGroup()

    const [showForm, setShowForm] = createSignal(false)
    const [editingGroup, setEditingGroup] = createSignal(null)
    const [searchInput, setSearchInput] = createSignal('')

    const handleCreate = async ({ name, description }) => {
        const [success] = await create(name, description)
        if (success) {
            setShowForm(false)
            refresh()
        }
    }

    const handleEdit = group => {
        setEditingGroup(group)
        setShowForm(true)
    }

    const handleUpdate = async ({ name, description }) => {
        const [success] = await update(editingGroup().id, name, description)
        if (success) {
            setEditingGroup(null)
            setShowForm(false)
            refresh()
        }
    }

    const handleDelete = async group => {
        if (confirm(`Delete group "${group.name}"?`)) {
            const [success] = await remove(group.id)
            if (success) {
                refresh()
            }
        }
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
        </section>
    )
}
