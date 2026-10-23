import z from 'zod'

import { reqJSON } from '@/shared/api/client'

export class CreateCommentDTO {
    static #schema = z.strictObject({
        node_id: z.uuid('Node ID must be a valid UUID.'),
        content: z
            .string('Content must be a string.')
            .min(1, 'Content is required.')
            .max(255, 'Content must be at most 255 characters.')
    })

    static get schema() {
        return structuredClone(CreateCommentDTO.#schema)
    }

    constructor({ node_id, content }) {
        this.node_id = node_id
        this.content = content
    }

    toJSON() {
        // Backend contract: node id travels in the route, only content in body.
        return { content: this.content }
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

export class UpdateCommentDTO {
    static #schema = z.strictObject({
        content: z
            .string('Content must be a string.')
            .min(1, 'Content is required.')
            .max(255, 'Content must be at most 255 characters.')
    })

    static get schema() {
        return structuredClone(UpdateCommentDTO.#schema)
    }

    constructor({ content }) {
        this.content = content
    }

    toJSON() {
        return { content: this.content }
    }

    static build(content) {
        const r = UpdateCommentDTO.#schema.safeParse({ content })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        return [true, new UpdateCommentDTO(r.data)]
    }
}

export const buildUpdateCommentDTO = UpdateCommentDTO.build

/**
 * Get comments for a node.
 * @param {string} nodeId
 * @returns {Promise<import('@/entities/nodes').NodeComment[]>}
 */
export async function apiGetComments(nodeId) {
    return await reqJSON(`/api/v1/nodes/${nodeId}/comments`)
}

/**
 * Create a comment on a node.
 * @param {string} nodeId
 * @param {CreateCommentDTO} dto
 * @returns {Promise<import('@/entities/nodes').NodeComment>}
 */
export async function apiCreateComment(nodeId, dto) {
    return await reqJSON(`/api/v1/nodes/${nodeId}/comments`, {
        method: 'POST',
        body: JSON.stringify(dto)
    })
}

/**
 * Update a comment (only the backend-verified owner is allowed).
 * @param {string} commentId
 * @param {UpdateCommentDTO} dto
 * @returns {Promise<import('@/entities/nodes').NodeComment>}
 */
export async function apiUpdateComment(commentId, dto) {
    return await reqJSON(`/api/v1/nodes/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto)
    })
}

/**
 * Delete a comment (author or super, per backend use case).
 * @param {string} commentId
 * @returns {Promise<{message: string}>}
 */
export async function apiDeleteComment(commentId) {
    return await reqJSON(`/api/v1/nodes/comments/${commentId}`, {
        method: 'DELETE'
    })
}
