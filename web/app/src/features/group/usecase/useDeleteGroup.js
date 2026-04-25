import { createSignal } from 'solid-js'

import { apiDeleteGroup } from '@/entities/groups/api'
import { toast } from '@/shared/ui'

export function useDeleteGroup() {
    const [loading, setLoading] = createSignal(false)

    const remove = async (/** @type {string} */ groupId) => {
        setLoading(true)
        try {
            await apiDeleteGroup(groupId)
            toast({ type: 'success', message: 'Group deleted successfully.' })
            return [true, null]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}