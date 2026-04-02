/**
 * Línea divisora horizontal u vertical.
 *
 * @param {Object} props
 * @param {'horizontal' | 'vertical'} [props.orientation='horizontal']
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function Divider({ orientation = 'horizontal', class: cls = '' }) {
    if (orientation === 'vertical') {
        return (
            <span class={`inline-block w-px self-stretch bg-[--color-border-subtle] ${cls}`} role="separator" aria-orientation="vertical" />
        )
    }
    return <hr class={`border-none border-t border-[--color-border-subtle] ${cls}`} role="separator" />
}

// ─────────────────────────────────────────────────────────────────────────────

const avatarSizes = {
    sm: 'w-7 h-7 text-[--text-xs]',
    md: 'w-9 h-9 text-[--text-sm]',
    lg: 'w-12 h-12 text-[--text-base]'
}

/**
 * Avatar circular con iniciales como fallback.
 *
 * @param {Object} props
 * @param {string} [props.src]               - URL de la imagen.
 * @param {string} [props.name]              - Nombre completo; se usa para generar iniciales si no hay imagen.
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function Avatar({ src, name = '', size = 'md', class: cls = '' }) {
    const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('')

    return (
        <span
            class={`
                inline-flex items-center justify-center
                rounded-full shrink-0 overflow-hidden
                bg-[--color-accent-pale] text-[--color-accent]
                font-[--font-sans] font-normal select-none
                ${avatarSizes[size]} ${cls}
            `}
        >
            {src ? <img src={src} alt={name} class="w-full h-full object-cover" /> : initials || '?'}
        </span>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

const spinnerSizes = {
    sm: 'w-3.5 h-3.5 border',
    md: 'w-5 h-5 border-2',
    lg: 'w-7 h-7 border-2'
}

/**
 * Indicador de carga circular.
 *
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function Spinner({ size = 'md', class: cls = '' }) {
    return (
        <span
            role="status"
            aria-label="Cargando"
            class={`
                inline-block rounded-full animate-spin
                border-[--color-border] border-t-[--color-ink]
                ${spinnerSizes[size]} ${cls}
            `}
        />
    )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estado vacío genérico para listas y tablas sin resultados.
 *
 * @param {Object} props
 * @param {string} [props.title='Sin resultados']
 * @param {string} [props.description]
 * @param {import('solid-js').JSX.Element} [props.action]  - Slot para un CTA, e.g. un Button.
 * @param {import('solid-js').JSX.Element} [props.icon]    - Icono decorativo.
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function EmptyState({ title = 'Sin resultados', description, action, icon, class: cls = '' }) {
    return (
        <div
            class={`
                flex flex-col items-center justify-center gap-3
                py-16 px-8 text-center
                ${cls}
            `}
        >
            {icon && <span class="text-[--color-border] mb-1 opacity-60">{icon}</span>}
            <p class="font-[--font-serif] text-[--text-base] text-[--color-ink]">{title}</p>
            {description && <p class="text-[--text-sm] text-[--color-muted] max-w-xs leading-relaxed">{description}</p>}
            {action && <div class="mt-2">{action}</div>}
        </div>
    )
}
