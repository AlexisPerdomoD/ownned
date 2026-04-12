import { createSignal, onMount } from 'solid-js'

import { apiGetRoot } from '@/entities/nodes/api'

/**
 * Hook to get user root node.
 *
 * @returns {{
 *   root: import('solid-js').Accessor<import('@/entities/nodes/index').Node[]>,
 *   loading: import('solid-js').Accessor<boolean>
 * }}
 */
export function useGetRoot() {
    /**
     * @type {ReturnType<typeof createSignal<import('@/entities/nodes/index').Node[]>>}
     */
    const [root, setRoot] = createSignal([])
    const [loading, setLoading] = createSignal(true)
    onMount(() => {
        apiGetRoot()
            .then(setRoot)
            .finally(() => setLoading(false))
    })

    return { root, loading }
}
