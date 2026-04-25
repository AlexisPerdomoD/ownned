import { createSignal, createEffect } from 'solid-js'

import { buildCreateGroupDTO, buildUpdateGroupDTO } from '@/entities/groups/api'

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {import('@/entities/groups').Group} [props.group]
 * @param {boolean} [props.loading]
 * @param {(data: {name: string, description: string}) => void} [props.onSubmit]
 * @param {() => void} [props.onClose]
 * @returns {import('solid-js').JSX.Element}
 */
export function GroupForm(props) {
    let nameInput
    let descInput

    createEffect(() => {
        if (props.open && nameInput && descInput) {
            nameInput.value = props.group?.name ?? ''
            descInput.value = props.group?.description ?? ''
        }
    })

    const handleSubmit = e => {
        e.preventDefault()
        const name = nameInput?.value?.trim()
        const description = descInput?.value?.trim() ?? ''

        if (!name) return

        const schema = props.group ? buildUpdateGroupDTO : buildCreateGroupDTO
        const [valid] = schema(name, description)

        if (valid) {
            props.onSubmit?.({ name, description })
        }
    }

    if (!props.open) return null

    return (
        <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            onClick={props.onClose}
        >
            <div
                class="bg-[--color-surface] border border-[--color-border] rounded-[--radius-md] w-full max-w-md p-6"
                onClick={e => e.stopPropagation()}
            >
                <h3 class="font-serif text-lg text-[--color-ink-dark] mb-4">
                    {props.group ? 'Edit Group' : 'New Group'}
                </h3>

                <form onSubmit={handleSubmit} class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <label
                            for="group-name"
                            class="text-xs text-[--color-muted] tracking-wide uppercase"
                        >
                            Name *
                        </label>
                        <input
                            ref={r => (nameInput = r)}
                            id="group-name"
                            type="text"
                            maxLength={255}
                            class="
                                w-full
                                font-sans font-light text-sm
                                text-[--color-ink-dark] placeholder:text-[--color-muted]
                                bg-[--color-bg] border border-[--color-border] rounded-xs
                                px-3 py-2
                                focus:outline-none focus:border-[--color-ink]
                                hover:border-[--color-muted]
                            "
                            required
                        />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label
                            for="group-description"
                            class="text-xs text-[--color-muted] tracking-wide uppercase"
                        >
                            Description
                        </label>
                        <textarea
                            ref={r => (descInput = r)}
                            id="group-description"
                            rows={3}
                            maxLength={1000}
                            class="
                                w-full
                                font-sans font-light text-sm
                                text-[--color-ink-dark] placeholder:text-[--color-muted]
                                bg-[--color-bg] border border-[--color-border] rounded-xs
                                px-3 py-2 resize-none
                                focus:outline-none focus:border-[--color-ink]
                                hover:border-[--color-muted]
                            "
                        />
                    </div>

                    <div class="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={props.onClose}
                            class="
                                px-4 py-2 text-sm font-normal
                                text-[--color-ink] border border-[--color-border] rounded-xs
                                bg-transparent
                                hover:bg-[--color-bg-2]
                                transition-colors duration-[--ease-base]
                            "
                            disabled={props.loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={props.loading}
                            class="
                                px-4 py-2 text-sm font-normal
                                bg-[--color-ink-dark] text-[--color-bg] border border-[--color-ink-dark] rounded-xs
                                hover:bg-[--color-ink]
                                transition-colors duration-[--ease-base]
                                disabled:opacity-40 disabled:cursor-not-allowed
                            "
                        >
                            {props.loading ? 'Saving...' : (props.group ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}