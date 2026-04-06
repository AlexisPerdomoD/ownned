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
                    class="text-xs text-muted tracking-wide uppercase"
                >
                    {label}
                </label>
            )}

            <div class="relative flex items-center">
                {prefix && (
                    <span class="absolute left-3 text-muted flex items-center">
                        {prefix}
                    </span>
                )}

                <input
                    id={inputId}
                    class={`
                        w-full
                        font-sans font-light text-sm
                        text-ink-dark placeholder:text-muted
                        bg-surface border rounded-xs
                        px-3 py-2
                        transition-colors ease-base
                        focus:outline-none focus:border-ink
                        disabled:opacity-40 disabled:cursor-not-allowed
                        ${error ? 'border-red-400 focus:border-red-500' : 'border-border hover:border-muted'}
                        ${prefix ? 'pl-9' : ''}
                        ${suffix ? 'pr-9' : ''}
                    `}
                    {...props}
                />

                {suffix && (
                    <span class="absolute right-3 text-muted flex items-center">
                        {suffix}
                    </span>
                )}
            </div>

            {error && <p class="text-xs text-danger">{error}</p>}
            {!error && hint && <p class="text-xs text-muted">{hint}</p>}
        </div>
    )
}
