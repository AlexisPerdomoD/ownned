import { createSignal } from 'solid-js'

import { buildUpsertGroupNodeDTO, apiUpsertGroupNode } from '@/entities/groups/api'
import { toast } from '@/shared/ui'

export function useUpsertGroupNode() {
    const [loading, setLoading] = createSignal(false)

    const assign = async (/** @type {string} */ groupId, /** @type {string} */ nodeId) => {
        const [valid, dto] = buildUpsertGroupNodeDTO(nodeId)
        if (!valid) {
            return [false, dto]
        }

        setLoading(true)
        try {
            await apiUpsertGroupNode(groupId, dto)
            toast({ type: 'success', message: 'Node added to group.' })
            return [true, null]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { assign, loading }
}