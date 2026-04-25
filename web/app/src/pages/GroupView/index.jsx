import { Show, createSignal, createEffect } from 'solid-js'

import { useGetGroup } from '@/features/group/usecase'
import {
    useUpdateGroup,
    useDeleteGroup,
    useUpsertGroupUsr,
    useDeleteGroupUsr,
    useUpsertGroupNode,
    useDeleteGroupNode
} from '@/features/group/usecase'
import { apiPaginateUsrs } from '@/entities/usrs/api'
import { GroupUsersList, AddUserForm } from '@/features/group/ui/GroupUsersList'
import { GroupNodesList } from '@/features/group/ui/GroupNodesList'
import { PageHeader, Button, Spinner, Tabs } from '@/shared/ui'
import { useParams, useNavigate } from '@solidjs/router'

export function GroupView() {
    const params = useParams()
    const navigate = useNavigate()
    const { group, loading } = useGetGroup(() => params.id)

    const { update, loading: updating } = useUpdateGroup()
    const { remove: deleteGroup, loading: deleting } = useDeleteGroup()
    const { assign: addUsr, loading: addingUsr } = useUpsertGroupUsr()
    const { remove: removeUsr, loading: removingUsr } = useDeleteGroupUsr()
    const { assign: addNode, loading: addingNode } = useUpsertGroupNode()
    const { remove: removeNode, loading: removingNode } = useDeleteGroupNode()

    const [tab, setTab] = createSignal('users')
    const [availableUsrs, setAvailableUsrs] = createSignal([])
    const [loadingUsrs, setLoadingUsrs] = createSignal(false)

    createEffect(async () => {
        if (group()?.id) {
            setLoadingUsrs(true)
            try {
                const res = await apiPaginateUsrs(1, 100, '', undefined)
                setAvailableUsrs(res.data)
            } finally {
                setLoadingUsrs(false)
            }
        }
    })

    const handleUpdate = async (name, description) => {
        await update(group().id, name, description)
    }

    const handleDelete = async () => {
        if (confirm(`Delete group "${group().name}"?`)) {
            const [success] = await deleteGroup(group().id)
            if (success) {
                navigate('/groups')
            }
        }
    }

    const handleAddUsr = async (usrId, access) => {
        await addUsr(group().id, usrId, access)
    }

    const handleRemoveUsr = async usrId => {
        await removeUsr(group().id, usrId)
    }

    const handleAddNode = async nodeId => {
        await addNode(group().id, nodeId)
    }

    const handleRemoveNode = async nodeId => {
        await removeNode(group().id, nodeId)
    }

    const groupData = () => group()

    return (
        <section class="flex flex-col p-6">
            <Show when={!loading()} fallback={<Spinner size="lg" class="mx-auto mt-20" />}>
                <PageHeader
                    title={groupData()?.name ?? 'Group'}
                    subtitle={groupData()?.description}
                    backTo="/groups"
                    actions={
                        <Button variant="danger" onClick={handleDelete}>
                            Delete
                        </Button>
                    }
                />

                <div class="mb-6">
                    <Tabs
                        items={[
                            { key: 'users', label: 'Users' },
                            { key: 'nodes', label: 'Nodes' }
                        ]}
                        active={tab()}
                        onChange={setTab}
                    />
                </div>

                <Show when={tab() === 'users'}>
                    <section class="flex flex-col gap-4">
                        <div class="p-4 bg-[--color-surface] border border-[--color-border-subtle] rounded-[--radius-md]">
                            <h4 class="text-sm font-medium mb-3">Add User</h4>
                            <AddUserForm
                                availableUsrs={availableUsrs()}
                                loading={addingUsr()}
                                onAdd={handleAddUsr}
                            />
                        </div>

                        <div class="p-4 bg-[--color-surface] border border-[--color-border-subtle] rounded-[--radius-md]">
                            <h4 class="text-sm font-medium mb-3">Assigned Users</h4>
                            <GroupUsersList
                                users={groupData()?.usrs ?? []}
                                loading={addingUsr() || removingUsr()}
                                onRemove={handleRemoveUsr}
                            />
                        </div>
                    </section>
                </Show>

                <Show when={tab() === 'nodes'}>
                    <section class="flex flex-col gap-4">
                        <div class="p-4 bg-[--color-surface] border border-[--color-border-subtle] rounded-[--radius-md]">
                            <h4 class="text-sm font-medium mb-3">Add Node</h4>
                            <p class="text-xs text-[--color-muted] mb-2">
                                Enter a node ID to share with this group:
                            </p>
                            <form
                                onSubmit={e => {
                                    e.preventDefault()
                                    const fd = new FormData(e.target)
                                    handleAddNode(fd.get('node_id'))
                                    e.target.reset()
                                }}
                                class="flex gap-2"
                            >
                                <input
                                    name="node_id"
                                    type="text"
                                    placeholder="node-id"
                                    class="
                                        flex-1 font-mono text-sm
                                        text-[--color-ink-dark]
                                        bg-[--color-bg] border border-[--color-border] rounded-xs
                                        px-3 py-2
                                        focus:outline-none focus:border-[--color-ink]
                                    "
                                    required
                                />
                                <Button type="submit" size="sm" loading={addingNode}>
                                    Add
                                </Button>
                            </form>
                        </div>

                        <div class="p-4 bg-[--color-surface] border border-[--color-border-subtle] rounded-[--radius-md]">
                            <h4 class="text-sm font-medium mb-3">Shared Nodes</h4>
                            <GroupNodesList
                                nodes={groupData()?.nodes ?? []}
                                loading={addingNode() || removingNode()}
                                onRemove={handleRemoveNode}
                            />
                        </div>
                    </section>
                </Show>
            </Show>
        </section>
    )
}