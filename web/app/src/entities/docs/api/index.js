import z from 'zod'

import { reqBlob, reqForm, reqJSON } from '@/shared/api/client'
import { APP_MODE } from '@/shared/config/env'

export class CreateDocDTO {
    static #schema = z.strictObject({
        parent_id: z.uuid('Parent ID must be a string and a valid UUID.'),
        description: z
            .string('Description must be a string.')
            .max(255, 'Description must be at most 255 characters.')
            .optional()
    })

    static get schema() {
        return structuredClone(CreateDocDTO.#schema)
    }

    /** @param {z.infer<typeof CreateDocDTO.schema>} dto */
    constructor({ parent_id, description = '' }) {
        this.parent_id = parent_id
        this.description = description
    }

    /**
     * @param {string} parentId
     * @param {string} description
     * @returns {[true, CreateDocDTO] | [false, Record<string, string>]}
     */
    static build(parentId, description = '') {
        const r = CreateDocDTO.#schema.safeParse({
            parent_id: parentId,
            description
        })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        return [true, new CreateDocDTO(r.data)]
    }
}

export const buildCreateDocDTO = CreateDocDTO.build

/**
 * @param {File} file
 * @param {CreateDocDTO} dto
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('@/entities/nodes').Doc>}
 */
export async function apiCreateDoc(file, dto, signal) {
    const formData = new FormData()
    formData.append('parent_id', dto.parent_id)
    if (dto.description) {
        formData.append('description', dto.description)
    }
    formData.append('size', String(file.size))
    formData.append('file', file)
    const doc = await reqForm('/api/v1/nodes/docs', formData, {
        signal
    })

    return doc
}

/**
 * @param {string} docId
 * @returns {Promise<import('@/entities/nodes').Doc>}
 */
export async function apiDeleteDoc(docId) {
    return await reqJSON(`/api/v1/nodes/docs/${docId}`, { method: 'DELETE' })
}

/**
 * @param {string} docId
 * @param {string} filename
 */
export async function apiDownloadDoc(docId, filename) {
    const blob = await reqBlob(`/api/v1/nodes/docs/${docId}/download`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'document'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export async function apiDownloadFolder(nodeId) {
    await reqBlob(`/api/v1/nodes/${nodeId}/download`)
}

/** URL directa de descarga (para abrir en otra pestaña; la cookie añade auth). */
export function apiDocURL(docId) {
    const base = APP_MODE === 'local' ? 'http://localhost:3000' : undefined
    return new URL(`/api/v1/nodes/docs/${docId}/download`, base).toString()
}
