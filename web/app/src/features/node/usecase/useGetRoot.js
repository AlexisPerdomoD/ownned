import { createSignal, onMount } from 'solid-js'

import { apiGetRoot } from '@/entities/nodes/api/getRoot'

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
    const [error, setError] = createSignal(null)

    const refresh = async () => {
        setLoading(true)
        setError(null)
        try {
            setRoot((await apiGetRoot()) ?? [])
            return true
        } catch (cause) {
            setRoot([])
            setError(cause)
            return false
        } finally {
            setLoading(false)
        }
    }

    onMount(() => void refresh())

    return { root, loading, error, refresh }
}
