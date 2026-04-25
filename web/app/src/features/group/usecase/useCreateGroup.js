import { createSignal } from 'solid-js'

import { buildCreateGroupDTO, apiCreateGroup } from '@/entities/groups/api'
import { toast } from '@/shared/ui'

export function useCreateGroup() {
    const [loading, setLoading] = createSignal(false)

    const create = async (/** @type {string} */ name, /** @type {string} */ description) => {
        const [valid, dto] = buildCreateGroupDTO(name, description)
        if (!valid) {
            return [false, dto]
        }

        setLoading(true)
        try {
            const group = await apiCreateGroup(dto)
            toast({ type: 'success', message: 'Group created successfully.' })
            return [true, group]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { create, loading }
}