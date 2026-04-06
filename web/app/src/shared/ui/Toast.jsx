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
 * @param {string} message
 * @param {'default' | 'success' | 'error' | 'warning'} [type='default']
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
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
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
        clearCode: clearToastsByCode
    }
)

const typeStyles = {
    default: 'bg-[--color-ink-dark] text-[--color-bg]',
    success: 'bg-green-800 text-green-50',
    error: 'bg-red-700 text-red-50',
    warning: 'bg-amber-700 text-amber-50'
}

const typeIcons = {
    default: null,
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
                class="fixed bottom-5 right-5 z-100 flex flex-col gap-2 items-end"
                aria-live="polite"
                aria-label="Notificaciones"
            >
                <For each={toasts()}>
                    {t => (
                        <div
                            class={`
                                flex items-center gap-2.5
                                px-4 py-2.5 rounded-[--radius-xs]
                                text-[--text-sm] font-[--font-sans] font-normal
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
