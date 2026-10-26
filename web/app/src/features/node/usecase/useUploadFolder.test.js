import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiCreateFolder, apiGetNode, buildCreateFolderDTO, reqForm, toastWarning } =
    vi.hoisted(() => ({
        apiCreateFolder: vi.fn(),
        apiGetNode: vi.fn(),
        buildCreateFolderDTO: vi.fn((parent_id, name, description = '') => [
            true,
            { parent_id, name, description }
        ]),
        reqForm: vi.fn(),
        toastWarning: vi.fn()
    }))

vi.mock('@/entities/nodes/api', () => ({
    apiCreateFolder,
    apiGetNode,
    buildCreateFolderDTO
}))
vi.mock('@/entities/docs/api', () => ({
    buildCreateDocDTO: (parent_id, description = '') => [
        true,
        { parent_id, description }
    ]
}))
vi.mock('@/shared/api/client', () => ({ reqForm }))
vi.mock('@/shared/ui', () => ({ toast: { warning: toastWarning } }))

import { useUploadFolder } from './useUploadFolder'

const rootId = '550e8400-e29b-41d4-a716-446655440000'
const topFolderId = '550e8400-e29b-41d4-a716-446655440001'
const nestedFolderId = '550e8400-e29b-41d4-a716-446655440002'

describe('useUploadFolder', () => {
    beforeEach(() => {
        apiCreateFolder.mockReset()
        apiGetNode.mockReset()
        reqForm.mockReset()
        toastWarning.mockReset()
        apiCreateFolder.mockImplementation(async (_dto, { signal } = {}) => {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
            const id = _dto.name === 'Root' ? topFolderId : nestedFolderId
            return { id, name: _dto.name, children: [] }
        })
        reqForm.mockImplementation(async (_path, form, { signal } = {}) => {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
            return { name: form.get('file').name }
        })
    })

    it('recreates nested folders before uploading their files', async () => {
        const settled = vi.fn()
        const uploader = useUploadFolder(() => rootId, () => [], settled)
        const files = [
            new File(['one'], 'one.txt', {
                type: 'text/plain',
                lastModified: 1
            }),
            new File(['two'], 'two.txt', {
                type: 'text/plain',
                lastModified: 2
            })
        ]
        files[0].webkitRelativePath = 'Root/one.txt'
        files[1].webkitRelativePath = 'Root/Nested/two.txt'

        await uploader.start(files)

        expect(apiCreateFolder).toHaveBeenCalledTimes(2)
        expect(apiCreateFolder.mock.calls[0][0]).toMatchObject({
            parent_id: rootId,
            name: 'Root'
        })
        expect(apiCreateFolder.mock.calls[1][0]).toMatchObject({
            parent_id: topFolderId,
            name: 'Nested'
        })
        expect(reqForm).toHaveBeenCalledTimes(2)
        expect(
            reqForm.mock.calls.map(([, form]) => form.get('parent_id'))
        ).toEqual([topFolderId, nestedFolderId])
        expect(uploader.progress()).toMatchObject({ total: 4, completed: 4 })
        expect(uploader.uploading()).toBe(false)
        expect(settled).toHaveBeenCalledTimes(1)
    })

    it('continues after a file fails and retries only the failed item', async () => {
        reqForm
            .mockRejectedValueOnce(new Error('Temporary upload failure.'))
            .mockResolvedValueOnce({ name: 'one.txt' })
        const uploader = useUploadFolder(() => rootId, () => [])
        const file = new File(['one'], 'one.txt', { type: 'text/plain' })
        file.webkitRelativePath = 'Root/one.txt'

        await uploader.start([file])

        expect(uploader.failedItems()).toHaveLength(1)
        expect(uploader.failedItems()[0].relativePath).toBe('Root/one.txt')
        expect(apiCreateFolder).toHaveBeenCalledTimes(1)

        await uploader.retryFailed()

        expect(apiCreateFolder).toHaveBeenCalledTimes(1)
        expect(reqForm).toHaveBeenCalledTimes(2)
        expect(uploader.failedItems()).toHaveLength(0)
        expect(uploader.progress()).toMatchObject({ total: 2, completed: 2 })
    })

    it('aborts active requests and leaves remaining work retryable', async () => {
        let markUploadStarted
        const uploadStarted = new Promise(resolve => {
            markUploadStarted = resolve
        })
        reqForm.mockImplementationOnce(
            (_path, _form, { signal } = {}) =>
                new Promise((_resolve, reject) => {
                    markUploadStarted()
                    signal.addEventListener(
                        'abort',
                        () => reject(new DOMException('Aborted', 'AbortError')),
                        { once: true }
                    )
                })
        )
        const uploader = useUploadFolder(() => rootId, () => [])
        const file = new File(['one'], 'one.txt', { type: 'text/plain' })
        file.webkitRelativePath = 'Root/one.txt'

        const started = uploader.start([file])
        await uploadStarted
        uploader.cancel()
        await started

        expect(uploader.cancelled()).toBe(true)
        expect(uploader.uploading()).toBe(false)
        expect(uploader.retryItems().map(item => item.relativePath)).toContain(
            'Root/one.txt'
        )
    })
})
