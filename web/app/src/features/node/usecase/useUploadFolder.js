import { createSignal } from 'solid-js'

import { apiCreateDoc, buildCreateDocDTO } from '@/entities/docs/api'
import { apiCreateFolder, buildCreateFolderDTO } from '@/entities/nodes/api'
import { APP_MODE } from '@/shared/config/env'
import { ClientError, getErrorMessage } from '@/shared/errors'

import { uniqueFileName } from './naming'
import { runWithConcurrency } from './runWithConcurrency'

export const FOLDER_UPLOAD_CONCURRENCY = 20

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
 */
export function useUploadFolder(
    getParentId,
    getExistingChildren = () => [],
    onSettled
) {
    /** @type {import('solid-js').Signal<PrepatedPlan>} */
    const [plan, setPlan] = createSignal({ folders: [], files: [] })
    /** @type {import('solid-js').Signal<string | null>} */
    const [error, setError] = createSignal(null)
    const [uploading, setUploading] = createSignal(false)
    const [cancelled, setCancelled] = createSignal(false)

    /** @type {AbortController | null} */
    let activeController = null

    /** @type {Map<string, string>} */
    let folderIdByPath = new Map()

    /** @type {Map<string, Set<string>>} */
    let takenNamesByParent = new Map()

    const isRetryiable = item =>
        item.status === 'failed' ||
        item.status === 'cancelled' ||
        item.status === 'queued'

    /** @param {'folder' | 'file'} type
     *
     * @param {string} itemId
     * @param {Record<string, any>} updates
     */
    const updateItem = (type, itemId, updates) => {
        setPlan(prev => {
            const clonedPlan = { ...prev }
            switch (type) {
                case 'folder':
                    clonedPlan.folders = prev.folders.map(folder => {
                        if (folder.id === itemId) {
                            return { ...folder, ...updates }
                        }

                        return folder
                    })
                    break

                case 'file':
                    clonedPlan.files = prev.files.map(file => {
                        if (file.id === itemId) {
                            return { ...file, ...updates }
                        }

                        return file
                    })
                    break

                default:
                    throw new Error('Invalid type')
            }

            return clonedPlan
        })
    }

    const progress = () => {
        let total = 0
        let completed = 0
        let failed = 0
        let cancelled = 0
        let active = 0

        for (const folder of plan().folders) {
            total += 1
            if (folder.status === 'completed') completed += 1
            if (folder.status === 'failed') failed += 1
            if (folder.status === 'cancelled') cancelled += 1
            if (folder.status === 'uploading') active += 1
        }

        for (const file of plan().files) {
            total += 1
            if (file.status === 'completed') completed += 1
            if (file.status === 'failed') failed += 1
            if (file.status === 'cancelled') cancelled += 1
            if (file.status === 'uploading') active += 1
        }

        return {
            total,
            completed,
            failed,
            cancelled,
            active,
            current: completed + failed + cancelled
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

    /**
     *  Executes a plan of uploads. this helper assumes validated plan argument as plan.total > 0 , plan.folders.length > 0 and sorted plan.folders by depth.
     */
    const execute = async () => {
        // NOTE: already sorted ASC since plan.folders is guaranteed to be sorted by depth
        const depths = [...new Set(plan().folders.map(item => item.depth))]
        const { signal } = activeController ?? { signal: null }

        for (const depth of depths) {
            const level = plan().folders.filter(item => item.depth === depth)

            await runWithConcurrency(
                level,
                FOLDER_UPLOAD_CONCURRENCY,
                async item => {
                    if (item.status !== 'queued') return

                    if (signal?.aborted) {
                        updateItem('folder', item.id, {
                            status: 'cancelled'
                        })
                        return
                    }

                    const parentId = folderIdByPath.get(item.parentPath)

                    if (!parentId || typeof parentId !== 'string') {
                        updateItem('folder', item.id, {
                            status: 'failed',
                            error: 'Parent folder could not be created.'
                        })
                        return
                    }

                    updateItem('folder', item.id, {
                        status: 'uploading',
                        error: null
                    })

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

                        updateItem('folder', item.id, {
                            status: 'completed',
                            error: null
                        })
                    } catch (e) {
                        if (e instanceof Error && e.name === 'AbortError') {
                            updateItem('folder', item.id, {
                                status: 'cancelled'
                            })
                            return
                        }

                        updateItem('folder', item.id, {
                            status: 'failed',
                            error: getErrorMessage(
                                e,
                                'Could not create folder.'
                            )
                        })

                        if (APP_MODE === 'local') {
                            globalThis.console.error(e)
                        }
                    }
                },
                // NOTE: signal is not passed to the worker since it is
                // required to update elements status to cancelled so it is
                // required to process the whole plan even with aborted signal.
                null
            )
        }

        if (signal?.aborted) {
            setPlan(prev => ({
                ...prev,
                files: prev.files.map(item => ({
                    ...item,
                    status: 'cancelled'
                }))
            }))

            return
        }

        await runWithConcurrency(
            plan().files,
            FOLDER_UPLOAD_CONCURRENCY,
            async item => {
                if (item.status !== 'queued') return

                if (signal?.aborted) {
                    updateItem('file', item.id, { status: 'cancelled' })
                    return
                }

                const parentId = folderIdByPath.get(item.parentPath)
                if (!parentId || typeof parentId !== 'string') {
                    updateItem('file', item.id, {
                        status: 'failed',
                        error: 'Parent folder could not be created.'
                    })
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
                    uploadName: reservedName,
                    error: null
                })

                const [isValid, dto] = buildCreateDocDTO(parentId, '')
                if (!isValid) {
                    dto['general'] =
                        'Invalid argument of body for document creation.'
                    updateItem('file', item.id, {
                        status: 'failed',
                        error: dto
                    })
                    return
                }

                try {
                    const doc = await apiCreateDoc(item.file, dto, signal)
                    updateItem('file', item.id, {
                        status: 'completed',
                        uploadName: doc.title,
                        error: null
                    })
                } catch (e) {
                    if (hasReservedName) {
                        takenNames.delete(reservedName)
                    }

                    if (e instanceof Error && e.name === 'AbortError') {
                        updateItem('file', item.id, {
                            status: 'cancelled'
                        })
                        return
                    }

                    updateItem('file', item.id, {
                        status: 'failed',
                        error: getErrorMessage(e, 'Could not create document.')
                    })

                    if (APP_MODE === 'local') {
                        globalThis.console.error(e)
                    }
                }
            },
            // NOTE: signal is not passed to the worker since it is
            // required to update elements status to cancelled so it is
            // required to process the whole plan even with aborted signal.
            null
        )
    }

    /** @param {File[]} files , @param {() => import('@/entities/nodes').Node[]} [existingChildren] */
    const start = async (files, existingChildren = getExistingChildren()) => {
        if (uploading()) return false

        const parentId = getParentId()

        if (!parentId) {
            setError('No destination folder selected.')
            return false
        }

        const plan = planFolderUpload(files)
        if (plan.folders.length === 0 && plan.files.length === 0) {
            setError('The selected directory contains no uploadable files.')
            return false
        }

        setCancelled(false)
        setError(null)
        setUploading(true)
        setPlan(plan)

        folderIdByPath = new Map([['', parentId]])
        takenNamesByParent = new Map([
            [parentId, new Set(existingChildren.map(child => child.name))]
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
            })
    }

    const retryFailed = () => {
        if (uploading()) return false

        const retryable = retryItems()
        if (retryable.length === 0) return false

        setPlan(prev => ({
            folders: prev.folders.map(item => {
                if (!isRetryiable(item)) return item
                return { ...item, status: 'queued', error: null }
            }),
            files: prev.files.map(item => {
                if (!isRetryiable(item)) return item
                return { ...item, status: 'queued', error: null }
            })
        }))

        setCancelled(false)
        setError(null)
        setUploading(true)
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
            })
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
    }

    return {
        items: () => [...plan().folders, ...plan().files],
        uploading,
        cancelled,
        error,
        progress,
        failedItems,
        retryItems,
        start,
        retryFailed,
        cancel,
        clear
    }
}
