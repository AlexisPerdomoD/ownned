import { Divider } from './Atoms'

/**
 * Layout de aplicación con sidebar colapsable.
 * Compuesto por `AppShell`, `AppShell.Sidebar` y `AppShell.Content`.
 *
 * @example
 * <AppShell>
 *   <AppShell.Sidebar>
 *     <NavItem href="/nodes" icon={<FolderIcon />}>Archivos</NavItem>
 *     <NavItem href="/groups">Grupos</NavItem>
 *   </AppShell.Sidebar>
 *   <AppShell.Content>
 *     <Outlet />
 *   </AppShell.Content>
 * </AppShell>
 */

/**
 * @param {Object} props
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.Element} props.children
 * @returns {import('solid-js').JSX.Element}
 */
export function AppShell({ class: cls = '', children }) {
    return (
        <div class={`flex h-screen overflow-hidden bg-[--color-bg] ${cls}`}>
            {children}
        </div>
    )
}

/**
 * Barra lateral de la app.
 *
 * @param {Object} props
 * @param {string} [props.brand]                  - Nombre/logo de la app.
 * @param {import('solid-js').JSX.Element} [props.footer] - Slot inferior (e.g. avatar de usuario).
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.Element} props.children
 * @returns {import('solid-js').JSX.Element}
 */
AppShell.Sidebar = function Sidebar({
    brand,
    footer,
    class: cls = '',
    children
}) {
    return (
        <aside
            class={`
                w-52 shrink-0 flex flex-col
                bg-[--color-bg-2] border-r border-[--color-border]
                h-full overflow-y-auto
                ${cls}
            `}
        >
            {/* Brand */}
            {brand && (
                <div class="px-4 py-4 border-b border-[--color-border-subtle]">
                    <span class="font-[--font-serif] text-[--text-base] text-[--color-ink-dark]">
                        {brand}
                    </span>
                </div>
            )}

            {/* Nav items */}
            <nav class="flex-1 py-3 px-2 flex flex-col gap-0.5">{children}</nav>

            {/* Footer slot */}
            {footer && (
                <>
                    <Divider />
                    <div class="px-3 py-3">{footer}</div>
                </>
            )}
        </aside>
    )
}

/**
 * Área de contenido principal scrolleable.
 *
 * @param {Object} props
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.Element} props.children
 * @returns {import('solid-js').JSX.Element}
 */
AppShell.Content = function Content({ class: cls = '', children }) {
    return <main class={`flex-1 overflow-y-auto ${cls}`}>{children}</main>
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ítem de navegación del sidebar.
 *
 * @param {Object} props
 * @param {string} [props.href]
 * @param {boolean} [props.active=false]
 * @param {import('solid-js').JSX.Element} [props.icon]
 * @param {() => void} [props.onClick]
 * @param {string} [props.class]
 * @param {import('solid-js').JSX.Element} props.children
 * @returns {import('solid-js').JSX.Element}
 */
export function NavItem({
    href,
    active = false,
    icon,
    onClick,
    class: cls = '',
    children
}) {
    const base = `
        flex items-center gap-2.5 w-full
        px-3 py-2 rounded-[--radius-xs]
        text-[--text-sm] font-[--font-sans] font-light
        transition-colors duration-[--ease-base]
        cursor-pointer
        ${
            active
                ? 'bg-[--color-surface] text-[--color-ink-dark] border border-[--color-border] font-normal'
                : 'text-[--color-ink] hover:bg-[--color-surface] hover:text-[--color-ink-dark]'
        }
        ${cls}
    `

    const content = (
        <>
            {icon && (
                <span class="shrink-0 opacity-60" style="font-size:15px">
                    {icon}
                </span>
            )}
            {children}
        </>
    )

    if (href) {
        return (
            <a href={href} class={base} onClick={onClick}>
                {content}
            </a>
        )
    }
    return (
        <button class={base} onClick={onClick}>
            {content}
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cabecera de página estandarizada.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {import('solid-js').JSX.Element} [props.actions]  - Slot derecho para botones.
 * @param {import('solid-js').JSX.Element} [props.breadcrumb]
 * @param {() => void} [props.onBack] - Callback para botón atrás.
 * @param {string} [props.backTo] - Ruta para botón atrás (usa navigate si no hay callback).
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function PageHeader({
    title,
    subtitle,
    actions,
    breadcrumb,
    onBack,
    backTo,
    class: cls = ''
}) {
    return (
        <div class={`flex items-start justify-between gap-4 mb-6 ${cls}`}>
            <div class="flex flex-col gap-1">
                {(breadcrumb || onBack || backTo) && (
                    <div class="flex items-center gap-2 mb-1">
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                class="text-[--text-sm] text-[--color-accent] hover:underline"
                            >
                                ← Back
                            </button>
                        )}
                        {backTo && !onBack && (
                            <a
                                href={backTo}
                                class="text-[--text-sm] text-[--color-accent] hover:underline"
                            >
                                ← Back
                            </a>
                        )}
                    </div>
                )}
                {breadcrumb}
                <h1 class="font-[--font-serif] text-[--text-2xl] text-[--color-ink-dark] leading-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p class="text-[--text-sm] text-[--color-muted]">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div class="flex items-center gap-2 shrink-0 mt-1">
                    {actions}
                </div>
            )}
        </div>
    )
}
