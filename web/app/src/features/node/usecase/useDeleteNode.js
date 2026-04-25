import { createSignal } from 'solid-js'

import { apiDeleteNode } from '@/entities/nodes/api/createNode'
import { toast } from '@/shared/ui'

export function useDeleteNode() {
    const [loading, setLoading] = createSignal(false)

    const remove = async (/** @type {string} */ nodeId) => {
        setLoading(true)
        try {
            await apiDeleteNode(nodeId)
            toast({ type: 'success', message: 'Node deleted.' })
            return [true, null]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}