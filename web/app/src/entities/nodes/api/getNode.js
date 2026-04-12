import { reqJSON } from '@/shared/api/client'

/**
 * Get a node by its identifier.
 *
 * @param {string} nodeId
 * @returns {Promise<import('@/entities/nodes').Folder | import('@/entities/nodes').File>}
 */
export async function apiGetNode(nodeId) {
    return await reqJSON(`/api/v1/nodes/${nodeId}`)
}
