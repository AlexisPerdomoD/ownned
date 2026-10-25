import { createSignal, onMount } from 'solid-js'

import { apiPaginateGroups } from '@/entities/groups/api'

/**
 * @param {Object} opts
 * @param {number} [opts.pageSize=20]
 */
export function usePaginateGroups({ pageSize = 20 } = {}) {
    /**
     * @type {import("solid-js").Signal<import('@/entities/groups').Group[]>}
     */
    const [groups, setGroups] = createSignal([])
    const [page, setPage] = createSignal(1)
    const [total, setTotal] = createSignal(0)
    const [loading, setLoading] = createSignal(true)
    const [search, setSearch] = createSignal('')
    const [error, setError] = createSignal(null)
    let latestRequest = 0

    const fetch = async (
        /** @type {number} */ pg,
        /** @type {string} */ term
    ) => {
        const requestId = ++latestRequest
        setLoading(true)
        setError(null)
        try {
            const res = await apiPaginateGroups(pg, pageSize, term)
            if (requestId !== latestRequest) return false
            setGroups(res.data)
            setTotal(res.total_count)
            setPage(res.page)
            return true
        } catch (cause) {
            if (requestId === latestRequest) {
                setGroups([])
                setTotal(0)
                setError(cause)
            }
            return false
        } finally {
            if (requestId === latestRequest) setLoading(false)
        }
    }

    onMount(() => {
        void fetch(1, '')
    })

    return {
        groups,
        page,
        total,
        loading,
        error,
        search,
        setSearch,
        goTo: (/** @type {number} */ pg) => fetch(pg, search()),
        refresh: () => fetch(page(), search()),
        setPage: (/** @type {number} */ pg) => fetch(pg, search())
    }
}
