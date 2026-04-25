import { For, Show } from 'solid-js'

import { Badge, Button } from '@/shared/ui'

/**
 * @param {Object} props
 * @param {import('@/entities/groups').GroupNode[]} props.nodes
 * @param {boolean} [props.loading]
 * @param {(nodeId: string) => void} [props.onRemove]
 * @returns {import('solid-js').JSX.Element}
 */
export function GroupNodesList({ nodes, loading = false, onRemove }) {
    return (
        <div class="flex flex-col gap-2">
            <Show when={loading}>
                <div class="py-4 text-center text-sm text-[--color-muted]">
                    Loading...
                </div>
            </Show>

            <Show when={!loading && nodes.length === 0}>
                <div class="py-4 text-center text-sm text-[--color-muted]">
                    No nodes shared yet.
                </div>
            </Show>

            <Show when={!loading && nodes.length > 0}>
                <For each={nodes}>
                    {node => (
                        <div class="flex items-center justify-between p-2 bg-[--color-bg-2] rounded-[--radius-xs]">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-mono">{node.node_id}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove?.(node.node_id)}
                                class="text-xs text-[--color-danger] hover:underline"
                            >
                                Remove
                            </button>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    )
}