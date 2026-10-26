import { createSignal } from 'solid-js'

import {
    apiCreateFolder,
    apiGetNode,
    buildCreateFolderDTO
} from '@/entities/nodes/api'
import { ApiConflictError, getErrorMessage } from '@/shared/errors'

import { useCreateDoc } from './useCreateDoc'
import { planFolderUpload } from './planFolderUpload'
import { runWithConcurrency } from './runWithConcurrency'
import { uniqueFileName } from './naming'

export const FOLDER_UPLOAD_CONCURRENCY = 20

/**
 * Client-orchestrated recursive directory upload.
 *
 * @param {() => string} getParentId
 * @param {() => import('@/entities/nodes').Node[]} [getExistingChildren]
 * @param {() => void} [onSettled]
 */
export function useUploadFolder(
    getParentId,
    getExistingChildren = () => [],
    onSettled
) {
    const [items, setItems] = createSignal([])
    const [uploading, setUploading] = createSignal(false)
    const [cancelled, setCancelled] = createSignal(false)
    const [error, setError] = createSignal(null)
    const { upload: uploadDoc } = useCreateDoc(getParentId)

    let activeController = null
    let folderIdByPath = new Map()
    let takenNamesByParent = new Map()

    const updateItem = (itemId, updates) => {
        setItems(previous =>
            previous.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
            )
        )
    }

    const progress = () => {
        const currentItems = items()
        const completed = currentItems.filter(
            item => item.status === 'completed'
        ).length
        const failed = currentItems.filter(item => item.status === 'failed')
        const cancelledItems = currentItems.filter(
            item => item.status === 'cancelled'
        )
        const active = currentItems.filter(item => item.status === 'uploading')

        return {
            total: currentItems.length,
            completed,
            failed,
            cancelled: cancelledItems,
            active,
            current: completed + failed.length + cancelledItems.length
        }
    }

    const failedItems = () =>
        items().filter(item => item.status === 'failed')
    const retryItems = () =>
        items().filter(
            item =>
                item.status === 'failed' ||
                item.status === 'cancelled' ||
                (cancelled() && item.status === 'queued')
        )

    const execute = async (tasks, controller) => {
        const { signal } = controller
        activeController = controller
        setCancelled(false)
        setUploading(true)
        setError(null)

        try {
            const folderTasks = tasks
                .filter(item => item.type === 'folder')
                .sort(
                    (a, b) =>
                        a.depth - b.depth || a.relativePath.localeCompare(b.relativePath)
                )
            const depths = [...new Set(folderTasks.map(item => item.depth))]

            for (const depth of depths) {
                if (signal.aborted) break
                const level = folderTasks.filter(item => item.depth === depth)
                await runWithConcurrency(
                    level,
                    FOLDER_UPLOAD_CONCURRENCY,
                    async item => {
                        if (signal.aborted) {
                            updateItem(item.id, { status: 'cancelled' })
                            return
                        }
                        const parentId = folderIdByPath.get(item.parentPath)
                        if (!parentId) {
                            updateItem(item.id, {
                                status: 'failed',
                                error: 'Parent folder could not be created.'
                            })
                            return
                        }

                        updateItem(item.id, { status: 'uploading', error: null })
                        try {
                            const [valid, dto] = buildCreateFolderDTO(
                                parentId,
                                item.name,
                                ''
                            )
                            if (!valid) {
                                throw new Error(getErrorMessage(dto, 'Invalid folder name.'))
                            }

                            let folder
                            try {
                                folder = await apiCreateFolder(dto, { signal })
                            } catch (cause) {
                                if (!(cause instanceof ApiConflictError)) throw cause
                                const parent = await apiGetNode(parentId, { signal })
                                folder = parent.children?.find(
                                    child =>
                                        child.type === 'folder' &&
                                        child.name === item.name
                                )
                                if (!folder) throw cause
                                folder = await apiGetNode(folder.id, { signal })
                            }

                            if (signal.aborted) {
                                updateItem(item.id, { status: 'cancelled' })
                                return
                            }
                            folderIdByPath.set(item.relativePath, folder.id)
                            takenNamesByParent.set(
                                folder.id,
                                new Set((folder.children ?? []).map(child => child.name))
                            )
                            updateItem(item.id, { status: 'completed', error: null })
                        } catch (cause) {
                            updateItem(item.id, {
                                status: signal.aborted ? 'cancelled' : 'failed',
                                error: signal.aborted
                                    ? null
                                    : getErrorMessage(cause, 'Could not create folder.')
                            })
                        }
                    },
                    signal
                )
            }

            if (!signal.aborted) {
                const fileTasks = tasks.filter(item => item.type === 'file')
                await runWithConcurrency(
                    fileTasks,
                    FOLDER_UPLOAD_CONCURRENCY,
                    async item => {
                        if (signal.aborted) {
                            updateItem(item.id, { status: 'cancelled' })
                            return
                        }
                        const parentId = folderIdByPath.get(item.parentPath)
                        if (!parentId) {
                            updateItem(item.id, {
                                status: 'failed',
                                error: 'Parent folder could not be created.'
                            })
                            return
                        }

                        const taken =
                            takenNamesByParent.get(parentId) ?? new Set()
                        takenNamesByParent.set(parentId, taken)
                        const takenBeforeReservation = [...taken]
                        const reservedName = uniqueFileName(
                            item.file.name,
                            takenBeforeReservation
                        )
                        taken.add(reservedName)
                        updateItem(item.id, {
                            status: 'uploading',
                            uploadName: reservedName,
                            error: null
                        })

                        const [success, result] = await uploadDoc(
                            item.file,
                            '',
                            parentId,
                            takenBeforeReservation,
                            signal
                        )
                        taken.delete(reservedName)
                        if (success) {
                            const actualName = result?.name ?? reservedName
                            taken.add(actualName)
                            updateItem(item.id, {
                                status: 'completed',
                                uploadName: actualName,
                                error: null
                            })
                        } else {
                            updateItem(item.id, {
                                status: signal.aborted ? 'cancelled' : 'failed',
                                error: signal.aborted
                                    ? null
                                    : getErrorMessage(result, 'Upload failed.')
                            })
                        }
                    },
                    signal
                )
            }

            if (signal.aborted) setCancelled(true)
        } catch (cause) {
            setError(getErrorMessage(cause, 'Folder upload failed.'))
        } finally {
            setUploading(false)
            activeController = null
            onSettled?.()
        }
    }

    const start = async (files, existingChildren = getExistingChildren()) => {
        if (uploading()) return false
        const parentId = getParentId()
        if (!parentId) {
            setError('No destination folder selected.')
            return false
        }

        const plan = planFolderUpload(files)
        if (plan.total === 0) {
            setItems([])
            setError('The selected directory contains no uploadable files.')
            return false
        }

        folderIdByPath = new Map([['', parentId]])
        takenNamesByParent = new Map([
            [parentId, new Set(existingChildren.map(child => child.name))]
        ])
        const tasks = [
            ...plan.folders.map(folder => ({ ...folder, type: 'folder', status: 'queued' })),
            ...plan.files.map(file => ({ ...file, type: 'file', status: 'queued' }))
        ]
        setItems(tasks)

        await execute(tasks, new AbortController())
        return true
    }

    const retryFailed = async () => {
        if (uploading()) return false
        const retryable = retryItems()
        if (retryable.length === 0) return false
        for (const item of retryable) {
            updateItem(item.id, { status: 'queued', error: null })
        }
        const tasks = retryable.map(item => ({
            ...item,
            status: 'queued',
            error: null
        }))
        await execute(tasks, new AbortController())
        return true
    }

    const cancel = () => {
        if (uploading()) {
            setCancelled(true)
            activeController?.abort()
        }
    }

    const clear = () => {
        if (uploading()) return
        setItems([])
        setCancelled(false)
        setError(null)
        folderIdByPath = new Map()
        takenNamesByParent = new Map()
    }

    return {
        items,
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
