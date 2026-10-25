import { createSignal } from 'solid-js'

import {
    apiCreateFolder,
    buildCreateFolderDTO
} from '@/entities/nodes/api/createNode'
import { ApiError } from '@/shared/errors'
import { toast } from '@/shared/ui'

export function useCreateFolder() {
    const [loading, setLoading] = createSignal(false)
    /**
     * @param {string} parentId
     * @param {string} name
     * @param {string} description
     * @returns {Promise<[true, import('@/entities/nodes').Node] | [false, { message: string, reason?: string }]>}
     */
    const create = async (
        /** @type {string} */ parentId,
        /** @type {string} */ name,
        /** @type {string} */ description
    ) => {
        const [valid, dto] = buildCreateFolderDTO(parentId, name, description)
        if (!valid) {
            return [false, dto]
        }

        setLoading(true)
        try {
            const node = await apiCreateFolder(dto)
            toast.success('Folder created.')
            return [true, node]
        } catch (e) {
            if (e instanceof ApiError) {
                return [false, { message: e.message, reason: e.detail?.reason }]
            }

            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { create, loading }
}
