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

    const fetch = async (
        /** @type {number} */ pg,
        /** @type {string} */ term
    ) => {
        setLoading(true)
        try {
            const res = await apiPaginateGroups(pg, pageSize, term)
            console.log(res)
            setGroups(res.data)
            setTotal(res.total_count)
            setPage(res.page)
        } finally {
            setLoading(false)
        }
    }

    onMount(() => {
        fetch(1, '')
    })

    return {
        groups,
        page,
        total,
        loading,
        search,
        setSearch,
        goTo: (/** @type {number} */ pg) => fetch(pg, search()),
        refresh: () => fetch(page(), search()),
        setPage: (/** @type {number} */ pg) => fetch(pg, search())
    }
}

