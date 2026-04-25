import { createEffect, createSignal } from 'solid-js'

import { apiGetGroup } from '@/entities/groups/api'

/**
 * @param {() => string} getId
 */
export function useGetGroup(getId) {
    const [group, setGroup] = createSignal(null)
    const [loading, setLoading] = createSignal(true)

    createEffect(() => {
        const id = getId()
        if (!id) {
            setLoading(false)
            return
        }
        setLoading(true)
        setGroup(null)
        apiGetGroup(id)
            .then(setGroup)
            .finally(() => setLoading(false))
    })

    return { group, loading }
}