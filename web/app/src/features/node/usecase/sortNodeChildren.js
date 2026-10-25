/**
 * Filters dotfiles and sorts one child type without mutating the input list.
 * Folder-first ordering is applied by the caller when it combines folders and
 * files for display.
 * @param {import('@/entities/nodes').Node[]} nodes
 * @param {'name' | 'created' | 'updated'} sortBy
 * @param {'asc' | 'desc'} direction
 * @param {boolean} showDotfiles
 * @returns {import('@/entities/nodes').Node[]}
 */
export function sortNodeChildren(
    nodes,
    sortBy = 'name',
    direction = 'asc',
    showDotfiles = false
) {
    const visible = showDotfiles
        ? nodes
        : nodes.filter(node => !String(node.name ?? '').startsWith('.'))

    return [...visible].sort((a, b) => {
        const key =
            sortBy === 'created'
                ? 'created_at'
                : sortBy === 'updated'
                  ? 'updated_at'
                  : 'name'
        const left = String(a[key] ?? '')
        const right = String(b[key] ?? '')
        const comparison = left.localeCompare(right)
        return direction === 'desc' ? -comparison : comparison
    })
}
