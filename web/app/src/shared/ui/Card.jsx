/**
 * Surface container with sub-components: `Card`, `Card.Header`, `Card.Body`, `Card.Footer`.
 *
 * @example
 * <Card onClick={handleClick}>
 *   <Card.Header title="Document" action={<Button size="sm">New</Button>} />
 *   <Card.Body>...</Card.Body>
 *   <Card.Footer>...</Card.Footer>
 * </Card>
 */

/**
 * @param {Object} props
 * @param {boolean} [props.hoverable=false] - Adds subtle hover effect for clickable cards.
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.HTMLAttributes<HTMLDivElement>} props
 * @returns {import('solid-js').JSX.Element}
 */
export function Card({
    hoverable = false,
    class: cls = '',
    children,
    onClick,
    ...rest
}) {
    return (
        <div
            class={`
                bg-bg border border-border-subtle
                rounease-basition-colors ease-base
                ${hoverable ? 'hover:border-accent  hover:bg-bg-2 cursor-pointer' : ''}
                ${cls}
            `}
            onClick={onClick}
            {...rest}
        >
            {children}
        </div>
    )
}

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
                px-4 py-3 border-b border-border-subtle
                ${cls}
            `}
            {...props}
        >
            <div class="flex flex-col gap-0.5">
                {title && (
                    <h3 class="font-serif text-base text-ink-dark leading-snug">
                        {title}
                    </h3>
                )}
                {subtitle && <p class="text-xs text-muted">{subtitle}</p>}
            </div>
            {action && <div class="shrink-0">{action}</div>}
        </div>
    )
}

Card.Body = function CardBody({
    class: cls = '',
    children,
    onClick,
    ...props
}) {
    return (
        <div class={`px-4 py-3 ${cls}`} onClick={onClick} {...props}>
            {children}
        </div>
    )
}

Card.Footer = function CardFooter({
    class: cls = '',
    children,
    onClick,
    ...props
}) {
    return (
        <div
            class={`
                flex items-center justify-between
                px-4 py-3 border-t border-border-subtle
                ${cls}
            `}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    )
}
