import { Show, createEffect, createSignal, onCleanup } from 'solid-js'

import { apiPaginateUsrs } from '@/entities/usrs/api'
import { GroupNodePicker, GroupNodesList } from '@/features/group/ui'
import { AddUserForm, GroupUsersList } from '@/features/group/ui/GroupUsersList'
import { useGetGroup } from '@/features/group/usecase'
import {
    useDeleteGroup,
    useDeleteGroupNode,
    useDeleteGroupUsr,
    useUpdateGroup,
    useUpsertGroupNode,
    useUpsertGroupUsr
} from '@/features/group/usecase'
import { canManageGroupNodes } from '@/shared/authz'
import { useAuth } from '@/features/auth/providers/AuthProvider'
import { getErrorMessage } from '@/shared/errors'
import {
    Button,
    ConfirmDialog,
    PageHeader,
    Spinner,
    Tabs,
    toast
} from '@/shared/ui'
import { useNavigate, useParams } from '@solidjs/router'

export function GroupView() {
    const params = useParams()
    const navigate = useNavigate()
    const auth = useAuth()
    const role = () => auth.role()
    const { group, loading, refresh: refreshGroup } = useGetGroup(() => params.id)

    const { update, loading: updating } = useUpdateGroup()
    const { remove: deleteGroup, loading: deleting } = useDeleteGroup()
    const { assign: addUsr, loading: addingUsr } = useUpsertGroupUsr()
    const { remove: removeUsr, loading: removingUsr } = useDeleteGroupUsr()
    const { assign: addNode, loading: addingNode } = useUpsertGroupNode()
    const { remove: removeNode, loading: removingNode } = useDeleteGroupNode()

    const [tab, setTab] = createSignal('users')
    const [showDelete, setShowDelete] = createSignal(false)
    const [showNodePicker, setShowNodePicker] = createSignal(false)
    const [availableUsrs, setAvailableUsrs] = createSignal([])
    const [loadingUsrs, setLoadingUsrs] = createSignal(false)

    createEffect(() => {
        const groupId = params.id
        if (!groupId) return
        let active = true
        setLoadingUsrs(true)
        apiPaginateUsrs(1, 100, '', undefined)
            .then(result => {
                if (active) setAvailableUsrs(result.data ?? [])
            })
            .catch(error => {
                if (!active) return
                setAvailableUsrs([])
                toast.error(getErrorMessage(error, 'Could not load users.'))
            })
            .finally(() => {
                if (active) setLoadingUsrs(false)
            })
        onCleanup(() => {
            active = false
        })
    })

    const handleUpdate = async (name, description) => {
        await update(group().id, name, description)
    }

    const handleDelete = () => setShowDelete(true)

    const confirmDelete = async () => {
        const [success] = await deleteGroup(group().id)
        if (success) navigate('/groups')
    }

    const handleAddUsr = async (usrId, access) => {
        await addUsr(group().id, usrId, access)
    }

    const handleRemoveUsr = async usrId => {
        await removeUsr(group().id, usrId)
    }

    const handleAddNode = async nodeId => {
        const [success, error] = await addNode(group().id, nodeId)
        if (!success) {
            toast.error(getErrorMessage(error, 'You cannot share this node.'))
            return false
        }
        try {
            await refreshGroup()
            return true
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not refresh shared nodes.'))
            return false
        }
    }

    const handleRemoveNode = async nodeId => {
        const [success, error] = await removeNode(group().id, nodeId)
        if (!success) {
            toast.error(getErrorMessage(error, 'Could not remove node.'))
            return
        }
        try {
            await refreshGroup()
        } catch (refreshError) {
            toast.error(
                getErrorMessage(refreshError, 'Could not refresh shared nodes.')
            )
        }
    }

    const groupData = () => group()

    return (
        <section class="flex flex-col p-6">
            <Show
                when={!loading()}
                fallback={<Spinner size="lg" class="mx-auto mt-20" />}
            >
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
                        <div class="p-4 bg-surface border border-border-subtle rounded-md">
                            <h4 class="text-sm font-medium mb-3">Add User</h4>
                            <AddUserForm
                                availableUsrs={availableUsrs()}
                                loading={loadingUsrs() || addingUsr()}
                                onAdd={handleAddUsr}
                            />
                        </div>

                        <div class="p-4 bg-surface border border-surface rounded-md">
                            <h4 class="text-sm font-medium mb-3">
                                Assigned Users
                            </h4>
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
                        <Show when={canManageGroupNodes(role())}>
                            <div class="p-4 bg-surface border border-border-subtle rounded-md">
                                <h4 class="text-sm font-medium mb-2">Add Node</h4>
                                <p class="text-xs text-muted mb-3">
                                    Browse or search nodes you can share with this group.
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => setShowNodePicker(true)}
                                >
                                    Choose node
                                </Button>
                            </div>
                        </Show>

                        <div class="p-4 bg-surface border border-border-subtle rounded-md">
                            <h4 class="text-sm font-medium mb-3">
                                Shared Nodes
                            </h4>
                            <GroupNodesList
                                nodes={groupData()?.nodes ?? []}
                                loading={addingNode() || removingNode()}
                                onRemove={
                                    canManageGroupNodes(role())
                                        ? handleRemoveNode
                                        : undefined
                                }
                            />
                        </div>
                    </section>
                </Show>
            </Show>

            <GroupNodePicker
                open={showNodePicker()}
                onClose={() => setShowNodePicker(false)}
                onSelect={handleAddNode}
                assignedNodeIds={(groupData()?.nodes ?? []).map(
                    node => node.node_id
                )}
            />

            <ConfirmDialog
                open={showDelete()}
                onClose={() => setShowDelete(false)}
                onConfirm={confirmDelete}
                title="Delete group"
                description={`Delete "${groupData()?.name}"? This cannot be undone.`}
                confirmLabel="Delete"
            />
        </section>
    )
}
