import { beforeEach, describe, expect, it, vi } from 'vitest'

const { reqForm, toastWarning } = vi.hoisted(() => ({
    reqForm: vi.fn(),
    toastWarning: vi.fn()
}))

vi.mock('@/shared/api/client', () => ({ reqForm }))
vi.mock('@/shared/ui', () => ({ toast: { warning: toastWarning } }))

import { ApiConflictError } from '@/shared/errors'

import { useCreateDoc } from './useCreateDoc'

const parentId = '550e8400-e29b-41d4-a716-446655440000'

describe('useCreateDoc filename collision handling', () => {
    beforeEach(() => {
        reqForm.mockReset()
        toastWarning.mockReset()
    })

    it('deduces the first available name before sending one request', async () => {
        reqForm.mockResolvedValue({ name: 'a (2).txt' })
        const { upload } = useCreateDoc(() => parentId)
        const file = new File(['content'], 'a.txt', { type: 'text/plain' })

        const [success] = await upload(file, '', undefined, [
            'a.txt',
            'a (1).txt'
        ])

        expect(success).toBe(true)
        expect(reqForm).toHaveBeenCalledTimes(1)
        expect(reqForm.mock.calls[0][1].get('file').name).toBe('a (2).txt')
        expect(toastWarning).toHaveBeenCalledWith(
            'Name already existed; saved as "a (2).txt"'
        )
    })

    it('uses a local next suffix only if a concurrent upload still conflicts', async () => {
        reqForm
            .mockRejectedValueOnce(
                new ApiConflictError('conflict', {
                    reason: 'Name already exists.'
                })
            )
            .mockResolvedValueOnce({ name: 'a (3).txt' })
        const { upload } = useCreateDoc(() => parentId)
        const file = new File(['content'], 'a.txt', { type: 'text/plain' })

        const [success] = await upload(file, '', undefined, [
            'a.txt',
            'a (1).txt'
        ])

        expect(success).toBe(true)
        expect(reqForm).toHaveBeenCalledTimes(2)
        expect(reqForm.mock.calls[0][1].get('file').name).toBe('a (2).txt')
        expect(reqForm.mock.calls[1][1].get('file').name).toBe('a (3).txt')
    })
})
