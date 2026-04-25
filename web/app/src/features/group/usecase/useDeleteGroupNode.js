import { createSignal } from 'solid-js'

import { buildUpsertGroupNodeDTO, apiDeleteGroupNode } from '@/entities/groups/api'
import { toast } from '@/shared/ui'

export function useDeleteGroupNode() {
    const [loading, setLoading] = createSignal(false)

    const remove = async (/** @type {string} */ groupId, /** @type {string} */ nodeId) => {
        setLoading(true)
        try {
            await apiDeleteGroupNode(groupId, nodeId)
            toast({ type: 'success', message: 'Node removed from group.' })
            return [true, null]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}