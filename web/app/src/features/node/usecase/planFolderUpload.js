/**
 * Builds a deduplicated, parent-first directory plan from a directory input.
 * The client intentionally does not cap depth, element count, or total bytes.
 * @param {File[]} files
 * @returns {{ folders: Array<{ id: string, path: string, parentPath: string, name: string, depth: number }>, files: Array<{ id: string, path: string, parentPath: string, file: File }> }}
 */
export function planFolderUpload(files) {
    const folders = new Map()
    const plannedFiles = new Map()

    for (const file of files) {
        const relativePath = String(
            file.webkitRelativePath || file.name || ''
        )
            .replaceAll('\\', '/')
            .split('/')
            .filter(Boolean)
            .join('/')

        if (!relativePath) continue
        const parts = relativePath.split('/')
        const directoryParts = parts.slice(0, -1)

        for (let index = 0; index < directoryParts.length; index += 1) {
            const path = directoryParts.slice(0, index + 1).join('/')
            const parentPath = directoryParts.slice(0, index).join('/')
            if (!folders.has(path)) {
                folders.set(path, {
                    id: `folder:${path}`,
                    path,
                    relativePath: path,
                    parentPath,
                    name: directoryParts[index],
                    depth: index + 1
                })
            }
        }

        if (!plannedFiles.has(relativePath)) {
            plannedFiles.set(relativePath, {
                id: `file:${relativePath}`,
                path: relativePath,
                relativePath,
                parentPath: directoryParts.join('/'),
                file
            })
        }
    }

    return {
        folders: [...folders.values()].sort(
            (a, b) => a.depth - b.depth || a.path.localeCompare(b.path)
        ),
        files: [...plannedFiles.values()],
        total: folders.size + plannedFiles.size
    }
}
