import { createEffect, createSignal } from 'solid-js'

import { apiGetNode } from '@/entities/nodes/api'

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
    const [loading, setLoading] = createSignal(false)

    createEffect(() => {
        const id = getId()
        setLoading(true)
        setNode(null)
        apiGetNode(id)
            .then(setNode)
            .finally(() => setLoading(false))
    })

    return { node, loading }
}
