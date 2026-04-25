import { createSignal } from 'solid-js'

import { buildUpdateNodeDTO, apiUpdateNode } from '@/entities/nodes/api/createNode'
import { toast } from '@/shared/ui'

export function useUpdateNode() {
    const [loading, setLoading] = createSignal(false)

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
            toast({ type: 'success', message: 'Node updated.' })
            return [true, node]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { update, loading }
}