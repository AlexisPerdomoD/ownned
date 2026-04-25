import z from 'zod'

import { reqJSON } from '@/shared/api/client'

export class CreateCommentDTO {
    static #schema = z.strictObject({
        node_id: z.uuid('Node ID must be a valid UUID.'),
        content: z
            .string('Content must be a string.')
            .min(1, 'Content is required.')
            .max(10000, 'Content must be at most 10000 characters.')
    })

    static get schema() {
        return structuredClone(CreateCommentDTO.#schema)
    }

    constructor({ node_id, content }) {
        this.node_id = node_id
        this.content = content
    }

    toJSON() {
        return { node_id: this.node_id, content: this.content }
    }

    static build(node_id, content) {
        const r = CreateCommentDTO.#schema.safeParse({ node_id, content })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        return [true, new CreateCommentDTO(r.data)]
    }
}

export const buildCreateCommentDTO = CreateCommentDTO.build

/**
 * Get comments for a node.
 * @param {string} nodeId
 * @returns {Promise<import('@/entities/nodes').NodeComment[]>}
 */
export async function apiGetComments(nodeId) {
    const params = new URLSearchParams()
    params.set('node_id', nodeId)
    return await reqJSON(`/api/v1/comments?${params}`)
}

/**
 * Create a comment.
 * @param {CreateCommentDTO} dto
 * @returns {Promise<import('@/entities/nodes').NodeComment>}
 */
export async function apiCreateComment(dto) {
    return await reqJSON('/api/v1/comments', {
        method: 'POST',
        body: JSON.stringify(dto)
    })
}

/**
 * Delete a comment.
 * @param {string} commentId
 * @returns {Promise<{message: string}>}
 */
export async function apiDeleteComment(commentId) {
    return await reqJSON(`/api/v1/comments/${commentId}`, {
        method: 'DELETE'
    })
}

