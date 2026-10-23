import { reqJSON } from '@/shared/api/client'

/**
 * @param {number} page
 * @param {number} limit
 * @param {string} [search]
 * @param {'super_usr_role' | 'normal_usr_role' | 'limited_usr_role'} [role]
 * @returns {Promise<{data: import('@/entities/usrs').Usr[], total: number, page: number, limit: number}>}
 */
export async function apiPaginateUsrs(page = 1, limit = 20, search = '', role) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (search) params.set('search', search)
    if (role) params.set('role', role)

    return await reqJSON(`/api/v1/usrs/paginate?${params}`)
}

/**
 * @param {string} usrId
 * @returns {Promise<import('@/entities/usrs').Usr>}
 */
export async function apiGetUsr(usrId) {
    return await reqJSON(`/api/v1/usrs/${usrId}`)
}

