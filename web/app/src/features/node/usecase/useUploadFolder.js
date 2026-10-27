// TODO: Check this code since algorithm is not optimal and block the UI on cancelled uploads
//
import { createSignal } from 'solid-js'

import { apiCreateDoc, buildCreateDocDTO } from '@/entities/docs/api'
import { apiCreateFolder, buildCreateFolderDTO } from '@/entities/nodes/api'
import { APP_MODE } from '@/shared/config/env'
import { ClientError, getErrorMessage } from '@/shared/errors'

import { uniqueFileName } from './naming'
import { runWithConcurrency } from './runWithConcurrency'

export const FOLDER_UPLOAD_CONCURRENCY = 20

export const TOAST_CODE_FOLDER_UPLOAD = 'TOAST_CODE_FOLDER_UPLOAD'

/**
 * @typedef {{
 * folders: Array<{
 * id: string,
 * type: 'folder',
 * path: string,
 * parentPath: string,
 * name: string,
 * depth: number,
 * status:string }>,
 * files: Array<{
 * id: string,
 * type: 'file',
 * path: string,
 * parentPath: string,
 * file: File,
 * status:string}> }} PrepatedPlan
 */

/**
 * @todo improve algoritm here avoid sort if posible
 * Builds a deduplicated, parent-first directory plan from a directory input.
 * The client intentionally does not cap depth, element count, or total bytes.
 * @param {File[]} files
 * @returns {PrepatedPlan}
 */
export function planFolderUpload(files) {
    /** @type {Map<string, PrepatedPlan['folders'][number]>} */
    const folders = new Map()
    /** @type {Map<string, PrepatedPlan['files'][number]>} */
    const plannedFiles = new Map()

    for (const file of files) {
        const relativePath = String(file.webkitRelativePath || file.name || '')
            .replaceAll('\\', '/')
            .split('/')
            .filter(Boolean)
            .join('/')

        if (!relativePath) continue
        const parts = relativePath.split('/')
        const directoryParts = parts.slice(0, -1)

        for (let index = 0; index < directoryParts.length; index += 1) {
            const path = directoryParts.slice(0, index + 1).join('/')
            const parentPath = directoryParts.slice(0, index).join('/')
            if (!folders.has(path)) {
                folders.set(path, {
                    id: `folder:${path}`,
                    path,
                    type: 'folder',
                    relativePath: path,
                    parentPath,
                    name: directoryParts[index],
                    depth: index + 1,
                    status: 'queued'
                })
            }
        }

        if (!plannedFiles.has(relativePath)) {
            plannedFiles.set(relativePath, {
                id: `file:${relativePath}`,
                path: relativePath,
                type: 'file',
                relativePath,
                parentPath: directoryParts.join('/'),
                file,
                status: 'queued'
            })
        }
    }

    return {
        folders: [...folders.values()].sort(
            (a, b) => a.depth - b.depth || a.path.localeCompare(b.path)
        ),
        files: [...plannedFiles.values()]
    }
}

/**
 * Client-orchestrated recursive directory upload.
 *
 * @param {() => string} getParentId
 * @param {() => import('@/entities/nodes').Node[] | null} [getExistingChildren]
 * @param {() => void} [onSettled]
 * @param {number} [concurencyLimit]
 */
export function useUploadFolder(
    getParentId,
    getExistingChildren = () => [],
    onSettled
) {
    /** @type {ReturnType<typeof createSignal<PrepatedPlan>>} */
    const [plan, setPlan] = createSignal({ folders: [], files: [] })
    const [totalCount, setTotalCount] = createSignal(0)
    const [completedCount, setCompletedCount] = createSignal(0)
    const [failedCount, setFailedCount] = createSignal(0)
    const [cancelledCount, setCancelledCount] = createSignal(0)
    const [activeCount, setActiveCount] = createSignal(0)
    const [miliseconds, setMiliseconds] = createSignal(0)

    /** @type {ReturnType<typeof createSignal<string | null>>} */
    const [error, setError] = createSignal(null)

    const [uploading, setUploading] = createSignal(false)
    const [cancelled, setCancelled] = createSignal(false)

    /** @type {AbortController | null} */
    let activeController = null

    /** @type {Map<string, string>} */
    let folderIdByPath = new Map()

    /** @type {Map<string, Set<string>>} */
    let takenNamesByParent = new Map()

    /** @type {Map<string, Record<string, any>>} */
    let updatesMap = new Map()

    const flushUpdates = () => {
        if (updatesMap.size === 0) return

        setPlan(prev => {
            const clonedPlan = { ...prev }
            clonedPlan.folders = prev.folders.map(folder => {
                const updates = updatesMap.get(`folder:${folder.id}`)
                if (!updates) return folder

                return { ...folder, ...updates }
            })

            clonedPlan.files = prev.files.map(file => {
                const updates = updatesMap.get(`file:${file.id}`)
                if (!updates) return file
                return { ...file, ...updates }
            })

            return clonedPlan
        })

        updatesMap = new Map()
    }
    /** @param {'folder' | 'file'} type
     *
     * @param {string} itemId
     * @param {Record<string, any>} updates
     */
    const updateItem = (type, itemId, updates) => {
        const key = `${type}:${itemId}`
        updatesMap.set(key, updates)
    }

    const cancel = () => {
        if (!uploading()) return

        setCancelled(true)
        activeController?.abort()
    }

    const clear = () => {
        if (uploading()) return
        setPlan({ folders: [], files: [] })
        setCancelled(false)
        setError(null)
        folderIdByPath = new Map()
        takenNamesByParent = new Map()
        activeController = null
        setTotalCount(0)
        setCompletedCount(0)
        setFailedCount(0)
        setCancelledCount(0)
        setActiveCount(0)
        setMiliseconds(0)
    }

    const isRetryiable = item =>
        item.status === 'failed' ||
        item.status === 'cancelled' ||
        item.status === 'queued'

    const progress = () => {
        const current = completedCount() + failedCount() + cancelledCount()
        const total = totalCount()
        const queued = total - current
        const retryable = failedCount() + cancelledCount() + queued
        return {
            total,
            completed: completedCount(),
            failed: failedCount(),
            cancelled: cancelledCount(),
            active: activeCount(),
            current,
            queued,
            retryable
        }
    }

    const failedItems = () => {
        const failed = []
        for (const folder of plan().folders) {
            if (folder.status === 'failed') failed.push(folder)
        }

        for (const file of plan().files) {
            if (file.status === 'failed') failed.push(file)
        }

        return failed
    }

    const retryItems = () => {
        const retryable = []
        for (const folder of plan().folders) {
            if (isRetryiable(folder)) retryable.push(folder)
        }

        for (const file of plan().files) {
            if (isRetryiable(file)) retryable.push(file)
        }

        return retryable
    }

    const someItemsRetryable = () => {
        for (const file of plan().files) {
            if (isRetryiable(file)) return true
        }

        return false
    }

    /**
     *  Executes a plan of uploads. this helper assumes validated plan argument as plan.total > 0 , plan.folders.length > 0 and sorted plan.folders by depth.
     */
    const execute = async () => {
        // NOTE: already sorted ASC since plan.folders is guaranteed to be sorted by depth
        const { signal } = activeController ?? { signal: null }

        /** @type {Map<number, Array<import('@/entities/nodes').Node>>} */
        const depthMap = new Map()
        for (const folder of plan().folders) {
            if (!depthMap.has(folder.depth)) {
                depthMap.set(folder.depth, [])
            }

            depthMap.get(folder.depth).push(folder)
        }

        for (const [_, level] of [...depthMap.entries()].sort(
            (a, b) => a[0] - b[0]
        )) {
            await runWithConcurrency(
                level,
                FOLDER_UPLOAD_CONCURRENCY,
                async item => {
                    if (item.status !== 'queued') return

                    if (signal?.aborted) {
                        // updateItem('folder', item.id, { status: 'cancelled' })
                        setCancelledCount(prev => prev + 1)
                        return
                    }

                    const parentId = folderIdByPath.get(item.parentPath)

                    if (!parentId || typeof parentId !== 'string') {
                        updateItem('folder', item.id, {
                            status: 'failed',
                            error: 'Parent folder could not be created.'
                        })
                        setFailedCount(prev => prev + 1)

                        return
                    }

                    updateItem('folder', item.id, { status: 'uploading' })
                    setActiveCount(prev => prev + 1)

                    try {
                        const [valid, dto] = buildCreateFolderDTO(
                            parentId,
                            item.name,
                            ''
                        )

                        if (!valid) {
                            throw new ClientError(
                                getErrorMessage(dto, 'Invalid folder name.')
                            )
                        }

                        const folder = await apiCreateFolder(dto, {
                            signal
                        })

                        folderIdByPath.set(item.relativePath, folder.id)

                        let takenNames = takenNamesByParent.get(parentId)
                        if (!takenNames) {
                            takenNames = new Set()
                            takenNamesByParent.set(parentId, takenNames)
                        }
                        takenNames.add(item.name)
                        updateItem('folder', item.id, { status: 'completed' })
                        setCompletedCount(prev => prev + 1)
                    } catch (e) {
                        if (e instanceof Error && e.name === 'AbortError') {
                            updateItem('folder', item.id, {
                                status: 'cancelled'
                            })
                            setCancelledCount(prev => prev + 1)
                            return
                        }

                        updateItem('folder', item.id, {
                            status: 'failed',
                            error: getErrorMessage(
                                e,
                                'Could not create folder.'
                            )
                        })
                        setFailedCount(prev => prev + 1)
                        throw e
                    } finally {
                        setActiveCount(prev => prev - 1)
                    }
                },
                // NOTE: signal is not passed to the worker since it is
                // required to update elements status to cancelled so it is
                // required to process the whole plan even with aborted signal.
                null
            )
        }

        flushUpdates()

        if (signal?.aborted) {
            // let cancelledCount = 0
            // setPlan(prev => ({
            //     ...prev,
            //     files: prev.files.map(item => {
            //         if (item.status === 'queued') {
            //             cancelledCount += 1
            //             return { ...item, status: 'cancelled' }
            //         }
            //
            //         return item
            //     })
            // }))

            setCancelledCount(prev => prev + plan().files.length)

            return
        }

        await runWithConcurrency(
            plan().files,
            FOLDER_UPLOAD_CONCURRENCY,
            async item => {
                if (item.status !== 'queued') return

                if (signal?.aborted) {
                    // updateItem('file', item.id, { status: 'cancelled' })
                    setCancelledCount(prev => prev + 1)
                    return
                }

                const parentId = folderIdByPath.get(item.parentPath)
                if (!parentId || typeof parentId !== 'string') {
                    updateItem('file', item.id, {
                        status: 'failed',
                        error: 'Parent folder could not be created.'
                    })
                    setFailedCount(prev => prev + 1)
                    return
                }

                let takenNames = takenNamesByParent.get(parentId)
                if (!takenNames) {
                    takenNames = new Set()
                    takenNamesByParent.set(parentId, takenNames)
                }

                const reservedName = uniqueFileName(item.file.name, takenNames)
                let hasReservedName = false
                if (reservedName !== item.file.name) {
                    hasReservedName = true
                    item.file = new File([item.file], reservedName, {
                        type: item.file.type
                    })

                    takenNames.add(reservedName)
                }
                updateItem('file', item.id, {
                    status: 'uploading',
                    uploadName: reservedName
                })
                setActiveCount(prev => prev + 1)

                try {
                    const [isValid, dto] = buildCreateDocDTO(parentId, '')
                    if (!isValid) {
                        updateItem('file', item.id, {
                            status: 'failed',
                            error:
                                dto.general ||
                                'Invalid argument of body for document creation.'
                        })

                        return
                    }

                    const doc = await apiCreateDoc(item.file, dto, signal)
                    updateItem('file', item.id, {
                        status: 'completed',
                        uploadName: doc.title
                    })
                    setCompletedCount(prev => prev + 1)
                } catch (e) {
                    if (hasReservedName) {
                        takenNames.delete(reservedName)
                    }

                    if (e instanceof Error && e.name === 'AbortError') {
                        updateItem('file', item.id, { status: 'cancelled' })
                        setCancelledCount(prev => prev + 1)
                        return
                    }

                    updateItem('file', item.id, {
                        status: 'failed',
                        error: getErrorMessage(e, 'Could not create document.')
                    })
                    setFailedCount(prev => prev + 1)

                    if (APP_MODE === 'local') {
                        globalThis.console.error(e)
                    }
                } finally {
                    setActiveCount(prev => prev - 1)
                }
            },
            // NOTE: signal is not passed to the worker since it is
            // required to update elements status to cancelled so it is
            // required to process the whole plan even with aborted signal.
            null
        )

        flushUpdates()
    }

    /** @param {File[]} files , @param {() => import('@/entities/nodes').Node[]} [existingChildren] */
    const start = async files => {
        if (uploading()) return false

        const parentId = getParentId()

        if (!parentId) {
            setError('No destination folder selected.')
            return false
        }

        const plan = planFolderUpload(files)
        const currentCount = plan.folders.length + plan.files.length
        if (currentCount === 0) {
            setError('The selected directory contains no uploadable files.')
            return false
        }

        const start = performance.now()
        setUploading(true)
        setCancelled(false)
        setError(null)
        setPlan(plan)
        setTotalCount(currentCount)
        setCompletedCount(0)
        setFailedCount(0)
        setCancelledCount(0)
        setActiveCount(0)
        setMiliseconds(0)

        folderIdByPath = new Map([['', parentId]])
        takenNamesByParent = new Map([
            [
                parentId,
                new Set(getExistingChildren()?.map(child => child.name) ?? [])
            ]
        ])
        activeController = new AbortController()

        return execute()
            .then(() => true)
            .catch(cause => {
                if (APP_MODE === 'local') {
                    globalThis.console.error(cause)
                }

                setError(getErrorMessage(cause, 'Folder upload failed.'))
                return false
            })
            .finally(() => {
                setUploading(false)
                activeController = null
                onSettled?.()
                setMiliseconds(performance.now() - start)
            })
    }

    const retryFailed = () => {
        if (uploading()) return false

        if (!someItemsRetryable()) return false

        const start = performance.now()
        setUploading(true)
        setCancelled(false)
        setError(null)
        // setTotalCount(plan().folders.length + plan().files.length)
        // setCompletedCount(0)
        // setFailedCount(0)
        // setCancelledCount(0)
        setMiliseconds(0)

        let cancelledCount = 0
        setPlan(prev => ({
            ...prev,
            files: prev.files.map(item => {
                if (isRetryiable(item)) {
                    cancelledCount += 1
                }

                if (item.status === 'cancelled' || item.status === 'failed') {
                    return { ...item, status: 'queued', error: null }
                }

                return item
            })
        }))
        setCancelledCount(prev => prev - cancelledCount)
        setActiveCount(0)

        activeController = new AbortController()
        return execute()
            .then(() => true)
            .catch(cause => {
                if (APP_MODE === 'local') {
                    globalThis.console.error(cause)
                }

                setError(getErrorMessage(cause, 'Folder upload failed.'))
                return false
            })
            .finally(() => {
                setUploading(false)
                activeController = null
                onSettled?.()
                setMiliseconds(performance.now() - start)
            })
    }

    return {
        items: () => [...plan().folders, ...plan().files],
        totalCount,
        uploading,
        cancelled,
        error,
        progress,
        failedItems,
        retryItems,
        start,
        retryFailed,
        cancel,
        clear,
        miliseconds
    }
}
