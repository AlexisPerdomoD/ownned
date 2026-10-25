import { Show } from 'solid-js'

import { useAuth } from '@/features/auth/providers/AuthProvider'
import { NodeList } from '@/features/node/ui'
import { useGetRoot } from '@/features/node/usecase'
import { ErrView } from '@/shared/ui'
import { useNavigate } from '@solidjs/router'

export function HomeView() {
    const { root, loading, error, refresh } = useGetRoot()
    const { state } = useAuth()
    const navigate = useNavigate()

    return (
        <section class="flex flex-col items-center h-screen">
            <section class="max-w-md w-full">
                <section class="mb-4 py-4">
                    <h1 class="text-2xl font-semibold text-center font-serif pb-2">
                        Wellcome to your personal cloud storage.
                    </h1>
                    <p class="text-sm text-center">
                        Here you can see all your folders and their content.
                    </p>
                </section>
            </section>

            <Show
                when={!error()}
                fallback={<ErrView error={error()} onRetry={() => refresh()} />}
            >
                <NodeList
                    title={`${state.usr.username}'s root folder`}
                    nodes={root()}
                    loading={loading()}
                    onNodeClick={node => navigate(`/nodes/${node.id}`)}
                />
            </Show>
        </section>
    )
}
