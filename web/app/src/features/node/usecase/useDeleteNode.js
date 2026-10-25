import { createSignal } from 'solid-js'

import { apiDeleteNode } from '@/entities/nodes/api/createNode'
import { toast } from '@/shared/ui'

export function useDeleteNode() {
    const [loading, setLoading] = createSignal(false)
    /**
     * @param {string} nodeId
     * @returns {Promise<[true, null] | [false, { message: string, reason?: string }]>}
     */
    const remove = async (/** @type {string} */ nodeId) => {
        setLoading(true)
        try {
            await apiDeleteNode(nodeId)
            toast.success('Node deleted.')
            return [true, null]
        } catch (e) {
            if (e instanceof Error) {
                return [false, { message: e.message, reason: e.detail?.reason }]
            }

            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}
