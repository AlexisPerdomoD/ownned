import { createSignal } from 'solid-js'

import {
    apiUpdateNode,
    buildUpdateNodeDTO
} from '@/entities/nodes/api/createNode'
import { ApiError } from '@/shared/errors'
import { toast } from '@/shared/ui'

export function useUpdateNode() {
    const [loading, setLoading] = createSignal(false)

    /**
     * @param {string} nodeId
     * @param {string} name
     * @param {string} description
     * @returns {Promise<[true, import('@/entities/nodes').Node] | [false, { message: string, reason?: string }]>}
     */
    const update = async (
        /** @type {string} */ nodeId,
        /** @type {string} */ name,
        /** @type {string} */ description
    ) => {
        const [valid, dto] = buildUpdateNodeDTO(name, description)
        if (!valid) {
            return [false, dto]
        }

        setLoading(true)
        try {
            const node = await apiUpdateNode(nodeId, dto)
            toast.success('Node updated.')
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

    return { update, loading }
}
