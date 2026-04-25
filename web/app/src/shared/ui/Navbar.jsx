import { A, useLocation } from '@solidjs/router'

import { useAuth } from '@/features/auth/providers/AuthProvider'
import { Avatar, Button } from '@/shared/ui'

/**
 * @param {Object} props
 * @param {boolean} [props.collapsed]
 * @returns {import('solid-js').JSX.Element}
 */
export function Navbar({ collapsed = false }) {
    const location = useLocation()
    const { state, logout } = useAuth()

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

    const navItems = [
        { path: '/nodes', label: 'Files', icon: '📁' },
        { path: '/groups', label: 'Groups', icon: '👥' },
        { path: '/usrs', label: 'Users', icon: '👤' }
    ]

    const handleLogout = async () => {
        await logout()
        window.location.href = '/login'
    }

    return (
        <nav
            class={`
                flex items-center justify-between
                h-14 px-4
                bg-[--color-bg-2] border-b border-[--color-border]
                ${collapsed ? 'w-14 flex-col' : ''}
            `}
        >
            <div class={`flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
                <A
                    href="/nodes"
                    class={`
                        flex items-center gap-2 px-3 py-2 rounded-[--radius-xs]
                        text-[--text-sm] font-light
                        transition-colors duration-[--ease-base]
                        ${
                            isActive('/nodes')
                                ? 'bg-[--color-surface] text-[--color-ink-dark]'
                                : 'text-[--color-ink] hover:bg-[--color-surface]'
                        }
                    `}
                >
                    <span style="font-size:16px">📁</span>
                    {!collapsed && <span>Files</span>}
                </A>

                <A
                    href="/groups"
                    class={`
                        flex items-center gap-2 px-3 py-2 rounded-[--radius-xs]
                        text-[--text-sm] font-light
                        transition-colors duration-[--ease-base]
                        ${
                            isActive('/groups')
                                ? 'bg-[--color-surface] text-[--color-ink-dark]'
                                : 'text-[--color-ink] hover:bg-[--color-surface]'
                        }
                    `}
                >
                    <span style="font-size:16px">👥</span>
                    {!collapsed && <span>Groups</span>}
                </A>

                <A
                    href="/usrs"
                    class={`
                        flex items-center gap-2 px-3 py-2 rounded-[--radius-xs]
                        text-[--text-sm] font-light
                        transition-colors duration-[--ease-base]
                        ${
                            isActive('/usrs')
                                ? 'bg-[--color-surface] text-[--color-ink-dark]'
                                : 'text-[--color-ink] hover:bg-[--color-surface]'
                        }
                    `}
                >
                    <span style="font-size:16px">👤</span>
                    {!collapsed && <span>Users</span>}
                </A>
            </div>

            <div class="flex items-center gap-3">
                <span class="text-[--text-sm] text-[--color-muted]">
                    {collapsed ? '' : state.usr?.username}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                    {collapsed ? '↩' : 'Logout'}
                </Button>
            </div>
        </nav>
    )
}