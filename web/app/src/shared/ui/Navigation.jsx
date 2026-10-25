import { For, Show } from 'solid-js'

/**
 * @typedef {Object} TabItem
 * @property {string} key
 * @property {string} label
 * @property {import('solid-js').JSX.Element} [icon]
 * @property {number} [count]   - Badge numérico opcional junto a la label.
 */

/**
 * Navegación por tabs, estilo línea inferior.
 *
 * @param {Object} props
 * @param {TabItem[]} props.items
 * @param {string} props.active            - Key del tab activo.
 * @param {(key: string) => void} props.onChange
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function Tabs({ items, active, onChange, class: cls = '' }) {
    return (
        <nav
            class={`flex items-end gap-0 border-b border-border ${cls}`}
            role="tablist"
        >
            <For each={items}>
                {item => {
                    const isActive = () => item.key === active
                    return (
                        <button
                            role="tab"
                            aria-selected={isActive()}
                            onClick={() => onChange(item.key)}
                            class={`
                                inline-flex items-center gap-1.5
                                px-4 py-2.5 text-sm font-sans
                                border-b-[1.5px] -mb-px
                                transition-colors duration-base
                                cursor-pointer whitespace-nowrap
                                ${
                                    isActive()
                                        ? 'border-ink-dark text-ink-dark font-normal'
                                        : 'border-transparent text-muted hover:text-ink font-light'
                                }
                            `}
                        >
                            {item.icon && (
                                <span class="opacity-70" style="font-size:14px">
                                    {item.icon}
                                </span>
                            )}
                            {item.label}
                            {item.count !== undefined && (
                                <span
                                    class={`
                                        inline-flex items-center justify-center
                                        min-w-4 h-4 px-1 rounded-full text-[10px]
                                        ${isActive() ? 'bg-ink-dark text-bg' : 'bg-bg-2 text-muted'}
                                    `}
                                >
                                    {item.count}
                                </span>
                            )}
                        </button>
                    )
                }}
            </For>
        </nav>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BreadcrumbItem
 * @property {string} label
 * @property {string} [href]       - Si se omite, el item se renderiza como texto plano (último).
 * @property {() => void} [onClick]
 */

/**
 * Migas de pan para jerarquía de carpetas/nodos.
 *
 * @param {Object} props
 * @param {BreadcrumbItem[]} props.items
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function Breadcrumb({ items, class: cls = '' }) {
    return (
        <nav
            aria-label="Breadcrumb"
            class={`flex items-center gap-1.5 flex-wrap ${cls}`}
        >
            <For each={items}>
                {(item, index) => {
                    const isLast = () => index() === items.length - 1
                    return (
                        <>
                            <Show when={index() > 0}>
                                <span class="text-border text-xs select-none">
                                    /
                                </span>
                            </Show>
                            <Show
                                when={!isLast() && (item.href || item.onClick)}
                                fallback={
                                    <span
                                        class="text-sm text-ink-dark font-normal"
                                        aria-current={
                                            isLast() ? 'page' : undefined
                                        }
                                    >
                                        {item.label}
                                    </span>
                                }
                            >
                                <a
                                    href={item.href ?? '#'}
                                    onClick={e => {
                                        if (item.onClick) {
                                            e.preventDefault()
                                            item.onClick()
                                        }
                                    }}
                                    class="
                                        text-sm text-muted
                                        hover:text-ink
                                        transition-colors duration-base
                                        underline underline-offset-2 decoration-border
                                    "
                                >
                                    {item.label}
                                </a>
                            </Show>
                        </>
                    )
                }}
            </For>
        </nav>
    )
}
