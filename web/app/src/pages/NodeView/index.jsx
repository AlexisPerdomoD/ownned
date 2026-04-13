import { Show } from 'solid-js'

import { DocCard, NodeList } from '@/features/node/ui'
import { useGetNode } from '@/features/node/usecase'
import { Spinner } from '@/shared/ui'
import { useNavigate, useParams } from '@solidjs/router'

/**
 * @param {Object} props
 * @param {import('@entities/nodes').Node} [props.node]
 */
function NodeOverview({ node }) {
    return (
        <section class="flex flex-col items-center">
            <section class="max-w-md w-full">
                <section class="mb-4 py-4">
                    <h1 class="text-2xl font-semibold text-center font-serif pb-2">
                        {node.name}
                    </h1>
                    <h3 class="text-sm text-center font-serif pb-2">
                        {node.type === 'folder' ? 'Folder' : 'File'}
                    </h3>
                    <p class="text-sm text-center">{node.description}</p>
                    <p class="text-sm text-center">Created {node.created_at}</p>
                    <Show when={node.updated_at !== node.created_at}>
                        <p class="text-sm text-center">
                            Last updated {node.updated_at}
                        </p>
                    </Show>
                </section>
            </section>
        </section>
    )
}

export function NodeView() {
    const params = useParams()
    const { node, loading } = useGetNode(() => params.id)
    const navigate = useNavigate()

    return (
        <section class="flex flex-col items-center h-screen">
            <Show when={!loading() && node()} fallback={<Spinner size="lg" />}>
                <NodeOverview node={node()} />
                <Show when={node().type === 'folder'}>
                    <NodeList
                        title={`${node().name}'s contents`}
                        nodes={node().children}
                        loading={loading()}
                        onNodeClick={n => navigate(`/nodes/${n.id}`)}
                    />
                </Show>

                <Show when={node().type === 'file'}>
                    <DocCard doc={node().doc} />
                </Show>
            </Show>
        </section>
    )
}
