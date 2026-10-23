import { createSignal } from 'solid-js'

import { buildCreateDocDTO } from '@/entities/docs/api'
import { reqForm } from '@/shared/api/client'

/**
 * @param {() => string} getParentId - function that returns the parent node ID
 * @param {() => void} [onSuccess] - callback when upload succeeds
 * @returns {{ upload: (file: File, description?: string) => Promise<[boolean, any]>, loading: () => boolean }}
 */
export function useCreateDoc(getParentId, onSuccess) {
    const [loading, setLoading] = createSignal(false)

    const upload = async (file, description = '') => {
        const parentId = getParentId()
        if (!parentId) return [false, { general: 'No parent folder selected' }]

        const [valid, dto] = buildCreateDocDTO(parentId, description)
        if (!valid) return [false, dto]

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('parent_id', dto.parent_id)
            if (dto.description) {
                formData.append('description', dto.description)
            }
            formData.append('size', String(file.size))
            formData.append('file', file)

            const doc = await reqForm('/api/v1/nodes/docs', formData)
            onSuccess?.()
            return [true, doc]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { upload, loading }
}
