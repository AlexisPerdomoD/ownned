import {
    Show,
    createEffect,
    createSignal,
    onCleanup,
    splitProps
} from 'solid-js'
import { Portal } from 'solid-js/web'

/**
 * Modal accesible con Portal y trap de foco básico.
 * Cierra con Escape y click en el backdrop.
 *
 * @example
 * const [open, setOpen] = createSignal(false)
 *
 * <Modal open={open()} onClose={() => setOpen(false)} title="Confirmar acción">
 *   <p>¿Estás seguro?</p>
 *   <Modal.Footer>
 *     <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
 *     <Button variant="primary">Confirmar</Button>
 *   </Modal.Footer>
 * </Modal>
 */

const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl'
}

/**
 * @param {Object} props
 * @param {boolean} props.open                           - Controla visibilidad.
 * @param {() => void} props.onClose                    - Callback de cierre.
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {'sm' | 'md' | 'lg' | 'xl'} [props.size='md']
 * @param {boolean} [props.closeOnBackdrop=true]
 * @param {import('solid-js').JSX.Element} props.children
 * @returns {import('solid-js').JSX.Element}
 */
export function Modal(props) {
    let panel
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
            : 200
        const timeout = window.setTimeout(() => setPresent(false), duration)
        onCleanup(() => window.clearTimeout(timeout))
    })

    createEffect(() => {
        if (!props.open) return

        const previousFocus =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null
        const previousOverflow = document.body.style.overflow
        const focusableSelector =
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        const getFocusableElements = () =>
            Array.from(panel?.querySelectorAll(focusableSelector) ?? []).filter(
                element => element.getAttribute('aria-hidden') !== 'true'
            )

        const onKeyDown = event => {
            if (event.key === 'Escape') {
                props.onClose?.()
                return
            }
            if (event.key !== 'Tab') return

            const focusable = getFocusableElements()
            const first = focusable[0]
            const last = focusable.at(-1)
            if (!first || !last) {
                event.preventDefault()
                panel?.focus()
            } else if (
                event.shiftKey &&
                (document.activeElement === first ||
                    !panel?.contains(document.activeElement))
            ) {
                event.preventDefault()
                last.focus()
            } else if (
                !event.shiftKey &&
                (document.activeElement === last ||
                    !panel?.contains(document.activeElement))
            ) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', onKeyDown)
        document.body.style.overflow = 'hidden'
        const frame = requestAnimationFrame(() => {
            const initial =
                panel?.querySelector('[data-autofocus]') ??
                getFocusableElements()[0] ??
                panel
            initial?.focus()
        })

        onCleanup(() => {
            cancelAnimationFrame(frame)
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = previousOverflow
            if (previousFocus?.isConnected) previousFocus.focus()
        })
    })

    return (
        <Portal>
            <Show when={present()}>
                {/* Backdrop */}
                <div
                    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
                    data-open={visible() ? 'true' : 'false'}
                    aria-hidden={!props.open}
                    inert={!props.open}
                    onClick={e => {
                        if (
                            props.closeOnBackdrop !== false &&
                            e.target === e.currentTarget
                        )
                            props.onClose?.()
                    }}
                >
                    {/* Panel */}
                    <div
                        ref={element => (panel = element)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={
                            props.title ? 'modal-title' : undefined
                        }
                        tabIndex={-1}
                        class={`modal-panel
                            relative w-full ${sizes[props.size ?? 'md']}
                            bg-surface border border-border
                            rounded-lg shadow-lg
                            flex flex-col
                        `}
                    >
                        {/* Header */}
                        {(props.title || props.description) && (
                            <div class="px-5 py-4 border-b border-border-subtle">
                                {props.title && (
                                    <h2
                                        id="modal-title"
                                        class="font-sans font-medium text-lg text-ink-dark leading-snug"
                                    >
                                        {props.title}
                                    </h2>
                                )}
                                {props.description && (
                                    <p class="mt-1 text-sm text-muted">
                                        {props.description}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Close button */}
                        <button
                            onClick={() => props.onClose?.()}
                            aria-label="Cerrar"
                            class="
                                absolute top-3.5 right-4
                                text-muted hover:text-ink
                                transition-colors duration-base
                                cursor-pointer
                            "
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                            >
                                <path
                                    d="M1 1l12 12M13 1L1 13"
                                    stroke="currentColor"
                                    stroke-width="1.2"
                                    stroke-linecap="round"
                                />
                            </svg>
                        </button>

                        {/* Body */}
                        <div class="px-5 py-4 flex-1">{props.children}</div>
                    </div>
                </div>
            </Show>
        </Portal>
    )
}

/**
 * Pie del modal, alineado a la derecha.
 *
 * @param {Object} props
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.HTMLAttributes<HTMLDivElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
Modal.Footer = function ModalFooter(props) {
    const [own, rest] = splitProps(props, ['class', 'children'])
    return (
        <div
            class={`
                flex items-center justify-end gap-2
                pt-3 mt-2 border-t border-border-subtle
                ${own.class ?? ''}
            `}
            {...rest}
        >
            {own.children}
        </div>
    )
}
