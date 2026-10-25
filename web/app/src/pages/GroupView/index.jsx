import { Show, createEffect, createSignal, onCleanup } from 'solid-js'

import { apiPaginateUsrs } from '@/entities/usrs/api'
import { GroupNodePicker, GroupNodesList } from '@/features/group/ui'
import { AddUserForm, GroupUsersList } from '@/features/group/ui/GroupUsersList'
import { useGetGroup } from '@/features/group/usecase'
import {
    useDeleteGroup,
    useDeleteGroupNode,
    useDeleteGroupUsr,
    useUpsertGroupNode,
    useUpsertGroupUsr
} from '@/features/group/usecase'
import { canManageGroupNodes } from '@/shared/authz'
import { useAuth } from '@/features/auth/providers/AuthProvider'
import { getErrorMessage } from '@/shared/errors'
import {
    Button,
    ConfirmDialog,
    ErrView,
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
    const {
        group,
        loading,
        error: groupError,
        refresh: refreshGroup
    } = useGetGroup(() => params.id)

    const { remove: deleteGroup } = useDeleteGroup()
    const { assign: addUsr, loading: addingUsr } = useUpsertGroupUsr()
    const { remove: removeUsr, loading: removingUsr } = useDeleteGroupUsr()
    const { assign: addNode, loading: addingNode } = useUpsertGroupNode()
    const { remove: removeNode, loading: removingNode } = useDeleteGroupNode()

    const [tab, setTab] = createSignal('users')
    const [showDelete, setShowDelete] = createSignal(false)
    const [showNodePicker, setShowNodePicker] = createSignal(false)
    const [availableUsrs, setAvailableUsrs] = createSignal([])
    const [loadingUsrs, setLoadingUsrs] = createSignal(false)
    const [availableUsrsError, setAvailableUsrsError] = createSignal(null)
    let usersRequest = 0

    const loadAvailableUsrs = async () => {
        const requestId = ++usersRequest
        setLoadingUsrs(true)
        setAvailableUsrsError(null)
        try {
            const result = await apiPaginateUsrs(1, 100, '', undefined)
            if (requestId === usersRequest) {
                setAvailableUsrs(result.data ?? [])
            }
        } catch (error) {
            if (requestId === usersRequest) {
                setAvailableUsrs([])
                setAvailableUsrsError(error)
            }
        } finally {
            if (requestId === usersRequest) setLoadingUsrs(false)
        }
    }

    createEffect(() => {
        const groupId = params.id
        if (!groupId) return
        void loadAvailableUsrs()
        onCleanup(() => {
            usersRequest += 1
        })
    })

    const handleDelete = () => setShowDelete(true)

    const confirmDelete = async () => {
        const [success, error] = await deleteGroup(group().id)
        if (success) navigate('/groups')
        else toast.error(getErrorMessage(error, 'Could not delete group.'))
    }

    const handleAddUsr = async (usrId, access) => {
        const [success, error] = await addUsr(group().id, usrId, access)
        if (!success) {
            toast.error(getErrorMessage(error, 'Could not assign user.'))
            return false
        }
        try {
            await refreshGroup()
            return true
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not refresh group.'))
            return false
        }
    }

    const handleRemoveUsr = async usrId => {
        const [success, error] = await removeUsr(group().id, usrId)
        if (!success) {
            toast.error(getErrorMessage(error, 'Could not remove user.'))
            return
        }
        try {
            await refreshGroup()
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not refresh group.'))
        }
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
                when={!loading() && !groupError()}
                fallback={
                    <Show
                        when={loading()}
                        fallback={
                            <ErrView
                                error={groupError()}
                                onRetry={() => refreshGroup()}
                            />
                        }
                    >
                        <Spinner size="lg" class="mx-auto mt-20" />
                    </Show>
                }
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
                        id="group-sections"
                        label="Group sections"
                        items={[
                            { key: 'users', label: 'Users' },
                            { key: 'nodes', label: 'Nodes' }
                        ]}
                        active={tab()}
                        onChange={setTab}
                    />
                </div>

                <Show when={tab() === 'users'}>
                    <section
                        id="group-sections-panel-users"
                        role="tabpanel"
                        aria-labelledby="group-sections-tab-users"
                        tabIndex={0}
                        class="flex flex-col gap-4"
                    >
                        <div class="p-4 bg-surface border border-border-subtle rounded-md">
                            <h4 class="text-sm font-medium mb-3">Add User</h4>
                            <Show when={availableUsrsError()}>
                                <div class="flex flex-col items-start gap-2" role="alert">
                                    <p class="text-sm text-danger">
                                        {getErrorMessage(
                                            availableUsrsError(),
                                            'Could not load users.'
                                        )}
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        loading={loadingUsrs()}
                                        onClick={() => loadAvailableUsrs()}
                                    >
                                        Retry
                                    </Button>
                                </div>
                            </Show>
                            <Show when={!availableUsrsError()}>
                                <AddUserForm
                                    availableUsrs={availableUsrs()}
                                    loading={loadingUsrs() || addingUsr()}
                                    onAdd={handleAddUsr}
                                />
                            </Show>
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
                    <section
                        id="group-sections-panel-nodes"
                        role="tabpanel"
                        aria-labelledby="group-sections-tab-nodes"
                        tabIndex={0}
                        class="flex flex-col gap-4"
                    >
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
                busy={addingNode()}
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
