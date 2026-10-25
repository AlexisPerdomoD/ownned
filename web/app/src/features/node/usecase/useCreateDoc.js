import { createSignal } from 'solid-js'

import { buildCreateDocDTO } from '@/entities/docs/api'
import { ApiConflictError } from '@/shared/errors'
import { reqForm } from '@/shared/api/client'
import { toast } from '@/shared/ui'

const MAX_NAME_RETRIES = 10

// NOTE: el backend aplica el índice único ux_nodes_parent_name; ante 409
// se reintenta renombrando el archivo (solo archivos, no carpetas) como
// `name (1).ext`, incrementando el sufijo hasta MAX_NAME_RETRIES.
function withSuffixes(fileName, suffix) {
    const dot = fileName.lastIndexOf('.')
    if (dot <= 0) return `${fileName} (${suffix})`
    return `${fileName.slice(0, dot)} (${suffix})${fileName.slice(dot)}`
}

function renamedFile(file, suffix) {
    try {
        return new File([file], withSuffixes(file.name, suffix), {
            type: file.type
        })
    } catch {
        // File API no disponible (raro en navegadores modernos): crear FormData directo
        return {
            size: file.size,
            name: withSuffixes(file.name, suffix)
        }
    }
}

/**
 * @param {() => string} getParentId - function that returns the parent node ID
 * @param {() => void} [onSuccess] - callback when upload succeeds
 * @returns {{ upload: (file: File, description?: string, parentIdOverride?: string) => Promise<[boolean, any]>, loading: () => boolean }}
 */
export function useCreateDoc(getParentId, onSuccess) {
    const [loading, setLoading] = createSignal(false)

    const upload = async (file, description = '', parentIdOverride) => {
        const parentId = parentIdOverride ?? getParentId()
        if (!parentId) return [false, { general: 'No parent folder selected' }]

        const [valid, dto] = buildCreateDocDTO(parentId, description)
        if (!valid) return [false, dto]

        setLoading(true)
        let attempt = 0
        let activeFile = file
        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                try {
                    const formData = new FormData()
                    formData.append('parent_id', dto.parent_id)
                    if (dto.description) {
                        formData.append('description', dto.description)
                    }
                    formData.append('size', String(activeFile.size))
                    formData.append('file', activeFile)

                    const doc = await reqForm('/api/v1/nodes/docs', formData)
                    onSuccess?.()
                    if (attempt > 0) {
                        toast({
                            type: 'warning',
                            message: `Name already existed; saved as "${activeFile.name}"`
                        })
                    }
                    return [true, doc]
                } catch (e) {
                    if (
                        e instanceof ApiConflictError &&
                        attempt < MAX_NAME_RETRIES
                    ) {
                        attempt += 1
                        activeFile = renamedFile(file, attempt)
                        continue
                    }
                    return [
                        false,
                        {
                            general:
                                e?.message ||
                                e?.detail?.reason ||
                                'Upload failed'
                        }
                    ]
                }
            }
        } finally {
            setLoading(false)
        }
    }

    return { upload, loading }
}
