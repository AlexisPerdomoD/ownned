import { For } from 'solid-js'

import { Badge, Pagination, Table } from '@/shared/ui'

const accessBadgeVariant = {
    read_only_access: 'neutral',
    write_access: 'accent',
    owner_access: 'dark'
}

function DateCell({ row, key }) {
    const date = row[key]
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
}

function UsersCell({ row }) {
    const users = row.usrs ?? []
    return (
        <div class="flex flex-wrap gap-1">
            <For each={users.slice(0, 3)}>
                {usr => (
                    <Badge
                        variant={accessBadgeVariant[usr.access] ?? 'neutral'}
                    >
                        {usr.access.replace('_', ' ')}
                    </Badge>
                )}
            </For>
            {users.length > 3 && (
                <Badge variant="neutral">+{users.length - 3}</Badge>
            )}
        </div>
    )
}

function ActionsCell({ row, onEdit, onDelete }) {
    return (
        <div class="flex items-center gap-2">
            <button
                type="button"
                onClick={e => {
                    e.stopPropagation()
                    onEdit?.(row)
                }}
                class="text-xs text-[--color-accent] hover:underline cursor-pointer"
            >
                Edit
            </button>
            <button
                type="button"
                onClick={e => {
                    e.stopPropagation()
                    onDelete?.(row)
                }}
                class="text-xs text-[--color-danger] hover:underline cursor-pointer"
            >
                Delete
            </button>
        </div>
    )
}

/**
 * @param {Object} props
 * @param {import('@/entities/groups').Group[]} props.groups
 * @param {boolean} [props.loading]
 * @param {(group: import('@/entities/groups').Group) => void} [props.onRowClick]
 * @param {(group: import('@/entities/groups').Group) => void} [props.onEdit]
 * @param {(group: import('@/entities/groups').Group) => void} [props.onDelete]
 * @returns {import('solid-js').JSX.Element}
 */
export function GroupsTable(props) {
    const columns = [
        {
            key: 'name',
            header: 'Name',
            class: 'w-40',
            render: row => (
                <span class="font-medium text-[--color-ink-dark]">
                    {row.name}
                </span>
            )
        },
        {
            key: 'description',
            header: 'Description',
            render: row => (
                <span class="text-xs text-[--color-muted] line-clamp-1">
                    {row.description || '-'}
                </span>
            )
        },
        {
            key: 'created_at',
            header: 'Created',
            class: 'w-24',
            render: row => <DateCell row={row} key="created_at" />
        },
        {
            key: 'actions',
            header: '',
            class: 'w-20',
            align: 'right',
            render: row => (
                <ActionsCell
                    row={row}
                    onEdit={props.onEdit}
                    onDelete={props.onDelete}
                />
            )
        }
    ]

    return (
        <Table
            columns={columns}
            rows={props.groups}
            loading={props.loading}
            onRowClick={props.onRowClick}
            emptyTitle="No groups yet"
            emptyDescription="Create a group to organize collaboration."
        />
    )
}

