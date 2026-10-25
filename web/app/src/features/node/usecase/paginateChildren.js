export const CHILDREN_PAGE_SIZE = 100

/**
 * Limits the number of folder children rendered at once while preserving the
 * folder-first order supplied by the caller.
 * @param {import('@/entities/nodes').Node[]} folders
 * @param {import('@/entities/nodes').Node[]} files
 * @param {number} requestedPage
 * @returns {{ folders: import('@/entities/nodes').Node[], files: import('@/entities/nodes').Node[], page: number, total: number, totalPages: number }}
 */
export function paginateChildren(
    folders,
    files,
    requestedPage,
    pageSize = CHILDREN_PAGE_SIZE
) {
    const all = [...folders, ...files]
    const total = all.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(Math.max(requestedPage, 1), totalPages)
    const start = (page - 1) * pageSize
    const visible = all.slice(start, start + pageSize)

    return {
        folders: visible.filter(node => node.type === 'folder'),
        files: visible.filter(node => node.type === 'file'),
        page,
        total,
        totalPages
    }
}
