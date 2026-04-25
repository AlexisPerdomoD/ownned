import { For, Show, createSignal } from 'solid-js'

import { Button } from '@/shared/ui'

/**
 * @param {Object} props
 * @param {import('@/entities/nodes').NodeComment[]} props.comments
 * @param {boolean} [props.loading]
 * @param {(commentId: string) => void} [props.onDelete]
 * @returns {import('solid-js').JSX.Element}
 */
export function CommentsList({ comments, loading = false, onDelete }) {
    return (
        <div class="flex flex-col gap-3">
            <Show when={loading}>
                <div class="py-2 text-sm text-[--color-muted]">Loading...</div>
            </Show>

            <Show when={!loading && comments.length === 0}>
                <div class="py-2 text-sm text-[--color-muted]">
                    No comments yet.
                </div>
            </Show>

            <Show when={!loading && comments.length > 0}>
                <For each={comments}>
                    {comment => (
                        <div class="p-3 bg-[--color-bg-2] rounded-[--radius-sm]">
                            <div class="flex items-start justify-between gap-2">
                                <p class="text-sm text-[--color-ink] whitespace-pre-wrap">
                                    {comment.content}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => onDelete?.(comment.id)}
                                    class="text-xs text-[--color-danger] hover:underline shrink-0"
                                >
                                    Delete
                                </button>
                            </div>
                            <p class="text-xs text-[--color-muted] mt-1">
                                {new Date(comment.created_at).toLocaleString()}
                            </p>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    )
}

/**
 * @param {Object} props
 * @param {boolean} [props.loading]
 * @param {(content: string) => void} [props.onSubmit]
 * @returns {import('solid-js').JSX.Element}
 */
export function CommentForm({ loading = false, onSubmit }) {
    const [content, setContent] = createSignal('')

    const handleSubmit = e => {
        e.preventDefault()
        const text = content().trim()
        if (text) {
            onSubmit?.(text)
            setContent('')
        }
    }

    return (
        <form onSubmit={handleSubmit} class="flex flex-col gap-2">
            <textarea
                value={content()}
                onInput={e => setContent(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
                class="
                    w-full font-sans font-light text-sm
                    text-[--color-ink-dark] placeholder:text-muted
                    bg-[--color-bg] border border-border rounded-xs
                    px-3 py-2 resize-none
                    focus:outline-none focus:border-ink
                "
            />
            <div class="flex justify-end">
                <Button type="submit" size="sm" loading={loading} disabled={!content().trim()}>
                    Add Comment
                </Button>
            </div>
        </form>
    )
}