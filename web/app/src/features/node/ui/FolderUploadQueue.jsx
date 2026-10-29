import { For, Show, createEffect, createSignal } from 'solid-js'

import { Button } from '@/shared/ui'

/**
 * @param {Object} props
 * @param {() => Object} props.progress
 * @param {() => Array<Object>} props.retryItems
 * @param {() => boolean} props.uploading
 * @param {() => boolean} props.cancelled
 * @param {() => string | null} props.error
 * @param {() => void} props.onCancel
 * @param {() => void} props.onRetry
 * @param {() => void} props.onClear
 * @param {() => number} props.miliseconds
 * @param {()=> {status :'idle' | 'planning' | 'creating folders' | 'uploading files' | 'stopped'; miliseconds:number }} props.currentStep
 */
export function FolderUploadQueue(props) {
    const progress = () => props.progress()
    const retryItems = () => props.retryItems()

    const [stepMessage, setStepMessage] = createSignal('')
    const [stepMilisecs, setStepMilisecs] = createSignal(0)

    createEffect(() => {
        const step = props.currentStep()

        if (step.status === 'idle') {
            setStepMessage('')
            setStepMilisecs(0)
            return
        }

        let msg
        switch (step.status) {
            case 'planning':
                msg = 'Starting planning state for Folder updload.'
                break
            case 'creating folders':
                msg = 'Starting folders tree creations.'

                break
            case 'uploading files':
                msg = 'Starting file uploading process.'
                break

            case 'stopped':
                msg = 'Upload folder process stopped.'
                break

            default:
                msg = ''
        }

        setStepMessage(msg)
        setStepMilisecs(prev => step.miliseconds - prev)
    })

    return (
        <section
            class="flex flex-col gap-3 p-4 bg-surface border border-border-subtle rounded-md"
            aria-label="Folder upload progress"
        >
            <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-medium text-ink-dark">Folder upload</h3>
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

            <Show when={progress().total}>
                <progress
                    class="w-full accent-accent"
                    max={progress().total}
                    value={progress().current}
                    aria-label="Upload elements processed"
                />
                <p class="text-xs text-muted" role="status">
                    {progress().current} of {progress().total} elements
                    processed
                    {' · '}
                    {progress().completed} completed
                    <Show when={progress().failed}>
                        {' · '}
                        {progress().failed} need attention
                    </Show>
                    <Show when={progress().active}>
                        {' · '}
                        {progress().active} uploading
                    </Show>
                </p>
            </Show>

            {/* <Show when={activeItems().length}> */}
            {/*     <p class="text-xs text-muted truncate"> */}
            {/*         Uploading:{' '} */}
            {/*         {activeItems() */}
            {/*             .slice(0, 3) */}
            {/*             .map(item => item.relativePath) */}
            {/*             .join(', ')} */}
            {/*         <Show when={activeItems().length > 3}> */}
            {/*             {' '} */}
            {/*             +{activeItems().length - 3} more */}
            {/*         </Show> */}
            {/*     </p> */}
            {/* </Show> */}

            <Show when={!props.uploading() && progress().retryable}>
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

            <Show when={stepMessage()}>
                <p class="text-xs text-accent" role="status">
                    {stepMessage()} Last step took{' '}
                    {(stepMilisecs() / 1000).toFixed()} seconds.
                </p>
            </Show>

            <Show when={!props.uploading() && props.miliseconds()}>
                <p class="text-xs text-muted" role="status">
                    Took {(props.miliseconds() / 1000).toFixed(2)} seconds to
                    upload {progress().total} items.
                </p>
            </Show>

            <Show when={props.cancelled() && !props.uploading()}>
                <p class="text-xs text-muted" role="status">
                    Upload paused. Completed items remain in place; retry the
                    remaining items when ready.
                </p>
            </Show>

            <div class="flex justify-end gap-2">
                <Show when={!props.uploading() && progress().retryable}>
                    <Button size="sm" onClick={props.onRetry}>
                        Retry remaining ({progress().retryable})
                    </Button>
                </Show>

                <Show when={!props.uploading() && progress().retryable}>
                    <Button size="sm" onClick={props.onClear}>
                        Remove all
                    </Button>
                </Show>

                <Show
                    when={
                        !props.currentStep().status === 'stopped' &&
                        !progress().retryable
                    }
                >
                    <Button size="sm" variant="ghost" onClick={props.onClear}>
                        Dismiss
                    </Button>
                </Show>
            </div>

            <Show when={!progress().total && !props.error()}>
                <p class="text-sm text-muted">No upload items.</p>
            </Show>
        </section>
    )
}
