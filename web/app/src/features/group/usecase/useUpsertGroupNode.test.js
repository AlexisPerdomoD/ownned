import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiUpsertGroupNode, toastSuccess } = vi.hoisted(() => ({
    apiUpsertGroupNode: vi.fn(),
    toastSuccess: vi.fn()
}))

vi.mock('@/entities/groups/api', async importOriginal => {
    const actual = await importOriginal()
    return { ...actual, apiUpsertGroupNode }
})
vi.mock('@/shared/ui', () => ({ toast: { success: toastSuccess } }))

import { ApiForbiddenError } from '@/shared/errors'

import { useUpsertGroupNode } from './useUpsertGroupNode'

const groupId = '550e8400-e29b-41d4-a716-446655440000'
const nodeId = '550e8400-e29b-41d4-a716-446655440001'

describe('useUpsertGroupNode', () => {
    beforeEach(() => {
        apiUpsertGroupNode.mockReset()
        toastSuccess.mockReset()
    })

    it('translates a 403 into a clear node-sharing message', async () => {
        apiUpsertGroupNode.mockRejectedValueOnce(
            new ApiForbiddenError('forbidden', {
                reason: 'User does not have access to this node.'
            })
        )
        const { assign } = useUpsertGroupNode()

        const [success, result] = await assign(groupId, nodeId)

        expect(success).toBe(false)
        expect(result.general).toBe('You cannot share this node.')
    })
})
