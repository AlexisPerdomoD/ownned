const variants = {
    neutral: 'bg-[--color-bg-2] text-[--color-ink] border-[--color-border]',
    accent: 'bg-[--color-accent-pale] text-[--color-accent] border-[--color-accent]',
    dark: 'bg-[--color-ink-dark] text-[--color-bg] border-[--color-ink-dark]',
    success:
        'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
    warning:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
    danger: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
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
                text-[--text-xs] tracking-wide uppercase
                px-2 py-0.5 border rounded-[--radius-xs]
                font-[--font-sans] font-normal
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
