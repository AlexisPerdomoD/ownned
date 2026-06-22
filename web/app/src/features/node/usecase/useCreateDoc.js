import { createSignal } from 'solid-js'

import { buildCreateDocDTO } from '@/entities/docs/api'

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
            formData.append('file', file)
            formData.append('size', String(file.size))

            const res = await fetch('/api/v1/docs', {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            })

            if (!res.ok) {
                const msg = await res.json().then(r => r?.detail?.reason || r.message).catch(() => 'Upload failed')
                return [false, { general: msg }]
            }

            const doc = await res.json()
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
