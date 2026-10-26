import { X } from 'lucide-solid'
import { Show, createEffect, createSignal, onCleanup } from 'solid-js'

import { Button } from '@/shared/ui'

import { CommentForm, CommentsList } from './CommentsList'

/**
 * Responsive comments side panel with an animated enter/exit transition.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('@/entities/nodes').NodeComment[]} props.comments
 * @param {boolean} props.loading
 * @param {string | null} [props.error]
 * @param {() => void} props.onRetry
 * @param {string} [props.currentUsrId]
 * @param {boolean} props.isSuper
 * @param {boolean} props.canComment
 * @param {boolean} props.creating
 * @param {(id: string, content: string) => Promise<boolean>} props.onEdit
 * @param {(id: string) => void} props.onDelete
 * @param {(content: string) => Promise<boolean>} props.onCreate
 */
export function CommentsDrawer(props) {
    const [present, setPresent] = createSignal(false)
    const [visible, setVisible] = createSignal(false)

    createEffect(() => {
        if (props.open) {
            setPresent(true)
            const frame = requestAnimationFrame(() => setVisible(true))
            onCleanup(() => cancelAnimationFrame(frame))
            return
        }

        setVisible(false)
        if (!present()) return

        const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 0
            : 220
        const timeout = window.setTimeout(() => setPresent(false), duration)
        onCleanup(() => window.clearTimeout(timeout))
    })

    createEffect(() => {
        if (!props.open) return

        const onKeyDown = event => {
            if (event.key === 'Escape') props.onClose?.()
        }
        document.addEventListener('keydown', onKeyDown)
        onCleanup(() => document.removeEventListener('keydown', onKeyDown))
    })

    return (
        <Show when={present()}>
            <button
                type="button"
                aria-label="Close comments panel"
                class="comments-scrim fixed inset-0 z-40 border-0 bg-black/30 p-0 backdrop-blur-sm sm:hidden"
                data-open={visible() ? 'true' : 'false'}
                onClick={() => props.onClose?.()}
            />
            <aside
                role="complementary"
                aria-label="Comments"
                aria-hidden={!props.open}
                inert={!props.open}
                data-open={visible() ? 'true' : 'false'}
                class="comments-drawer fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-border bg-surface shadow-lg sm:w-96"
            >
                <div class="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                    <h2 class="font-sans text-lg font-medium text-ink-dark">
                        Comments
                    </h2>
                    <button
                        type="button"
                        aria-label="Close comments"
                        class="rounded-sm p-2 text-muted hover:bg-bg-2 hover:text-ink"
                        onClick={() => props.onClose?.()}
                    >
                        <X size={17} aria-hidden="true" />
                    </button>
                </div>
                <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                    <Show when={props.error}>
                        <div
                            class="flex flex-col items-start gap-2"
                            role="alert"
                        >
                            <p class="text-sm text-danger">{props.error}</p>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => props.onRetry?.()}
                            >
                                Retry
                            </Button>
                        </div>
                    </Show>
                    <Show when={!props.error}>
                        <CommentsList
                            comments={props.comments}
                            loading={props.loading}
                            currentUsrId={props.currentUsrId}
                            isSuper={props.isSuper}
                            onEdit={props.onEdit}
                            onDelete={props.onDelete}
                        />
                    </Show>
                    <Show when={props.canComment}>
                        <CommentForm
                            loading={props.creating}
                            onSubmit={props.onCreate}
                        />
                    </Show>
                </div>
            </aside>
        </Show>
    )
}
