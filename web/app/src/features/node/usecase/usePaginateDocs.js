import { createSignal } from 'solid-js'

import { apiPaginateDocs } from '@/entities/nodes/api'

export function usePaginateDocs() {
    const [results, setResults] = createSignal([])
    const [loading, setLoading] = createSignal(false)
    const [page, setPage] = createSignal(1)

    const run = async (rootId, opts = {}) => {
        setLoading(true)
        try {
            const res = await apiPaginateDocs({
                rootId,
                page: opts.page ?? 1,
                limit: opts.limit ?? 10,
                search: opts.search ?? '',
                mimetype: opts.mimetype,
                minSize: opts.minSize,
                maxSize: opts.maxSize
            })
            setResults(res.data ?? res.items ?? [])
            if (opts.page) setPage(opts.page)
            return true
        } catch {
            setResults([])
            return false
        } finally {
            setLoading(false)
        }
    }

    const clear = () => {
        setResults([])
        setPage(1)
    }

    return { results, loading, page, clear, run }
}
