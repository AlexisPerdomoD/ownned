import { A, useLocation } from '@solidjs/router'
import { Show, createEffect, createSignal } from 'solid-js'

import { useAuth } from '@/features/auth/providers/AuthProvider'
import { canManageUsrs } from '@/shared/authz'
import { Button } from '@/shared/ui'

/**
 * @param {Object} props
 * @param {boolean} [props.collapsed]
 * @returns {import('solid-js').JSX.Element}
 */
export function Navbar({ collapsed = false }) {
    const location = useLocation()
    const { state, logout, role } = useAuth()

    const initialTheme =
        document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
    const [theme, setTheme] = createSignal(initialTheme)

    createEffect(() => {
        document.documentElement.dataset.theme = theme()
        localStorage.setItem('owned.theme', theme())
    })

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

    const handleLogout = async () => {
        await logout()
        window.location.href = '/login'
    }

    return (
        <nav
            class={`
                flex items-center justify-between
                h-14 px-4
                bg-bg-2 border-b border-border
                ${collapsed ? 'w-14 flex-col' : ''}
            `}
        >
            <div class={`flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
                <A
                    href="/nodes"
                    class={`
                        flex items-center gap-2 px-3 py-2 rounded-xs
                        text-sm font-light
                        transition-colors duration-base
                        ${
                            isActive('/nodes')
                                ? 'bg-surface text-ink-dark'
                                : 'text-ink hover:bg-surface'
                        }
                    `}
                >
                    <span style="font-size:16px">📁</span>
                    {!collapsed && <span>Files</span>}
                </A>

                <A
                    href="/groups"
                    class={`
                        flex items-center gap-2 px-3 py-2 rounded-xs
                        text-sm font-light
                        transition-colors duration-base
                        ${
                            isActive('/groups')
                                ? 'bg-surface text-ink-dark'
                                : 'text-ink hover:bg-surface'
                        }
                    `}
                >
                    <span style="font-size:16px">👥</span>
                    {!collapsed && <span>Groups</span>}
                </A>

                <Show when={canManageUsrs(role())}>
                    <A
                        href="/usrs"
                        class={`
                        flex items-center gap-2 px-3 py-2 rounded-xs
                        text-sm font-light
                        transition-colors duration-base
                        ${
                            isActive('/usrs')
                                ? 'bg-surface text-ink-dark'
                                : 'text-ink hover:bg-surface'
                        }
                    `}
                    >
                        <span style="font-size:16px">👤</span>
                        {!collapsed && <span>Users</span>}
                    </A>
                </Show>
            </div>

            <div class="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        setTheme(t => (t === 'dark' ? 'light' : 'dark'))
                    }
                    title="Toggle theme"
                >
                    {theme() === 'dark' ? '☀' : '☾'}
                </Button>
                <span class="text-sm text-muted">
                    {collapsed ? '' : state.usr?.username}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                    {collapsed ? '↩' : 'Logout'}
                </Button>
            </div>
        </nav>
    )
}
