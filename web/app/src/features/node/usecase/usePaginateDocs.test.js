import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiPaginateDocs } = vi.hoisted(() => ({
    apiPaginateDocs: vi.fn()
}))

vi.mock('@/entities/nodes/api', () => ({ apiPaginateDocs }))

import { usePaginateDocs } from './usePaginateDocs'

describe('usePaginateDocs', () => {
    beforeEach(() => apiPaginateDocs.mockReset())

    it('stores API pagination metadata and advances pages', async () => {
        apiPaginateDocs.mockResolvedValue({
            data: [{ id: 'doc-1' }],
            page: 3,
            total_pages: 4,
            total_count: 31
        })
        const pager = usePaginateDocs()

        await pager.run(undefined, { page: 3 })

        expect(pager.results()).toHaveLength(1)
        expect(pager.page()).toBe(3)
        expect(pager.total()).toBe(31)
        expect(pager.totalPages()).toBe(4)
        expect(pager.hasSearched()).toBe(true)
    })

})
