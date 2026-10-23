import { createSignal } from 'solid-js'

import { apiPaginateNodes } from '@/entities/nodes/api'

export function usePaginateNodes() {
    const [results, setResults] = createSignal([])
    const [loading, setLoading] = createSignal(false)
    const [page, setPage] = createSignal(1)
    const [total, setTotal] = createSignal(0)
    const [search, setSearch] = createSignal('')

    const run = async (rootId, opts = {}) => {
        setLoading(true)
        try {
            const res = await apiPaginateNodes({
                rootId,
                page: opts.page ?? page(),
                limit: opts.limit ?? 10,
                search: opts.search ?? search()
            })
            setResults(res.data ?? res.items ?? [])
            setTotal(res.total ?? 0)
            if (opts.page) setPage(opts.page)
        } catch {
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    return { results, loading, page, total, search, setSearch, setPage, run }
}