import { createEffect, createSignal } from 'solid-js'

import {
    apiCreateComment,
    apiDeleteComment,
    apiGetComments,
    apiUpdateComment,
    buildCreateCommentDTO,
    buildUpdateCommentDTO
} from '@/entities/comments/api'
import { getErrorMessage } from '@/shared/errors'

export function useGetComments(/** @type {() => string} */ getNodeId) {
    const [comments, setComments] = createSignal([])
    const [loading, setLoading] = createSignal(false)
    const [error, setError] = createSignal(null)
    let latestRequest = 0

    const load = async nodeId => {
        const requestId = ++latestRequest
        if (!nodeId) {
            setComments([])
            setError(null)
            setLoading(false)
            return false
        }

        setLoading(true)
        setError(null)
        try {
            const result = await apiGetComments(nodeId)
            if (requestId !== latestRequest) return false
            setComments(result ?? [])
            return true
        } catch (cause) {
            if (requestId !== latestRequest) return false
            setComments([])
            setError(getErrorMessage(cause, 'Could not load comments.'))
            return false
        } finally {
            if (requestId === latestRequest) setLoading(false)
        }
    }

    createEffect(() => {
        const nodeId = getNodeId()
        void load(nodeId)
    })

    return {
        comments,
        loading,
        error,
        refresh: () => load(getNodeId())
    }
}

export function useCreateComment() {
    const [loading, setLoading] = createSignal(false)

    /**
     * @param {string} nodeId
     * @param {string} content
     * @returns {Promise<[true, import('@/entities/nodes').NodeComment] | [false, { message: string, reason?: string }]>}
     */
    const create = async (nodeId, content) => {
        const [valid, dto] = buildCreateCommentDTO(nodeId, content)
        if (!valid) return [false, dto]

        setLoading(true)
        try {
            const comment = await apiCreateComment(nodeId, dto)
            return [true, comment]
        } catch (e) {
            return [
                false,
                {
                    general: e?.message || 'Request failed.',
                    reason: e?.detail?.reason
                }
            ]
        } finally {
            setLoading(false)
        }
    }

    return { create, loading }
}

export function useUpdateComment() {
    const [loading, setLoading] = createSignal(false)

    const update = async (
        /** @type {string} */ commentId,
        /** @type {string} */ content
    ) => {
        const [valid, dto] = buildUpdateCommentDTO(content)
        if (!valid) return [false, dto]

        setLoading(true)
        try {
            const comment = await apiUpdateComment(commentId, dto)
            return [true, comment]
        } catch (e) {
            return [
                false,
                {
                    general:
                        e?.message || e?.detail?.reason || 'Request failed.'
                }
            ]
        } finally {
            setLoading(false)
        }
    }

    return { update, loading }
}

export function useDeleteComment() {
    const [loading, setLoading] = createSignal(false)

    const remove = async commentId => {
        setLoading(true)
        try {
            await apiDeleteComment(commentId)
            return [true, null]
        } catch (e) {
            return [
                false,
                {
                    general:
                        e?.message || e?.detail?.reason || 'Request failed.'
                }
            ]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}
