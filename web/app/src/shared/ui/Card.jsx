/**
 * Contenedor de superficie elevada.
 * Compuesto por sub-componentes: `Card`, `Card.Header`, `Card.Body`, `Card.Footer`.
 *
 * @example
 * <Card>
 *   <Card.Header title="Documentos" action={<Button size="sm">Nuevo</Button>} />
 *   <Card.Body>...</Card.Body>
 *   <Card.Footer>...</Card.Footer>
 * </Card>
 */

/**
 * @param {Object} props
 * @param {boolean} [props.hoverable=false] - Agrega efecto hover sutil para cards clickeables.
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.HTMLAttributes<HTMLDivElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
export function Card({
    hoverable = false,
    class: cls = '',
    children,
    ...props
}) {
    return (
        <div
            class={`
                bg-[--color-surface] border border-[--color-border]
                rounded-[--radius-sm]
                transition-colors duration-[--ease-base]
                ${hoverable ? 'hover:border-[--color-muted] hover:bg-[--color-bg-2] cursor-pointer' : ''}
                ${cls}
            `}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * Cabecera de la card con título, subtítulo y slot de acción.
 *
 * @param {Object} props
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {import('solid-js').JSX.Element} [props.action]  - Slot derecho, e.g. un Button.
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
Card.Header = function CardHeader({
    title,
    subtitle,
    action,
    class: cls = '',
    ...props
}) {
    return (
        <div
            class={`
                flex items-start justify-between gap-4
                px-4 py-3 border-b border-[--color-border-subtle]
                ${cls}
            `}
            {...props}
        >
            <div class="flex flex-col gap-0.5">
                {title && (
                    <h3 class="font-[--font-serif] text-[--text-base] text-[--color-ink-dark] leading-snug">
                        {title}
                    </h3>
                )}
                {subtitle && (
                    <p class="text-[--text-xs] text-[--color-muted]">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div class="shrink-0">{action}</div>}
        </div>
    )
}

/**
 * Cuerpo principal de la card.
 *
 * @param {Object} props
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.HTMLAttributes<HTMLDivElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
Card.Body = function CardBody({ class: cls = '', children, ...props }) {
    return (
        <div class={`px-4 py-3 ${cls}`} {...props}>
            {children}
        </div>
    )
}

/**
 * Pie de la card, alineado a la derecha por defecto.
 *
 * @param {Object} props
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.HTMLAttributes<HTMLDivElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
Card.Footer = function CardFooter({ class: cls = '', children, ...props }) {
    return (
        <div
            class={`
                flex items-center justify-end gap-2
                px-4 py-3 border-t border-[--color-border-subtle]
                ${cls}
            `}
            {...props}
        >
            {children}
        </div>
    )
}
