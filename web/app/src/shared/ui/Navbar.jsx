import {
    Check,
    Folder,
    LogOut,
    Menu,
    Moon,
    Palette,
    Sun,
    UserRound,
    Users,
    X
} from 'lucide-solid'
import { For, Show, createEffect, createSignal } from 'solid-js'
import { Dynamic } from 'solid-js/web'

import { useAuth } from '@/features/auth/providers/AuthProvider'
import { canManageUsrs } from '@/shared/authz'
import { getErrorMessage } from '@/shared/errors'
import { Button, toast } from '@/shared/ui'
import { A, useLocation, useNavigate } from '@solidjs/router'

const palettes = [
    { id: 'obsidian', name: 'Obsidian' },
    { id: 'carbon', name: 'Carbon' },
    { id: 'graphite', name: 'Graphite' },
    { id: 'slate', name: 'Slate' },
    { id: 'warm', name: 'Warm Dark' },
    { id: 'aurora', name: 'Aurora' }
]

function NavbarLink(props) {
    return (
        <A
            href={props.path}
            aria-current={props.active ? 'page' : undefined}
            onClick={props.onNavigate}
            class="flex items-center gap-2 rounded-xs px-3 py-2 text-sm font-light transition-colors duration-base"
            classList={{
                'bg-surface text-ink-dark': props.active,
                'text-ink hover:bg-surface': !props.active
            }}
        >
            <Dynamic component={props.icon} size={16} aria-hidden="true" />
            <span>{props.name}</span>
        </A>
    )
}

/** Responsive application navigation and appearance controls. */
export function Navbar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { state, logout, role } = useAuth()
    const [theme, setTheme] = createSignal(
        document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
    )
    const [palette, setPalette] = createSignal(
        document.documentElement.dataset.palette || 'obsidian'
    )
    const [paletteOpen, setPaletteOpen] = createSignal(false)
    const [menuOpen, setMenuOpen] = createSignal(false)

    createEffect(() => {
        document.documentElement.dataset.theme = theme()
        document.documentElement.dataset.palette = palette()
        try {
            localStorage.setItem('owned.theme', theme())
            localStorage.setItem('owned.palette', palette())
        } catch {
            // The selected appearance still applies when storage is unavailable.
        }
    })

    const isActive = path =>
        location.pathname === path || location.pathname.startsWith(path + '/')
    const navItems = () => [
        { path: '/nodes', name: 'Files', icon: Folder },
        { path: '/groups', name: 'Groups', icon: Users },
        ...(canManageUsrs(role())
            ? [{ path: '/usrs', name: 'Users', icon: UserRound }]
            : [])
    ]

    const handleLogout = async () => {
        try {
            await logout()
        } catch (error) {
            toast.error(
                getErrorMessage(error, 'Logout could not reach the server.')
            )
        } finally {
            navigate('/login', { replace: true })
        }
    }

    const closeOverlays = () => {
        setPaletteOpen(false)
        setMenuOpen(false)
    }

    return (
        <nav
            class="relative z-40 flex h-14 min-w-0 items-center justify-between gap-1 border-b border-border bg-bg-2/90 px-2 shadow-sm backdrop-blur-md sm:gap-3 sm:px-4"
            onKeyDown={event => {
                if (event.key === 'Escape') closeOverlays()
            }}
        >
            <button
                type="button"
                class="shrink-0 rounded-xs p-2 text-ink hover:bg-surface sm:hidden"
                aria-label={
                    menuOpen()
                        ? 'Close navigation menu'
                        : 'Open navigation menu'
                }
                aria-expanded={menuOpen()}
                onClick={() => {
                    setMenuOpen(value => !value)
                    setPaletteOpen(false)
                }}
            >
                <Show
                    when={menuOpen()}
                    fallback={<Menu size={18} aria-hidden="true" />}
                >
                    <X size={18} aria-hidden="true" />
                </Show>
            </button>

            <div class="hidden min-w-0 items-center gap-1 sm:flex">
                <For each={navItems()}>
                    {item => (
                        <NavbarLink
                            path={item.path}
                            name={item.name}
                            icon={item.icon}
                            active={isActive(item.path)}
                        />
                    )}
                </For>
            </div>

            <div class="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-2">
                <div class="relative">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="shrink-0 px-2 sm:px-3"
                        aria-label="Choose color palette"
                        aria-haspopup="dialog"
                        aria-expanded={paletteOpen()}
                        title="Choose color palette"
                        onClick={() => {
                            setPaletteOpen(value => !value)
                            setMenuOpen(false)
                        }}
                    >
                        <Palette size={16} aria-hidden="true" />
                    </Button>
                    <Show when={paletteOpen()}>
                        <button
                            type="button"
                            aria-label="Close palette menu"
                            class="fixed inset-0 z-30 cursor-default"
                            onClick={() => setPaletteOpen(false)}
                        />
                        <div
                            role="dialog"
                            aria-label="Choose a color palette"
                            class="absolute right-0 top-full z-40 mt-2 w-[min(17rem,calc(100vw-1rem))] rounded-lg border border-border bg-surface p-3 shadow-lg"
                        >
                            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                                Color palette
                            </p>
                            <div class="grid grid-cols-2 gap-1.5">
                                <For each={palettes}>
                                    {item => (
                                        <button
                                            type="button"
                                            aria-pressed={palette() === item.id}
                                            class="flex min-w-0 items-center justify-between gap-1 rounded-sm px-2 py-2 text-left text-xs text-ink hover:bg-bg-2"
                                            classList={{
                                                'bg-accent-pale text-ink-dark':
                                                    palette() === item.id
                                            }}
                                            onClick={() => {
                                                setPalette(item.id)
                                                setPaletteOpen(false)
                                            }}
                                        >
                                            <span class="truncate">
                                                {item.name}
                                            </span>
                                            <Show when={palette() === item.id}>
                                                <Check
                                                    size={14}
                                                    aria-hidden="true"
                                                />
                                            </Show>
                                        </button>
                                    )}
                                </For>
                            </div>
                        </div>
                    </Show>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="shrink-0 px-2 sm:px-3"
                    aria-label={
                        theme() === 'dark'
                            ? 'Switch to light theme'
                            : 'Switch to dark theme'
                    }
                    onClick={() =>
                        setTheme(value => (value === 'dark' ? 'light' : 'dark'))
                    }
                    title="Toggle theme"
                >
                    <Show
                        when={theme() === 'dark'}
                        fallback={<Moon size={16} aria-hidden="true" />}
                    >
                        <Sun size={16} aria-hidden="true" />
                    </Show>
                </Button>

                <span class="hidden max-w-36 truncate text-sm text-muted md:inline">
                    {state.usr?.username}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="shrink-0 px-2 sm:px-3"
                    aria-label="Log out"
                    onClick={handleLogout}
                    title="Log out"
                >
                    <LogOut size={16} aria-hidden="true" />
                    <span class="hidden sm:inline">Logout</span>
                </Button>
            </div>

            <Show when={menuOpen()}>
                <button
                    type="button"
                    aria-label="Close navigation menu"
                    class="fixed inset-0 z-30 cursor-default sm:hidden"
                    onClick={() => setMenuOpen(false)}
                />
                <div class="absolute left-0 right-0 top-full z-40 border-b border-border bg-surface p-2 shadow-lg sm:hidden">
                    <For each={navItems()}>
                        {item => (
                            <NavbarLink
                                path={item.path}
                                name={item.name}
                                icon={item.icon}
                                active={isActive(item.path)}
                                onNavigate={closeOverlays}
                            />
                        )}
                    </For>
                </div>
            </Show>
        </nav>
    )
}
