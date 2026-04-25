import { createSignal } from 'solid-js'

import { buildCreateFolderDTO, apiCreateFolder } from '@/entities/nodes/api/createNode'
import { toast } from '@/shared/ui'

export function useCreateFolder() {
    const [loading, setLoading] = createSignal(false)

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
            toast({ type: 'success', message: 'Folder created.' })
            return [true, node]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { create, loading }
}