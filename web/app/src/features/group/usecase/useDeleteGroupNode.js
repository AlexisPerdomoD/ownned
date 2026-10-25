import { createSignal } from 'solid-js'

import { apiDeleteGroupNode } from '@/entities/groups/api'
import { getErrorMessage } from '@/shared/errors'
import { toast } from '@/shared/ui'

export function useDeleteGroupNode() {
    const [loading, setLoading] = createSignal(false)

    const remove = async (/** @type {string} */ groupId, /** @type {string} */ nodeId) => {
        setLoading(true)
        try {
            await apiDeleteGroupNode(groupId, nodeId)
            toast.success('Node removed from group.')
            return [true, null]
        } catch (e) {
            return [false, { general: getErrorMessage(e, 'Could not remove node.') }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}
