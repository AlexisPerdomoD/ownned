import { createSignal } from 'solid-js'

import { buildUpdateGroupDTO, apiUpdateGroup } from '@/entities/groups/api'
import { toast } from '@/shared/ui'

export function useUpdateGroup() {
    const [loading, setLoading] = createSignal(false)

    const update = async (
        /** @type {string} */ groupId,
        /** @type {string} */ name,
        /** @type {string} */ description
    ) => {
        const [valid, dto] = buildUpdateGroupDTO(name, description)
        if (!valid) {
            return [false, dto]
        }

        setLoading(true)
        try {
            const group = await apiUpdateGroup(groupId, dto)
            toast({ type: 'success', message: 'Group updated successfully.' })
            return [true, group]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { update, loading }
}