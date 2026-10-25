import { createSignal } from 'solid-js'

import { buildUpsertGroupNodeDTO, apiUpsertGroupNode } from '@/entities/groups/api'
import { ApiForbiddenError, getErrorMessage } from '@/shared/errors'
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
            toast.success('Node added to group.')
            return [true, null]
        } catch (e) {
            if (e instanceof ApiForbiddenError) {
                return [false, { general: 'You cannot share this node.' }]
            }
            return [false, { general: getErrorMessage(e, 'Could not share node.') }]
        } finally {
            setLoading(false)
        }
    }

    return { assign, loading }
}
