/**
 * Select nativo estilizado.
 *
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.SelectHTMLAttributes<HTMLSelectElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
export function Select({
    label,
    hint,
    error,
    class: cls = '',
    id,
    children,
    ...props
}) {
    const selectId = id ?? `select-${Math.random().toString(36).slice(2, 7)}`

    return (
        <div class={`flex flex-col gap-1 ${cls}`}>
            {label && (
                <label
                    for={selectId}
                    class="text-[--text-xs] text-[--color-muted] tracking-wide uppercase"
                >
                    {label}
                </label>
            )}

            <div class="relative">
                <select
                    id={selectId}
                    class={`
                        w-full appearance-none
                        font-[--font-sans] font-light text-[--text-sm]
                        text-[--color-ink-dark]
                        bg-[--color-surface] border rounded-[--radius-xs]
                        px-3 py-2 pr-8
                        transition-colors duration-[--ease-base]
                        focus:outline-none focus:border-[--color-ink]
                        disabled:opacity-40 disabled:cursor-not-allowed
                        ${error ? 'border-red-400' : 'border-[--color-border] hover:border-[--color-muted]'}
                    `}
                    {...props}
                >
                    {children}
                </select>
                {/* chevron decorativo */}
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[--color-muted]">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path
                            d="M1 1l4 4 4-4"
                            stroke="currentColor"
                            stroke-width="1.2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </span>
            </div>

            {error && <p class="text-[--text-xs] text-red-500">{error}</p>}
            {!error && hint && (
                <p class="text-[--text-xs] text-[--color-muted]">{hint}</p>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Área de texto multilínea.
 *
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {number} [props.rows=4]
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.TextareaHTMLAttributes<HTMLTextAreaElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
export function Textarea({
    label,
    hint,
    error,
    rows = 4,
    class: cls = '',
    id,
    ...props
}) {
    const textareaId =
        id ?? `textarea-${Math.random().toString(36).slice(2, 7)}`

    return (
        <div class={`flex flex-col gap-1 ${cls}`}>
            {label && (
                <label
                    for={textareaId}
                    class="text-[--text-xs] text-[--color-muted] tracking-wide uppercase"
                >
                    {label}
                </label>
            )}

            <textarea
                id={textareaId}
                rows={rows}
                class={`
                    w-full resize-y
                    font-[--font-sans] font-light text-[--text-sm]
                    text-[--color-ink-dark] placeholder:text-[--color-muted]
                    bg-[--color-surface] border rounded-[--radius-xs]
                    px-3 py-2
                    transition-colors duration-[--ease-base]
                    focus:outline-none focus:border-[--color-ink]
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${error ? 'border-red-400' : 'border-[--color-border] hover:border-[--color-muted]'}
                `}
                {...props}
            />

            {error && <p class="text-[--text-xs] text-red-500">{error}</p>}
            {!error && hint && (
                <p class="text-[--text-xs] text-[--color-muted]">{hint}</p>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checkbox accesible con label integrado.
 *
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.InputHTMLAttributes<HTMLInputElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
export function Checkbox({ label, hint, class: cls = '', id, ...props }) {
    const checkId = id ?? `check-${Math.random().toString(36).slice(2, 7)}`

    return (
        <div class={`flex items-start gap-2.5 ${cls}`}>
            <input
                type="checkbox"
                id={checkId}
                class={`
                    mt-0.5 w-3.5 h-3.5 shrink-0
                    rounded-[--radius-xs] border border-[--color-border]
                    bg-[--color-surface]
                    accent-[--color-ink-dark]
                    cursor-pointer
                    disabled:opacity-40 disabled:cursor-not-allowed
                `}
                {...props}
            />
            {(label || hint) && (
                <div class="flex flex-col gap-0.5">
                    {label && (
                        <label
                            for={checkId}
                            class="text-[--text-sm] text-[--color-ink] cursor-pointer leading-none"
                        >
                            {label}
                        </label>
                    )}
                    {hint && (
                        <p class="text-[--text-xs] text-[--color-muted]">
                            {hint}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
