import { For, Show } from 'solid-js'

import { Button } from '@/shared/ui'

/**
 * @param {Object} props
 * @param {() => Array<Object>} props.items
 * @param {() => Object} props.progress
 * @param {() => Array<Object>} props.failedItems
 * @param {() => Array<Object>} props.retryItems
 * @param {() => boolean} props.uploading
 * @param {() => boolean} props.cancelled
 * @param {() => string | null} props.error
 * @param {() => void} props.onCancel
 * @param {() => void} props.onRetry
 * @param {() => void} props.onClear
 */
export function FolderUploadQueue(props) {
    const items = () => props.items()
    const progress = () => props.progress()
    const activeItems = () => progress().active
    const failedItems = () => props.failedItems()
    const retryItems = () => props.retryItems()

    return (
        <section
            class="flex flex-col gap-3 p-4 bg-surface border border-border-subtle rounded-md"
            aria-label="Folder upload progress"
        >
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-medium text-ink-dark">
                    Folder upload
                </h3>
                <Show when={props.uploading()}>
                    <Button size="sm" variant="danger" onClick={props.onCancel}>
                        Cancel upload
                    </Button>
                </Show>
            </div>

            <Show when={props.error()}>
                <p class="text-sm text-danger" role="alert">
                    {props.error()}
                </p>
            </Show>

            <Show when={progress().total > 0}>
                <progress
                    class="w-full accent-accent"
                    max={progress().total}
                    value={progress().current}
                    aria-label="Upload elements processed"
                />
                <p class="text-xs text-muted" role="status">
                    {progress().current} of {progress().total} elements processed
                    {' · '}
                        {progress().completed} completed
                    <Show when={failedItems().length > 0}>
                        {' · '}
                        {failedItems().length} need attention
                    </Show>
                    <Show when={activeItems().length > 0}>
                        {' · '}
                        {activeItems().length} uploading
                    </Show>
                </p>
            </Show>

            <Show when={activeItems().length > 0}>
                <p class="text-xs text-muted truncate">
                    Uploading: {activeItems()
                        .slice(0, 3)
                        .map(item => item.relativePath)
                        .join(', ')}
                    <Show when={activeItems().length > 3}>
                        {' '}+{activeItems().length - 3} more
                    </Show>
                </p>
            </Show>

            <Show when={retryItems().length > 0}>
                <div class="max-h-48 overflow-y-auto rounded-sm border border-border-subtle">
                    <ul class="divide-y divide-border-subtle">
                        <For each={retryItems()}>
                            {item => (
                                <li class="flex flex-col gap-0.5 px-3 py-2 text-xs">
                                    <span class="font-medium text-ink-dark break-all">
                                        {item.relativePath}
                                    </span>
                                    <span class="text-danger wrap-break-word">
                                        {item.error ||
                                            (item.status === 'queued'
                                                ? 'Not started yet.'
                                                : 'Upload cancelled.')}
                                    </span>
                                </li>
                            )}
                        </For>
                    </ul>
                </div>
            </Show>

            <Show when={props.cancelled() && !props.uploading()}>
                <p class="text-xs text-muted" role="status">
                    Upload paused. Completed items remain in place; retry the remaining items when ready.
                </p>
            </Show>

            <div class="flex justify-end gap-2">
                <Show when={!props.uploading() && retryItems().length > 0}>
                    <Button size="sm" onClick={props.onRetry}>
                        Retry remaining ({retryItems().length})
                    </Button>
                </Show>
                <Show when={!props.uploading() && retryItems().length === 0}>
                    <Button size="sm" variant="ghost" onClick={props.onClear}>
                        Dismiss
                    </Button>
                </Show>
            </div>

            <Show when={items().length === 0 && !props.error()}>
                <p class="text-sm text-muted">No upload items.</p>
            </Show>
        </section>
    )
}
