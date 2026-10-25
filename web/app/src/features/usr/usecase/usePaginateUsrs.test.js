import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiPaginateUsrs, apiCreateUsr, buildCreateUsrDTO, toastSuccess } =
    vi.hoisted(() => ({
        apiPaginateUsrs: vi.fn(),
        apiCreateUsr: vi.fn(),
        buildCreateUsrDTO: vi.fn(),
        toastSuccess: vi.fn()
    }))

vi.mock('@/entities/usrs/api', () => ({
    apiPaginateUsrs,
    apiCreateUsr,
    buildCreateUsrDTO
}))
vi.mock('@/shared/ui', () => ({ toast: { success: toastSuccess } }))

import { usePaginateUsrs } from './index'

describe('usePaginateUsrs role filter', () => {
    beforeEach(() => apiPaginateUsrs.mockReset())

    it('passes the selected role to the paginated users API', async () => {
        apiPaginateUsrs.mockResolvedValue({
            data: [],
            page: 1,
            total_count: 0
        })
        const pager = usePaginateUsrs({ pageSize: 20 })
        pager.setRole('limited_usr_role')

        await pager.goTo(1)

        expect(apiPaginateUsrs).toHaveBeenCalledWith(
            1,
            20,
            '',
            'limited_usr_role'
        )
    })
})
