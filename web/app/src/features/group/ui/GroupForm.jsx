import { createEffect } from 'solid-js'

import { buildCreateGroupDTO, buildUpdateGroupDTO } from '@/entities/groups/api'
import { Modal } from '@/shared/ui'

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

    return (
        <Modal
            open={props.open}
            onClose={props.onClose}
            title={props.group ? 'Edit Group' : 'New Group'}
            size="md"
            closeOnBackdrop={!props.loading}
        >
                        <form
                            onSubmit={handleSubmit}
                            class="flex flex-col gap-4"
                        >
                            <div class="flex flex-col gap-1">
                                <label
                                    for="group-name"
                                    class="text-xs text-muted tracking-wide uppercase"
                                >
                                    Name *
                                </label>
                                <input
                                    ref={r => (nameInput = r)}
                                    data-autofocus
                                    id="group-name"
                                    type="text"
                                    maxLength={255}
                                    class="
                                w-full
                                font-sans font-light text-sm
                                text-ink-dark placeholder:text-muted
                                bg-bg border border-border rounded-xs
                                px-3 py-2
                                focus:outline-none focus:border-ink
                                hover:border-muted
                            "
                                    required
                                />
                            </div>

                            <div class="flex flex-col gap-1">
                                <label
                                    for="group-description"
                                    class="text-xs text-muted tracking-wide uppercase"
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
                                text-ink-dark placeholder:text-muted
                                bg-bg border border-border rounded-xs
                                px-3 py-2 resize-none
                                focus:outline-none focus:border-ink
                                hover:border-muted
                            "
                                />
                            </div>

                            <div class="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => props.onClose?.()}
                                    class="
                                px-4 py-2 text-sm font-normal
                                text-ink border border-border rounded-xs
                                bg-transparent
                                hover:bg-bg-2
                                transition-colors duration-base
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
                                bg-ink-dark text-bg border border-ink-dark rounded-xs
                                hover:bg-ink
                                transition-colors duration-base
                                disabled:opacity-40 disabled:cursor-not-allowed
                            "
                                >
                                    {props.loading
                                        ? 'Saving...'
                                        : props.group
                                          ? 'Update'
                                          : 'Create'}
                                </button>
                            </div>
                        </form>
        </Modal>
    )
}
