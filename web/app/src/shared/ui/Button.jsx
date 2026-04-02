const variants = {
    primary:
        'bg-[--color-ink-dark] text-[--color-bg] border-[--color-ink-dark] hover:bg-[--color-ink]',
    ghost: 'bg-transparent text-[--color-ink] border-[--color-border] hover:bg-[--color-bg-2]',
    accent: 'bg-[--color-accent] text-white border-[--color-accent] hover:bg-[--color-accent-hover]',
    danger: 'bg-transparent text-red-600 border-red-300 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950'
}

const sizes = {
    sm: 'px-3 py-1.5 text-[--text-xs]',
    md: 'px-4 py-2 text-[--text-sm]',
    lg: 'px-6 py-2.5 text-[--text-base]'
}

/**
 * Botón base del design system.
 *
 * @param {Object} props
 * @param {'primary' | 'ghost' | 'accent' | 'danger'} [props.variant='ghost']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.loading=false] - Muestra spinner y deshabilita interacción.
 * @param {boolean} [props.disabled]
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.ButtonHTMLAttributes<HTMLButtonElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
export function Button({
    variant = 'ghost',
    size = 'md',
    loading = false,
    class: cls = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            disabled={disabled || loading}
            class={`
                inline-flex items-center justify-center gap-2
                font-[--font-sans] font-normal tracking-wide
                border rounded-[--radius-xs]
                transition-all duration-[--ease-base]
                cursor-pointer select-none
                disabled:opacity-40 disabled:cursor-not-allowed
                ${variants[variant]} ${sizes[size]} ${cls}
            `}
            {...props}
        >
            {loading && (
                <span class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            )}
            {children}
        </button>
    )
}
