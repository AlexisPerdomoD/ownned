/**
 * Campo de texto base.
 *
 * @param {Object} props
 * @param {string} [props.label]                     - Etiqueta visible encima del campo.
 * @param {string} [props.hint]                      - Texto de ayuda debajo del campo.
 * @param {string} [props.error]                     - Mensaje de error; activa estado de error visual.
 * @param {import('solid-js').JSX.Element} [props.prefix] - Icono o texto a la izquierda del input.
 * @param {import('solid-js').JSX.Element} [props.suffix] - Icono o texto a la derecha del input.
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.InputHTMLAttributes<HTMLInputElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
export function Input({
    label,
    hint,
    error,
    prefix,
    suffix,
    class: cls = '',
    id,
    ...props
}) {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 7)}`

    return (
        <div class={`flex flex-col gap-1 ${cls}`}>
            {label && (
                <label
                    for={inputId}
                    class="text-[--text-xs] text-[--color-muted] tracking-wide uppercase"
                >
                    {label}
                </label>
            )}

            <div class="relative flex items-center">
                {prefix && (
                    <span class="absolute left-3 text-[--color-muted] flex items-center">
                        {prefix}
                    </span>
                )}

                <input
                    id={inputId}
                    class={`
                        w-full
                        font-[--font-sans] font-light text-[--text-sm]
                        text-[--color-ink-dark] placeholder:text-[--color-muted]
                        bg-[--color-surface] border rounded-[--radius-xs]
                        px-3 py-2
                        transition-colors duration-[--ease-base]
                        focus:outline-none focus:border-[--color-ink]
                        disabled:opacity-40 disabled:cursor-not-allowed
                        ${error ? 'border-red-400 focus:border-red-500' : 'border-[--color-border] hover:border-[--color-muted]'}
                        ${prefix ? 'pl-9' : ''}
                        ${suffix ? 'pr-9' : ''}
                    `}
                    {...props}
                />

                {suffix && (
                    <span class="absolute right-3 text-[--color-muted] flex items-center">
                        {suffix}
                    </span>
                )}
            </div>

            {error && <p class="text-[--text-xs] text-red-500">{error}</p>}
            {!error && hint && (
                <p class="text-[--text-xs] text-[--color-muted]">{hint}</p>
            )}
        </div>
    )
}
