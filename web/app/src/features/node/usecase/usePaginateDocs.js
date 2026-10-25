import { createSignal } from 'solid-js'

import { apiPaginateDocs } from '@/entities/nodes/api'
import { getErrorMessage } from '@/shared/errors'

export function usePaginateDocs() {
    const [results, setResults] = createSignal([])
    const [loading, setLoading] = createSignal(false)
    const [page, setPage] = createSignal(1)
    const [total, setTotal] = createSignal(0)
    const [totalPages, setTotalPages] = createSignal(0)
    const [error, setError] = createSignal(null)
    const [hasSearched, setHasSearched] = createSignal(false)
    let latestRequest = 0

    const run = async (rootId, opts = {}) => {
        const requestId = ++latestRequest
        setLoading(true)
        setError(null)
        setHasSearched(true)
        try {
            const res = await apiPaginateDocs({
                rootId,
                page: opts.page ?? page(),
                limit: opts.limit ?? 10,
                search: opts.search ?? '',
                mimetype: opts.mimetype,
                minSize: opts.minSize,
                maxSize: opts.maxSize
            })
            if (requestId !== latestRequest) return false
            setResults(res.data ?? res.items ?? [])
            setTotal(res.total_count ?? res.total ?? 0)
            setTotalPages(res.total_pages ?? 0)
            setPage(res.page ?? opts.page ?? page())
            return true
        } catch (err) {
            if (requestId !== latestRequest) return false
            setResults([])
            setError(getErrorMessage(err, 'Could not search documents.'))
            return false
        } finally {
            if (requestId === latestRequest) setLoading(false)
        }
    }

    const clear = () => {
        latestRequest += 1
        setLoading(false)
        setResults([])
        setPage(1)
        setTotal(0)
        setTotalPages(0)
        setError(null)
        setHasSearched(false)
    }

    return {
        results,
        loading,
        page,
        total,
        totalPages,
        error,
        hasSearched,
        clear,
        run
    }
}
