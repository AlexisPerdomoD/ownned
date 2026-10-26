import { createEffect, createSignal } from 'solid-js'

import { Button, Modal } from '@/shared/ui'

/** Page-local folder creation form used by the node detail view. */
export function NodeForm(props) {
    const [name, setName] = createSignal('')
    const [description, setDescription] = createSignal('')

    createEffect(() => {
        if (props.open) {
            setName('')
            setDescription('')
        }
    })

    const handleSubmit = event => {
        event.preventDefault()
        if (name().trim()) {
            props.onSubmit?.(name().trim(), description().trim())
        }
    }

    return (
        <Modal
            open={props.open}
            onClose={props.onClose}
            title="New Folder"
            size="md"
        >
            <form onSubmit={handleSubmit} class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <label
                        for="node-name"
                        class="text-xs uppercase tracking-wide text-muted"
                    >
                        Name *
                    </label>
                    <input
                        type="text"
                        id="node-name"
                        data-autofocus
                        value={name()}
                        onInput={event => setName(event.target.value)}
                        maxLength={255}
                        class="w-full rounded-xs border border-border bg-bg px-3 py-2 text-sm font-light text-ink-dark focus:border-ink focus:outline-none"
                        required
                    />
                </div>

                <div class="flex flex-col gap-1">
                    <label
                        for="node-description"
                        class="text-xs uppercase tracking-wide text-muted"
                    >
                        Description
                    </label>
                    <textarea
                        id="node-description"
                        value={description()}
                        onInput={event => setDescription(event.target.value)}
                        rows={2}
                        maxLength={255}
                        class="w-full resize-none rounded-xs border border-border bg-bg px-3 py-2 text-sm font-light text-ink-dark focus:border-ink focus:outline-none"
                    />
                </div>

                <div class="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => props.onClose?.()}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" loading={props.loading}>
                        Create
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
