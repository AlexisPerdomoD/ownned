import { For, Show, createSignal } from 'solid-js'

import { Button } from '@/shared/ui'

const canManageComment = (comment, currentUsrId, isSuper) =>
    isSuper || comment.usr_id === currentUsrId

/**
 * @param {Object} props
 * @param {import('@/entities/nodes').NodeComment[]} props.comments
 * @param {boolean} [props.loading]
 * @param {string} [props.currentUsrId]
 * @param {boolean} [props.isSuper]
 * @param {(commentId: string, content: string) => Promise<boolean>} [props.onEdit]
 * @param {(commentId: string) => void} [props.onDelete]
 * @returns {import('solid-js').JSX.Element}
 */
export function CommentsList(props) {
    const [editingId, setEditingId] = createSignal(null)
    const [draft, setDraft] = createSignal('')
    const [saving, setSaving] = createSignal(false)

    const startEdit = comment => {
        setEditingId(comment.id)
        setDraft(comment.content)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setDraft('')
    }

    const saveEdit = async comment => {
        setSaving(true)
        const ok = await props.onEdit?.(comment.id, draft().trim())
        setSaving(false)
        if (ok) cancelEdit()
    }

    return (
        <div class="flex flex-col gap-3">
            <Show when={props.loading}>
                <div class="py-2 text-sm text-[--color-muted]">Loading...</div>
            </Show>

            <Show when={!props.loading && props.comments.length === 0}>
                <div class="py-2 text-sm text-[--color-muted]">
                    No comments yet.
                </div>
            </Show>

            <Show when={!props.loading && props.comments.length > 0}>
                <For each={props.comments}>
                    {comment => (
                        <div class="p-3 bg-bg-2 rounded-sm">
                            <Show
                                when={editingId() === comment.id}
                                fallback={
                                    <div class="flex items-start justify-between gap-2">
                                        <p class="text-sm text-ink whitespace-pre-wrap">
                                            {comment.content}
                                        </p>
                                        <Show
                                            when={canManageComment(
                                                comment,
                                                props.currentUsrId,
                                                props.isSuper
                                            )}
                                        >
                                            <div class="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        startEdit(comment)
                                                    }
                                                    class="text-xs text-muted hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        props.onDelete?.(
                                                            comment.id
                                                        )
                                                    }
                                                    class="text-xs text-danger hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </Show>
                                    </div>
                                }
                            >
                                <div class="flex flex-col gap-2">
                                    <textarea
                                        value={draft()}
                                        onInput={e =>
                                            setDraft(e.target.value)
                                        }
                                        rows={2}
                                        class="
                                            w-full font-sans font-light text-sm
                                            text-[--color-ink-dark]
                                            bg-[--color-bg] border border-border rounded-xs
                                            px-3 py-2 resize-none
                                            focus:outline-none focus:border-ink
                                        "
                                    />
                                    <div class="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={cancelEdit}
                                            disabled={saving()}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            loading={saving()}
                                            onClick={() => saveEdit(comment)}
                                            disabled={!draft().trim()}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            </Show>
                            <p class="text-xs text-muted mt-1">
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
                maxLength={255}
                class="
                    w-full font-sans font-light text-sm
                    text-[--color-ink-dark] placeholder:text-muted
                    bg-[--color-bg] border border-border rounded-xs
                    px-3 py-2 resize-none
                    focus:outline-none focus:border-ink
                "
            />
            <div class="flex justify-end">
                <Button
                    type="submit"
                    size="sm"
                    loading={loading}
                    disabled={!content().trim()}
                >
                    Add Comment
                </Button>
            </div>
        </form>
    )
}