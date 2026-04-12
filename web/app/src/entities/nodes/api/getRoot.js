import { reqJSON } from '@/shared/api/client'

/**
 * Get the root nodes of the current user.
 *
 * @returns {Promise<import('@/entities/nodes').Node[]>}
 */
export async function apiGetRoot() {
    return await reqJSON('/api/v1/nodes')
}
