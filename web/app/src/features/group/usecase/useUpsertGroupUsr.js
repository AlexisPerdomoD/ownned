import { createSignal } from 'solid-js'

import { buildUpsertGroupUsrDTO, apiUpsertGroupUsr } from '@/entities/groups/api'
import { toast } from '@/shared/ui'

export function useUpsertGroupUsr() {
    const [loading, setLoading] = createSignal(false)

    const assign = async (
        /** @type {string} */ groupId,
        /** @type {string} */ usrId,
        /** @type {'read_only_access' | 'write_access' | 'owner_access'} */ access
    ) => {
        const [valid, dto] = buildUpsertGroupUsrDTO(usrId, access)
        if (!valid) {
            return [false, dto]
        }

        setLoading(true)
        try {
            await apiUpsertGroupUsr(groupId, dto)
            toast({ type: 'success', message: 'User assigned successfully.' })
            return [true, null]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { assign, loading }
}