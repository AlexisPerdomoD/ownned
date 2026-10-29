import { For, createSignal } from 'solid-js'
import { Portal } from 'solid-js/web'

/**
 * Sistema de notificaciones toast.
 *
 * @example
 * // En el root de la app, monta una vez:
 * <Toaster />
 *
 * // Desde cualquier lugar:
 * import { toast } from './ui/Toast'
 * toast.success('Documento guardado')
 * toast.error('No se pudo guardar')
 * toast('Operación completada')
 */

const [toasts, setToasts] = createSignal([])

let nextId = 0

/**
 * Adds a toast to the queede, if type 'spinner' is selected no timeout is applied. Else yes.
 * @param {string} message
 * @param {'default' | 'success' | 'error' | 'warning' | 'spinner'} [type='default']
 * @param {string} [code='default']
 * @param {number} [duration=3500]
 */
function addToast(
    message,
    type = 'default',
    code = 'default',
    duration = 3500
) {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type, code }])

    if (type !== 'spinner') {
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
    }
}
/**
 * @param {number} id
 */

function clearToastByID(id) {
    setToasts(prev => prev.filter(t => t.id === id))
}

function clearToasts() {
    setToasts([])
}

/**
 * @param {string} code
 */
function clearToastsByCode(code) {
    setToasts(prev => prev.filter(t => t.code !== code))
}

export const toast = Object.assign(
    (msg, duration) => addToast(msg, 'default', duration),
    {
        /** @param {string} msg
         * @param {string | undefined} code
         * @param {number | undefined} duration */
        success: (msg, code, duration) =>
            addToast(msg, 'success', code, duration),
        /**
         * @param {string} msg
         * @param {string | undefined} code
         * @param {number | undefined} duration */
        error: (msg, code, duration) => addToast(msg, 'error', code, duration),
        /**
         * @param {string} msg
         * @param {string | undefined} code
         * @param {number | undefined} duration */
        warning: (msg, code, duration) =>
            addToast(msg, 'warning', code, duration),
        /** clear all toasts */
        clear: clearToasts,
        /** clear toasts by code */
        clearCode: clearToastsByCode,
        /** clear toasts by id */
        clearID: clearToastByID
    }
)

const typeStyles = {
    default: 'bg-ink-dark text-bg',
    spinner: 'bg-ink-dark text-bg',
    success: 'bg-success text-on-success',
    error: 'bg-danger text-on-danger',
    warning: 'bg-warning text-on-warning'
}

const typeIcons = {
    default: null,
    spinner: (
        <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{ animation: 'spin 0.8s linear infinite' }}
        >
            <path
                d="M7 1.5a5.5 5.5 0 1 1-3.89 1.61"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
            />
            <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 7 7"
                to="360 7 7"
                dur="0.8s"
                repeatCount="indefinite"
            />
        </svg>
    ),

    success: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M2 7l3.5 3.5L12 3"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    ),
    error: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
            />
        </svg>
    ),
    warning: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M7 2v6M7 11v1"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
            />
        </svg>
    )
}

/**
 * Contenedor de toasts. Montar una sola vez en el root de la app.
 *
 * @returns {import('solid-js').JSX.Element}
 */
export function Toaster() {
    return (
        <Portal>
            <div
                class="fixed top-5 right-5 z-100 flex flex-col gap-2 items-end"
                aria-live="polite"
                aria-label="Notificaciones"
            >
                <For each={toasts()}>
                    {t => (
                        <div
                            class={`
                                flex items-center gap-2.5
                                px-4 py-2.5 rounded-xs
                                text-sm font-sans font-normal
                                shadow-sm min-w-48 max-w-xs
                                animate-[fadeInUp_0.2s_ease]
                                ${typeStyles[t.type]}
                            `}
                        >
                            {typeIcons[t.type] && (
                                <span class="shrink-0 opacity-80">
                                    {typeIcons[t.type]}
                                </span>
                            )}
                            <span class="flex-1">{t.message}</span>
                            <button
                                onClick={() =>
                                    setToasts(prev =>
                                        prev.filter(x => x.id !== t.id)
                                    )
                                }
                                aria-label="Descartar"
                                class="shrink-0 opacity-50 hover:opacity-100 transition-opacity cursor-pointer ml-1"
                            >
                                <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 10 10"
                                    fill="none"
                                >
                                    <path
                                        d="M1 1l8 8M9 1L1 9"
                                        stroke="currentColor"
                                        stroke-width="1.2"
                                        stroke-linecap="round"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                </For>
            </div>
        </Portal>
    )
}
