import { For, Show } from 'solid-js'

/**
 * @param {Object} props
 * @param {import('@/entities/groups').GroupNode[]} props.nodes
 * @param {boolean} [props.loading]
 * @param {(nodeId: string) => void} [props.onRemove]
 * @returns {import('solid-js').JSX.Element}
 */
export function GroupNodesList(props) {
    return (
        <div class="flex flex-col gap-2">
            <Show when={props.loading}>
                <div class="py-4 text-center text-sm text-muted">
                    Loading...
                </div>
            </Show>

            <Show when={!props.loading && props.nodes.length === 0}>
                <div class="py-4 text-center text-sm text-muted">
                    No nodes shared yet.
                </div>
            </Show>

            <Show when={!props.loading && props.nodes.length > 0}>
                <For each={props.nodes}>
                    {node => (
                        <div class="flex items-center justify-between p-2 bg-bg-2 rounded-xs">
                            <div class="flex items-center gap-2">
                                <span class="text-sm">
                                    {node.display_path ?? node.name ?? 'Shared node'}
                                </span>
                            </div>
                            <Show when={props.onRemove}>
                                <button
                                    type="button"
                                    onClick={() => props.onRemove?.(node.node_id)}
                                    class="text-xs text-danger hover:underline"
                                >
                                    Remove
                                </button>
                            </Show>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    )
}
