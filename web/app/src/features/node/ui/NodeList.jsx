import { For } from 'solid-js'

import { Button, Card, EmptyState, Spinner } from '@shared/ui'

import { NodeCard } from './NodeCard'

const PlusIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
    </svg>
)

const FolderOpenIcon = () => (
    <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </svg>
)

/**
 * List of nodes in a responsive grid.
 *
 * @param {Object} props
 * @param {import('@entities/nodes').Node[]} [props.nodes=[]] - List of nodes
 * @param {string} [props.title] - Header title
 * @param {string} [props.emptyMessage] - Message when there are no nodes
 * @param {boolean} [props.loading] - Loading state
 * @param {() => void} [props.onNodeClick] - Callback on node click
 * @param {(node: import('@entities/nodes').Node) => void} [props.onEdit] - Callback to edit
 * @param {(node: import('@entities/nodes').Node) => void} [props.onDelete] - Callback to delete
 * @param {() => void} [props.onCreate] - Callback to create a new node
 * @param {import('solid-js').JSX.Element} [props.action] - Additional action slot
 * @param {string} [props.class]
 */
export function NodeList(props) {
    return (
        <div class={`flex flex-col gap-4 ${props.class ?? ''}`}>
            {(props.title || props.onCreate || props.action) && (
                <Card>
                    <div
                        class="
                        flex items-center justify-between
                        px-4 py-3
                    "
                    >
                        <div class="flex items-center gap-3">
                            {props.title && (
                                <h2
                                    class="
                                    font-serif text-lg text-ink-dark
                                "
                                >
                                    {props.title}
                                </h2>
                            )}
                            {!props.loading && props.nodes.length > 0 && (
                                <span
                                    class="
                                    text-sm text-muted
                                    px-2 py-0.5 rounded-xs
                                    bg-[--color-bg-2]
                                "
                                >
                                    {props.nodes.length}
                                </span>
                            )}
                        </div>

                        <div class="flex items-center gap-2">
                            {props.action}
                            {props.onCreate && (
                                <Button
                                    variant="accent"
                                    size="sm"
                                    onClick={props.onCreate}
                                >
                                    <PlusIcon />
                                    Nuevo
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {props.loading ? (
                <div
                    class="
                    flex items-center justify-center
                    py-16
                "
                >
                    <Spinner size="lg" />
                </div>
            ) : props.nodes.length === 0 ? (
                <Card>
                    <EmptyState
                        title="Not content"
                        description={
                            props.emptyMessage ||
                            'There are no items in this location.'
                        }
                        icon={<FolderOpenIcon />}
                        action={
                            props.onCreate && (
                                <Button
                                    variant="accent"
                                    onClick={props.onCreate}
                                >
                                    <PlusIcon />
                                    Crear primer elemento
                                </Button>
                            )
                        }
                    />
                </Card>
            ) : (
                <div
                    class="
                    grid gap-4
                    grid-cols-1
                    sm:grid-cols-2
                    lg:grid-cols-3
                    xl:grid-cols-4
                "
                >
                    <For each={props.nodes}>
                        {node => (
                            <NodeCard
                                node={node}
                                onClick={props.onNodeClick}
                                onEdit={props.onEdit}
                                onDelete={props.onDelete}
                            />
                        )}
                    </For>
                </div>
            )}
        </div>
    )
}

export default NodeList
