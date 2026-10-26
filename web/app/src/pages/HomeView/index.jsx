import { Show } from 'solid-js'

import { useAuth } from '@/features/auth/providers/AuthProvider'
import { NodeList, NodeSearch } from '@/features/node/ui'
import { useGetRoot } from '@/features/node/usecase'
import { ErrView } from '@/shared/ui'
import { useLocation, useNavigate } from '@solidjs/router'

export function HomeView() {
    const { root, loading, error, refresh } = useGetRoot()
    const { state } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const openNode = nodeId =>
        navigate(`/nodes/${nodeId}`, {
            state: { returnTo: location.pathname }
        })

    return (
        <section class="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5 p-4 sm:p-6">
            <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div class="min-w-0">
                    <p class="text-xs font-medium uppercase tracking-widest text-muted">
                        Files
                    </p>
                    <h1 class="mt-1 text-2xl font-semibold text-ink-dark">
                        {state.usr?.username
                            ? `${state.usr.username}'s files`
                            : 'Your files'}
                    </h1>
                    <p class="mt-1 text-sm text-muted">
                        Browse your root folders or search accessible files.
                    </p>
                </div>
                <NodeSearch
                    globalOnly
                    onOpenNode={openNode}
                    triggerClass="w-full justify-start sm:w-auto"
                />
            </header>

            <Show
                when={!error()}
                fallback={<ErrView error={error()} onRetry={() => refresh()} />}
            >
                <NodeList
                    title="Root folders"
                    nodes={root()}
                    loading={loading()}
                    onNodeClick={node => openNode(node.id)}
                    class="w-full"
                />
            </Show>
        </section>
    )
}
