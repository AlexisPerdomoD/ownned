import { createEffect, createSignal } from 'solid-js'

import { apiGetNode } from '@/entities/nodes/api/getNode'

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

    const load = id => {
        if (!id) return
        setLoading(true)
        apiGetNode(id)
            .then(setNode)
            .finally(() => setLoading(false))
    }

    createEffect(() => {
        const id = getId()
        setNode(null)
        load(id)
    })

    return { node, loading, refresh: () => load(getId()) }
}
