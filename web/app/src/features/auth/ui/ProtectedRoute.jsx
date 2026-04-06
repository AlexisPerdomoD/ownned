import { Show } from 'solid-js'

import { Spinner } from '@/shared/ui/Atoms'
import { useNavigate } from '@solidjs/router'

import { useAuth } from '../providers/AuthProvider'

/**
 * @param {Object} props
 * @param {import('solid-js').JSX.Element} props.children
 * @returns {import('solid-js').JSX.Element}
 */
export function ProtectedRoute(props) {
    const { state } = useAuth()
    const navigate = useNavigate()

    return (
        <>
            <Show
                when={state.checked}
                fallback={
                    <section class="flex items-center justify-center h-screen">
                        <Spinner size="lg" />
                    </section>
                }
            >
                <Show when={state.usr} fallback={navigate('/login')}>
                    {props.children}
                </Show>
            </Show>
        </>
    )
}
