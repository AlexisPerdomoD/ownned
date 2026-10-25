const variants = {
    neutral: 'bg-bg-2 text-ink border-border',
    accent: 'bg-accent-pale text-accent border-accent',
    dark: 'bg-ink-dark text-bg border-ink-dark',
    success: 'bg-success-soft text-success border-success',
    warning: 'bg-warning-soft text-warning border-warning',
    danger: 'bg-danger-soft text-danger border-danger'
}

/**
 * Etiqueta compacta para categorías, estados y metadata.
 *
 * @param {Object} props
 * @param {'neutral' | 'accent' | 'dark' | 'success' | 'warning' | 'danger'} [props.variant='neutral']
 * @param {boolean} [props.dot=false]   - Muestra un punto de color a la izquierda.
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.HTMLAttributes<HTMLSpanElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
export function Badge({
    variant = 'neutral',
    dot = false,
    class: cls = '',
    children,
    ...props
}) {
    return (
        <span
            class={`
                inline-flex items-center gap-1.5
                text-xs tracking-wide uppercase
                px-2 py-0.5 border rounded-xs
                font-sans font-normal
                ${variants[variant]} ${cls}
            `}
            {...props}
        >
            {dot && (
                <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
            )}
            {children}
        </span>
    )
}
