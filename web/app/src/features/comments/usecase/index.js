import { createEffect, createSignal } from 'solid-js'

import {
    apiCreateComment,
    apiDeleteComment,
    apiGetComments,
    apiUpdateComment
} from '@/entities/comments/api'

export function useGetComments(/** @type {() => string} */ getNodeId) {
    const [comments, setComments] = createSignal([])
    const [loading, setLoading] = createSignal(false)

    createEffect(() => {
        const nodeId = getNodeId()
        if (!nodeId) return

        setLoading(true)
        apiGetComments(nodeId)
            .then(setComments)
            .finally(() => setLoading(false))
    })

    return {
        comments,
        loading,
        refresh: () => apiGetComments(getNodeId()).then(setComments)
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
        const { buildCreateCommentDTO } =
            await import('@/entities/comments/api')
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
        const { buildUpdateCommentDTO } =
            await import('@/entities/comments/api')
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
