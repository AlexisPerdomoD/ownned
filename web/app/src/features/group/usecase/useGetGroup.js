import { createEffect, createSignal } from 'solid-js'

import { apiGetGroup } from '@/entities/groups/api'

/**
 * @param {() => string} getId
 */
export function useGetGroup(getId) {
    const [group, setGroup] = createSignal(null)
    const [loading, setLoading] = createSignal(true)
    let latestRequest = 0

    const load = async id => {
        if (!id) {
            setGroup(null)
            setLoading(false)
            return null
        }
        const requestId = ++latestRequest
        setLoading(true)
        try {
            const result = await apiGetGroup(id)
            if (requestId === latestRequest) setGroup(result)
            return result
        } finally {
            if (requestId === latestRequest) setLoading(false)
        }
    }

    createEffect(() => {
        const id = getId()
        setGroup(null)
        void load(id)
    })

    return { group, loading, refresh: () => load(getId()) }
}
