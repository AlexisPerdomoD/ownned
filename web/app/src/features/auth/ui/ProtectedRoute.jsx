import { Show } from 'solid-js'

import { Spinner } from '@/shared/ui/Atoms'
import { ErrView } from '@/shared/ui/ErrView'
import { Navigate } from '@solidjs/router'

import { useAuth } from '../providers/AuthProvider'

/**
 * @param {Object} props
 * @param {import('solid-js').JSX.Element} props.children
 * @returns {import('solid-js').JSX.Element}
 */
export function ProtectedRoute(props) {
    const { state, retrySessionCheck } = useAuth()

    return (
        <Show
            when={state.checked && !state.checking}
            fallback={
                <section class="flex items-center justify-center h-screen">
                    <Spinner size="lg" />
                </section>
            }
        >
            <Show
                when={!state.error}
                fallback={
                    <ErrView
                        error={state.error}
                        onRetry={() => retrySessionCheck()}
                    />
                }
            >
                <Show
                    when={state.usr}
                    fallback={() => <Navigate href="/login" />}
                >
                    {props.children}
                </Show>
            </Show>
        </Show>
    )
}
