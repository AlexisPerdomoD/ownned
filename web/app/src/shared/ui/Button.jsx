import { splitProps } from 'solid-js'

const variants = {
    primary: 'bg-ink-dark text-bg border-ink-dark hover:bg-ink',
    ghost: 'bg-transparent text-ink border-border hover:bg-bg-2',
    accent: 'bg-accent text-on-accent border-accent hover:bg-accent-hover',
    danger: 'bg-transparent text-danger border-danger hover:bg-danger-soft'
}

const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base'
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
export function Button(props) {
    // NOTE: no se destructuran props: disabled/loading podrían cambiar en runtime.
    const [own, rest] = splitProps(props, [
        'variant',
        'size',
        'loading',
        'class',
        'disabled',
        'children'
    ])
    return (
        <button
            disabled={own.disabled || own.loading}
            class={`
                inline-flex items-center justify-center gap-2
                font-sans font-normal tracking-wide
                border rounded-xs
                transition-all duration-base
                cursor-pointer select-none
                disabled:opacity-40 disabled:cursor-not-allowed
                ${variants[own.variant ?? 'ghost']} ${sizes[own.size ?? 'md']} ${own.class ?? ''}
            `}
            {...rest}
        >
            {own.loading && (
                <span class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            )}
            {own.children}
        </button>
    )
}
