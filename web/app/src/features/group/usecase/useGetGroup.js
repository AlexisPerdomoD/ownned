import { createEffect, createSignal } from 'solid-js'

import { apiGetGroup } from '@/entities/groups/api'

/**
 * @param {() => string} getId
 */
export function useGetGroup(getId) {
    const [group, setGroup] = createSignal(null)
    const [loading, setLoading] = createSignal(true)
    const [error, setError] = createSignal(null)
    let latestRequest = 0

    const load = async id => {
        if (!id) {
            latestRequest += 1
            setGroup(null)
            setError(null)
            setLoading(false)
            return null
        }
        const requestId = ++latestRequest
        setLoading(true)
        setError(null)
        try {
            const result = await apiGetGroup(id)
            if (requestId === latestRequest) setGroup(result)
            return result
        } catch (cause) {
            if (requestId === latestRequest) {
                setGroup(null)
                setError(cause)
            }
            return null
        } finally {
            if (requestId === latestRequest) setLoading(false)
        }
    }

    createEffect(() => {
        const id = getId()
        setGroup(null)
        void load(id)
    })

    return { group, loading, error, refresh: () => load(getId()) }
}
