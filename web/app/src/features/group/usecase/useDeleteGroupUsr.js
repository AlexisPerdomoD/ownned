import { createSignal } from 'solid-js'

import { apiDeleteGroupUsr } from '@/entities/groups/api'
import { toast } from '@/shared/ui'

export function useDeleteGroupUsr() {
    const [loading, setLoading] = createSignal(false)

    const remove = async (/** @type {string} */ groupId, /** @type {string} */ usrId) => {
        setLoading(true)
        try {
            await apiDeleteGroupUsr(groupId, usrId)
            toast({ type: 'success', message: 'User removed from group.' })
            return [true, null]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}