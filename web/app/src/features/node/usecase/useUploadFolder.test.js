import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { planFolderUpload, useUploadFolder } from './useUploadFolder'

const {
    apiCreateDoc,
    apiCreateFolder,
    buildCreateDocDTO,
    buildCreateFolderDTO
} = vi.hoisted(() => ({
    apiCreateDoc: vi.fn(),
    apiCreateFolder: vi.fn(),
    buildCreateDocDTO: vi.fn((parent_id, description = '') => [
        true,
        { parent_id, description }
    ]),
    buildCreateFolderDTO: vi.fn((parent_id, name, description = '') => [
        true,
        { parent_id, name, description }
    ])
}))

vi.mock('@/entities/nodes/api', () => ({
    apiCreateFolder,
    buildCreateFolderDTO
}))
vi.mock('@/entities/docs/api', () => ({
    apiCreateDoc,
    buildCreateDocDTO
}))

const rootId = '550e8400-e29b-41d4-a716-446655440000'
const topFolderId = '550e8400-e29b-41d4-a716-446655440001'
const nestedFolderId = '550e8400-e29b-41d4-a716-446655440002'

const abortError = () => new DOMException('Aborted', 'AbortError')

describe('useUploadFolder', () => {
    beforeEach(() => {
        apiCreateDoc.mockReset()
        apiCreateFolder.mockReset()
        apiCreateFolder.mockImplementation(async (_dto, { signal } = {}) => {
            if (signal?.aborted) throw abortError()
            const id = _dto.name === 'Root' ? topFolderId : nestedFolderId
            return { id, name: _dto.name, children: [] }
        })
        apiCreateDoc.mockImplementation(async (file, _dto, signal) => {
            if (signal?.aborted) throw abortError()
            return { title: file.name }
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('recreates nested folders before uploading their files', async () => {
        const settled = vi.fn()
        const uploader = useUploadFolder(
            () => rootId,
            () => [],
            settled
        )
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

        await expect(uploader.start(files)).resolves.toBe(true)

        expect(apiCreateFolder).toHaveBeenCalledTimes(2)
        expect(apiCreateFolder.mock.calls[0][0]).toMatchObject({
            parent_id: rootId,
            name: 'Root'
        })
        expect(apiCreateFolder.mock.calls[1][0]).toMatchObject({
            parent_id: topFolderId,
            name: 'Nested'
        })
        expect(apiCreateDoc).toHaveBeenCalledTimes(2)
        expect(apiCreateDoc.mock.calls.map(([, dto]) => dto.parent_id)).toEqual(
            [topFolderId, nestedFolderId]
        )
        expect(uploader.progress()).toMatchObject({ total: 4, completed: 4 })
        expect(uploader.failedItems()).toHaveLength(0)
        expect(uploader.error()).toBe(null)
        expect(uploader.uploading()).toBe(false)
        expect(settled).toHaveBeenCalledTimes(1)
    })

    it('continues after a file fails and retries only the failed item', async () => {
        const consoleError = vi
            .spyOn(globalThis.console, 'error')
            .mockImplementation(() => {})

        apiCreateDoc
            .mockRejectedValueOnce(new Error('Temporary upload failure.'))
            .mockResolvedValueOnce({ title: 'one.txt' })
        const uploader = useUploadFolder(
            () => rootId,
            () => []
        )
        const file = new File(['one'], 'one.txt', { type: 'text/plain' })
        file.webkitRelativePath = 'Root/one.txt'

        await expect(uploader.start([file])).resolves.toBe(true)
        expect(consoleError).toHaveBeenCalledTimes(1)
        expect(consoleError).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Temporary upload failure.' })
        )
        expect(uploader.failedItems()).toHaveLength(1)
        expect(uploader.failedItems()[0].relativePath).toBe('Root/one.txt')
        expect(apiCreateFolder).toHaveBeenCalledTimes(1)
        expect(uploader.progress()).toMatchObject({
            total: 2,
            completed: 1,
            failed: 1
        })

        await expect(uploader.retryFailed()).resolves.toBe(true)

        expect(apiCreateFolder).toHaveBeenCalledTimes(1)
        expect(apiCreateDoc).toHaveBeenCalledTimes(2)
        expect(apiCreateDoc.mock.calls[1][0].name).toBe('one.txt')
        expect(uploader.failedItems()).toHaveLength(0)
        expect(uploader.progress()).toMatchObject({ total: 2, completed: 2 })
    })

    it('aborts active requests and leaves remaining work retryable', async () => {
        let markUploadStarted
        const uploadStarted = new Promise(resolve => {
            markUploadStarted = resolve
        })
        apiCreateDoc.mockImplementationOnce(
            (_file, _dto, signal) =>
                new Promise((_resolve, reject) => {
                    markUploadStarted()
                    signal.addEventListener(
                        'abort',
                        () => reject(abortError()),
                        { once: true }
                    )
                })
        )
        const uploader = useUploadFolder(
            () => rootId,
            () => []
        )
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
        expect(uploader.progress()).toMatchObject({
            total: 2,
            completed: 1,
            cancelled: 1
        })
    })

    // NOTE: al cancelar, todo el plan pendiente debe terminar en 'cancelled'
    // para que solo sobreviva el trabajo completado; ningún ítem puede quedarse
    // en 'queued' tras el settle.
    it('marks pending folders and files as cancelled when cancelled during folder creation', async () => {
        let markFolderStarted
        const folderStarted = new Promise(resolve => {
            markFolderStarted = resolve
        })
        apiCreateFolder.mockImplementationOnce(
            (_dto, { signal } = {}) =>
                new Promise((_resolve, reject) => {
                    markFolderStarted()
                    signal.addEventListener(
                        'abort',
                        () => reject(abortError()),
                        { once: true }
                    )
                })
        )
        const uploader = useUploadFolder(
            () => rootId,
            () => []
        )
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

        const started = uploader.start(files)
        await folderStarted
        uploader.cancel()
        await started

        expect(uploader.cancelled()).toBe(true)
        expect(uploader.uploading()).toBe(false)
        const statusesByPath = Object.fromEntries(
            uploader.items().map(item => [item.relativePath, item.status])
        )
        expect(statusesByPath['Root']).toBe('cancelled')
        expect(statusesByPath['Root/Nested']).toBe('cancelled')
        expect(statusesByPath['Root/one.txt']).toBe('cancelled')
        expect(statusesByPath['Root/Nested/two.txt']).toBe('cancelled')
        expect(uploader.progress()).toMatchObject({ total: 4, cancelled: 4 })
        expect(
            uploader
                .retryItems()
                .map(item => item.relativePath)
                .sort()
        ).toEqual([
            'Root',
            'Root/Nested',
            'Root/Nested/two.txt',
            'Root/one.txt'
        ])
    })
})

const file = (name, webkitRelativePath) => ({ name, webkitRelativePath })

describe('planFolderUpload', () => {
    const planTotal = plan => plan.folders.length + plan.files.length

    it('deduplicates paths and orders directories parent-first', () => {
        const plan = planFolderUpload([
            file('one.txt', 'Root/a/b/one.txt'),
            file('two.txt', 'Root/a/two.txt'),
            file('one.txt', 'Root/a/b/one.txt')
        ])

        expect(plan.folders.map(folder => folder.path)).toEqual([
            'Root',
            'Root/a',
            'Root/a/b'
        ])
        expect(plan.files.map(item => item.path)).toEqual([
            'Root/a/b/one.txt',
            'Root/a/two.txt'
        ])
        expect(planTotal(plan)).toBe(5)
        expect(
            [...plan.folders, ...plan.files].every(
                item => item.status === 'queued'
            )
        ).toBe(true)
    })

    it('does not impose frontend depth or element-count limits', () => {
        const deepPath = `${Array.from({ length: 25 }, (_, i) => `d${i}`).join('/')}/file.txt`
        const files = Array.from({ length: 125 }, (_, i) =>
            file(`f${i}.txt`, `Root/f${i}.txt`)
        )
        files.push(file('file.txt', deepPath))

        const plan = planFolderUpload(files)

        expect(plan.files).toHaveLength(126)
        expect(plan.folders).toHaveLength(26)
        expect(planTotal(plan)).toBe(152)
    })

    it('normalizes slash separators and accepts files at the destination root', () => {
        const plan = planFolderUpload([
            file('loose.txt', 'loose.txt'),
            file('deep.txt', 'Top\\Nested\\deep.txt')
        ])

        expect(plan.folders.map(folder => folder.path)).toEqual([
            'Top',
            'Top/Nested'
        ])
        expect(plan.files[0].parentPath).toBe('')
        expect(plan.files[1].parentPath).toBe('Top/Nested')
    })
})
