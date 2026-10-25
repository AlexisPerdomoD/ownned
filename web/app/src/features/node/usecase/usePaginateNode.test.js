import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiPaginateNodes } = vi.hoisted(() => ({
    apiPaginateNodes: vi.fn()
}))

vi.mock('@/entities/nodes/api', () => ({ apiPaginateNodes }))

import { usePaginateNodes } from './usePaginateNode'

describe('usePaginateNodes', () => {
    beforeEach(() => apiPaginateNodes.mockReset())

    it('stores API pagination metadata', async () => {
        apiPaginateNodes.mockResolvedValue({
            data: [{ id: 'folder-1' }],
            page: 2,
            total_pages: 5,
            total_count: 42
        })
        const pager = usePaginateNodes()

        await pager.run('parent-id', { page: 2 })

        expect(pager.results()).toHaveLength(1)
        expect(pager.page()).toBe(2)
        expect(pager.total()).toBe(42)
        expect(pager.totalPages()).toBe(5)
        expect(pager.hasSearched()).toBe(true)
        expect(pager.error()).toBe(null)
    })

    it('ignores an older search response after a newer request starts', async () => {
        let resolveFirst
        let resolveSecond
        apiPaginateNodes
            .mockImplementationOnce(
                () =>
                    new Promise(resolve => {
                        resolveFirst = resolve
                    })
            )
            .mockImplementationOnce(
                () =>
                    new Promise(resolve => {
                        resolveSecond = resolve
                    })
            )
        const pager = usePaginateNodes()

        const first = pager.run('parent-id', { search: 'old' })
        const second = pager.run('parent-id', { search: 'new' })
        resolveFirst({ data: [{ id: 'old-result' }], page: 1 })

        expect(await first).toBe(false)
        expect(pager.results()).toEqual([])

        resolveSecond({ data: [{ id: 'new-result' }], page: 1 })
        expect(await second).toBe(true)
        expect(pager.results()).toEqual([{ id: 'new-result' }])
    })

})
