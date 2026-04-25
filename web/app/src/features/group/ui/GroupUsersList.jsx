import { For, Show } from 'solid-js'

import { Badge, Button } from '@/shared/ui'

const accessOptions = [
    { value: 'read_only_access', label: 'Read Only' },
    { value: 'write_access', label: 'Write' },
    { value: 'owner_access', label: 'Owner' }
]

const accessVariant = {
    read_only_access: 'neutral',
    write_access: 'accent',
    owner_access: 'dark'
}

/**
 * @param {Object} props
 * @param {import('@/entities/groups').GroupUsr[]} props.users
 * @param {boolean} [props.loading]
 * @param {(usrId: string) => void} [props.onRemove]
 * @returns {import('solid-js').JSX.Element}
 */
export function GroupUsersList({ users, loading = false, onRemove }) {
    return (
        <div class="flex flex-col gap-2">
            <Show when={loading}>
                <div class="py-4 text-center text-sm text-[--color-muted]">
                    Loading...
                </div>
            </Show>

            <Show when={!loading && users.length === 0}>
                <div class="py-4 text-center text-sm text-[--color-muted]">
                    No users assigned yet.
                </div>
            </Show>

            <Show when={!loading && users.length > 0}>
                <For each={users}>
                    {usr => (
                        <div class="flex items-center justify-between p-2 bg-[--color-bg-2] rounded-[--radius-xs]">
                            <div class="flex items-center gap-2">
                                <span class="text-sm">{usr.usr_id}</span>
                                <Badge variant={accessVariant[usr.access] ?? 'neutral'}>
                                    {usr.access.replace('_', ' ')}
                                </Badge>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove?.(usr.usr_id)}
                                class="text-xs text-[--color-danger] hover:underline"
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    )
}

/**
 * @param {Object} props
 * @param {import('@/entities/usrs').Usr[]} props.availableUsrs
 * @param {boolean} [props.loading]
 * @param {(usrId: string, access: string) => void} [props.onAdd]
 * @returns {import('solid-js').JSX.Element}
 */
export function AddUserForm({ availableUsrs, loading = false, onAdd }) {
    let selectRef
    let accessRef

    const handleSubmit = e => {
        e.preventDefault()
        const usrId = selectRef?.value
        const access = accessRef?.value
        if (usrId && access) {
            onAdd?.(usrId, access)
            selectRef.value = ''
            accessRef.value = 'read_only_access'
        }
    }

    return (
        <form onSubmit={handleSubmit} class="flex items-center gap-2">
            <select
                ref={selectRef}
                class="
                    flex-1 font-sans font-light text-sm
                    text-[--color-ink-dark]
                    bg-[--color-bg] border border-[--color-border] rounded-xs
                    px-2 py-1.5
                    focus:outline-none focus:border-[--color-ink]
                "
                required
            >
                <option value="">Select user...</option>
                <For each={availableUsrs}>
                    {usr => (
                        <option value={usr.id}>
                            {usr.username}
                        </option>
                    )}
                </For>
            </select>

            <select
                ref={accessRef}
                defaultValue="read_only_access"
                class="
                    font-sans font-light text-sm
                    text-[--color-ink-dark]
                    bg-[--color-bg] border border-[--color-border] rounded-xs
                    px-2 py-1.5
                    focus:outline-none focus:border-[--color-ink]
                "
            >
                <For each={accessOptions}>
                    {opt => (
                        <option value={opt.value}>{opt.label}</option>
                    )}
                </For>
            </select>

            <Button type="submit" size="sm" loading={loading}>
                Add
            </Button>
        </form>
    )
}