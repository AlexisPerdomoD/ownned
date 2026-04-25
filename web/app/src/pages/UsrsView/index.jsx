import { createSignal, For } from 'solid-js'

import {
    useCreateUsr,
    useDeleteUsr,
    usePaginateUsrs
} from '@/features/usr/usecase'
import {
    Badge,
    Button,
    PageHeader,
    Pagination,
    Table,
    toast
} from '@/shared/ui'

const roleVariant = {
    super_usr_role: 'dark',
    normal_usr_role: 'accent',
    limited_usr_role: 'neutral'
}

const roleLabel = {
    super_usr_role: 'Super',
    normal_usr_role: 'Normal',
    limited_usr_role: 'Limited'
}

function UsrsTable(props) {
    const columns = [
        {
            key: 'username',
            header: 'Email',
            class: 'w-48',
            render: row => (
                <span class="font-medium text-[--color-ink-dark]">
                    {row.username}
                </span>
            )
        },
        {
            key: 'firstname',
            header: 'First Name',
            class: 'w-24',
            render: row => row.firstname ?? '-'
        },
        {
            key: 'lastname',
            header: 'Last Name',
            class: 'w-24',
            render: row => row.lastname ?? '-'
        },
        {
            key: 'role',
            header: 'Role',
            class: 'w-24',
            render: row => (
                <Badge variant={roleVariant[row.role] ?? 'neutral'}>
                    {roleLabel[row.role] ?? row.role}
                </Badge>
            )
        },
        {
            key: 'created_at',
            header: 'Created',
            class: 'w-24',
            render: row => new Date(row.created_at).toLocaleDateString()
        },
        {
            key: 'actions',
            header: '',
            class: 'w-16',
            align: 'right',
            render: row => (
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation()
                        props.onDelete?.(row)
                    }}
                    class="text-xs text-[--color-danger] hover:underline cursor-pointer"
                >
                    Delete
                </button>
            )
        }
    ]

    return (
        <Table
            columns={columns}
            rows={props.usrs}
            loading={props.loading}
            emptyTitle="No users yet"
            emptyDescription="Create a user to get started."
        />
    )
}

const roleOptions = [
    { value: 'normal_usr_role', label: 'Normal User' },
    { value: 'limited_usr_role', label: 'Limited User' }
]

function CreateUsrForm(props) {
    let usernameInput
    let passwordInput
    let firstnameInput
    let lastnameInput
    let roleInput

    const [errors, setErrors] = createSignal({})

    const handleSubmit = e => {
        e.preventDefault()
        setErrors({})

        const username = usernameInput?.value?.trim()
        const password = passwordInput?.value
        const firstname = firstnameInput?.value?.trim()
        const lastname = lastnameInput?.value?.trim()
        const role = roleInput?.value

        if (!username || !password || !firstname || !lastname || !role) {
            setErrors({
                general: 'All fields are required.'
            })
            return
        }

        props.onSubmit?.(username, password, firstname, lastname, role, [])
    }

    if (!props.open) return null

    return (
        <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            onClick={() => props.onClose?.()}
        >
            <div
                class="bg-[--color-surface] border border-[--color-border] rounded-[--radius-md] w-full max-w-md p-6"
                onClick={e => e.stopPropagation()}
            >
                <h3 class="font-serif text-lg text-[--color-ink-dark] mb-4">
                    New User
                </h3>

                <form onSubmit={handleSubmit} class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-[--color-muted] uppercase tracking-wide">
                            Email *
                        </label>
                        <input
                            ref={r => (usernameInput = r)}
                            type="email"
                            placeholder="email@example.com"
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

                    <div class="flex gap-2">
                        <div class="flex flex-col gap-1 flex-1">
                            <label class="text-xs text-[--color-muted] uppercase tracking-wide">
                                First Name *
                            </label>
                            <input
                                ref={r => (firstnameInput = r)}
                                type="text"
                                placeholder="John"
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
                        <div class="flex flex-col gap-1 flex-1">
                            <label class="text-xs text-[--color-muted] uppercase tracking-wide">
                                Last Name *
                            </label>
                            <input
                                ref={r => (lastnameInput = r)}
                                type="text"
                                placeholder="Doe"
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
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-[--color-muted] uppercase tracking-wide">
                            Role *
                        </label>
                        <select
                            ref={r => (roleInput = r)}
                            defaultValue="normal_usr_role"
                            class="
                                w-full font-sans font-light text-sm
                                text-[--color-ink-dark]
                                bg-[--color-bg] border border-[--color-border] rounded-xs
                                px-3 py-2
                                focus:outline-none focus:border-[--color-ink]
                            "
                            required
                        >
                            <For each={roleOptions}>
                                {opt => (
                                    <option value={opt.value}>
                                        {opt.label}
                                    </option>
                                )}
                            </For>
                        </select>
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-[--color-muted] uppercase tracking-wide">
                            Password *
                        </label>
                        <input
                            ref={r => (passwordInput = r)}
                            type="password"
                            minLength={8}
                            placeholder="Min 8 characters"
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

                    {errors()?.general && (
                        <p class="text-xs text-[--color-danger]">
                            {errors().general}
                        </p>
                    )}

                    <div class="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={props.onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" loading={props.loading}>
                            Create
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export function UsrsView() {
    const {
        usrs,
        page,
        total,
        loading,
        search,
        setSearch,
        role,
        setRole,
        goTo,
        refresh
    } = usePaginateUsrs({ pageSize: 20 })
    const { create, loading: creating } = useCreateUsr()
    const { remove, loading: deleting } = useDeleteUsr()

    const [showForm, setShowForm] = createSignal(false)
    const [searchInput, setSearchInput] = createSignal('')

    const handleSearch = () => {
        setSearch(searchInput())
        goTo(1)
    }

    const handleDelete = async usr => {
        if (confirm(`Delete user "${usr.username}"?`)) {
            const [success] = await remove(usr.id)
            if (success) {
                refresh()
            }
        }
    }

    return (
        <section class="flex flex-col p-6">
            <PageHeader
                title="Users"
                subtitle="Manage users."
                actions={
                    <Button onClick={() => setShowForm(true)}>
                        + New User
                    </Button>
                }
            />

            <div class="mb-4 flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchInput()}
                    onInput={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    class="
                        w-64 font-sans font-light text-sm
                        text-[--color-ink-dark] placeholder:text-muted
                        bg-surface border border-border rounded-xs
                        px-3 py-2
                        focus:outline-none focus:border-ink
                    "
                />
                <Button variant="ghost" size="sm" onClick={handleSearch}>
                    Search
                </Button>
            </div>

            <UsrsTable
                usrs={usrs()}
                loading={loading()}
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

            <CreateUsrForm
                open={showForm()}
                loading={creating()}
                onSubmit={(username, password, firstname, lastname, role) => {
                    create(username, password, firstname, lastname, role).then(([success, usr]) => {
                        if (!success) {
                            toast({ type: 'error', message: usr.general ?? 'Error creating user.' })
                            return
                        }

                        setShowForm(false)
                        refresh()
                    })
                }}
                onClose={() => setShowForm(false)}
            />
        </section>
    )
}