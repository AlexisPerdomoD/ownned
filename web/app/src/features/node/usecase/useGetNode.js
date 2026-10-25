import { createEffect, createSignal } from 'solid-js'

import { apiGetNode } from '@/entities/nodes/api/getNode'
import { getErrorMessage } from '@/shared/errors'

/**
 * @param {() => string} getId
 */
export function useGetNode(getId) {
    /**
     * @type {ReturnType<typeof createSignal<
     *       import('@/entities/nodes').Folder
     *       | import("@/entities/nodes").File
     *       | null
     *     >>}
     */
    const [node, setNode] = createSignal(null)
    const [loading, setLoading] = createSignal(true)
    const [error, setError] = createSignal(null)
    let latestRequest = 0

    const load = async id => {
        const requestId = ++latestRequest
        if (!id) {
            setNode(null)
            setError('Node ID is missing.')
            setLoading(false)
            return false
        }
        setLoading(true)
        setNode(null)
        setError(null)
        try {
            const result = await apiGetNode(id)
            if (requestId !== latestRequest) return false
            setNode(result)
            return true
        } catch (cause) {
            if (requestId !== latestRequest) return false
            setError(getErrorMessage(cause, 'Could not load this node.'))
            return false
        } finally {
            if (requestId === latestRequest) setLoading(false)
        }
    }

    createEffect(() => {
        const id = getId()
        setNode(null)
        load(id)
    })

    return { node, loading, error, refresh: () => load(getId()) }
}
