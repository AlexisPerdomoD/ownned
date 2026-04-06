import { For, Show } from 'solid-js'

import { EmptyState, Spinner } from './Atoms'

/**
 * @typedef {Object} TableColumn
 * @property {string} key                             - Clave del objeto de dato o identificador único.
 * @property {string} header                          - Texto de la cabecera.
 * @property {(row: any) => import('solid-js').JSX.Element} [render] - Render custom de la celda.
 * @property {string} [class]                         - Clases extra para todas las celdas de esta columna.
 * @property {'left' | 'center' | 'right'} [align='left']
 */

const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
}

/**
 * Tabla de datos con estados de carga y vacío.
 *
 * @param {Object} props
 * @param {TableColumn[]} props.columns
 * @param {any[]} props.rows                           - Array de objetos de datos.
 * @param {string} [props.rowKey='id']                 - Propiedad única por fila para el key de SolidJS.
 * @param {boolean} [props.loading=false]
 * @param {string} [props.emptyTitle='Sin resultados']
 * @param {string} [props.emptyDescription]
 * @param {(row: any) => void} [props.onRowClick]      - Hace la fila clickeable si se provee.
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function Table({
    columns,
    rows,
    rowKey = 'id',
    loading = false,
    emptyTitle = 'Sin resultados',
    emptyDescription,
    onRowClick,
    class: cls = ''
}) {
    return (
        <div class={`w-full overflow-x-auto ${cls}`}>
            <table class="w-full border-collapse font-[--font-sans] text-[--text-sm]">
                <thead>
                    <tr class="border-b border-[--color-border]">
                        <For each={columns}>
                            {col => (
                                <th
                                    class={`
                                        px-3 py-2.5 font-normal
                                        text-[--text-xs] tracking-wide uppercase
                                        text-[--color-muted]
                                        ${alignClass[col.align ?? 'left']}
                                        ${col.class ?? ''}
                                    `}
                                >
                                    {col.header}
                                </th>
                            )}
                        </For>
                    </tr>
                </thead>

                <tbody>
                    <Show when={loading}>
                        <tr>
                            <td
                                colspan={columns.length}
                                class="py-12 text-center"
                            >
                                <Spinner size="md" class="mx-auto" />
                            </td>
                        </tr>
                    </Show>

                    <Show when={!loading && rows?.length === 0}>
                        <tr>
                            <td colspan={columns.length}>
                                <EmptyState
                                    title={emptyTitle}
                                    description={emptyDescription}
                                />
                            </td>
                        </tr>
                    </Show>

                    <Show when={!loading && rows?.length > 0}>
                        <For each={rows}>
                            {row => (
                                <tr
                                    class={`
                                        border-b border-[--color-border-subtle]
                                        transition-colors duration-[--ease-base]
                                        ${onRowClick ? 'hover:bg-[--color-bg-2] cursor-pointer' : 'hover:bg-[--color-bg-2]/50'}
                                    `}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    <For each={columns}>
                                        {col => (
                                            <td
                                                class={`
                                                    px-3 py-3 text-[--color-ink]
                                                    ${alignClass[col.align ?? 'left']}
                                                    ${col.class ?? ''}
                                                `}
                                            >
                                                {col.render
                                                    ? col.render(row)
                                                    : row[col.key]}
                                            </td>
                                        )}
                                    </For>
                                </tr>
                            )}
                        </For>
                    </Show>
                </tbody>
            </table>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginador simple para usar junto a `<Table />`.
 *
 * @param {Object} props
 * @param {number} props.page          - Página actual (base 1).
 * @param {number} props.total         - Total de ítems.
 * @param {number} [props.pageSize=20]
 * @param {(page: number) => void} props.onChange
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function Pagination({
    page,
    total,
    pageSize = 20,
    onChange,
    class: cls = ''
}) {
    const totalPages = () => Math.ceil(total / pageSize)
    const from = () => Math.min((page - 1) * pageSize + 1, total)
    const to = () => Math.min(page * pageSize, total)

    return (
        <div class={`flex items-center justify-between gap-4 ${cls}`}>
            <span class="text-[--text-xs] text-[--color-muted] font-[--font-mono]">
                {from()}–{to()} de {total}
            </span>

            <div class="flex items-center gap-1">
                <button
                    disabled={page <= 1}
                    onClick={() => onChange(page - 1)}
                    class="
                        px-3 py-1.5 text-[--text-sm] text-[--color-ink]
                        border border-[--color-border] rounded-[--radius-xs]
                        hover:bg-[--color-bg-2] disabled:opacity-30
                        disabled:cursor-not-allowed transition-colors
                        duration-[--ease-base] cursor-pointer
                    "
                    aria-label="Página anterior"
                >
                    ←
                </button>
                <span class="px-3 py-1.5 text-[--text-xs] text-[--color-muted] font-[--font-mono]">
                    {page} / {totalPages()}
                </span>
                <button
                    disabled={page >= totalPages()}
                    onClick={() => onChange(page + 1)}
                    class="
                        px-3 py-1.5 text-[--text-sm] text-[--color-ink]
                        border border-[--color-border] rounded-[--radius-xs]
                        hover:bg-[--color-bg-2] disabled:opacity-30
                        disabled:cursor-not-allowed transition-colors
                        duration-[--ease-base] cursor-pointer
                    "
                    aria-label="Página siguiente"
                >
                    →
                </button>
            </div>
        </div>
    )
}
