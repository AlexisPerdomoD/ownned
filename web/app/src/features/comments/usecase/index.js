import { createEffect, createSignal } from 'solid-js'

import { apiGetComments, apiCreateComment, apiDeleteComment } from '@/entities/comments/api'

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

    return { comments, loading, refresh: () => apiGetComments(getNodeId()).then(setComments) }
}

export function useCreateComment() {
    const [loading, setLoading] = createSignal(false)

    const create = async (nodeId, content) => {
        const { buildCreateCommentDTO } = await import('@/entities/comments/api')
        const [valid, dto] = buildCreateCommentDTO(nodeId, content)
        if (!valid) return [false, dto]

        setLoading(true)
        try {
            const comment = await apiCreateComment(dto)
            return [true, comment]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { create, loading }
}

export function useDeleteComment() {
    const [loading, setLoading] = createSignal(false)

    const remove = async commentId => {
        setLoading(true)
        try {
            await apiDeleteComment(commentId)
            return [true, null]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}