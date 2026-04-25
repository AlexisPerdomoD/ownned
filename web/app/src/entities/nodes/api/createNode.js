import z from 'zod'

import { reqJSON } from '@/shared/api/client'

export class CreateFolderDTO {
    static #schema = z.strictObject({
        parent_id: z.string('Parent ID must be a string.').uuid('Invalid UUID format.'),
        name: z
            .string('Name must be a string.')
            .min(1, 'Name is required.')
            .max(255, 'Name must be at most 255 characters.')
            .regex(/^(?!.*\/).*$/, 'Name cannot contain forward slash.'),
        description: z
            .string('Description must be a string.')
            .max(255, 'Description must be at most 255 characters.')
            .optional()
    })

    static get schema() {
        return structuredClone(CreateFolderDTO.#schema)
    }

    /** @param {z.infer<typeof CreateFolderDTO.schema>} dto */
    constructor({ parent_id, name, description = '' }) {
        this.parent_id = parent_id
        this.name = name
        this.description = description
    }

    toJSON() {
        return {
            parent_id: this.parent_id,
            name: this.name,
            description: this.description
        }
    }

    /**
     * @param {string} parentId
     * @param {string} name
     * @param {string} [description]
     * @returns {[true, CreateFolderDTO] | [false, Record<string, string>]} result
     */
    static build(parentId, name, description = '') {
        const r = CreateFolderDTO.#schema.safeParse({ parent_id: parentId, name, description })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        return [true, new CreateFolderDTO(r.data)]
    }
}

export const buildCreateFolderDTO = CreateFolderDTO.build

export class UpdateNodeDTO {
    static #schema = z.strictObject({
        name: z
            .string('Name must be a string.')
            .min(1, 'Name cannot be empty.')
            .max(255, 'Name must be at most 255 characters.')
            .regex(/^(?!.*\/).*$/, 'Name cannot contain forward slash.')
            .optional(),
        description: z
            .string('Description must be a string.')
            .max(255, 'Description must be at most 255 characters.')
            .optional()
    })

    static get schema() {
        return structuredClone(UpdateNodeDTO.#schema)
    }

    /** @param {z.infer<typeof UpdateNodeDTO.schema>} dto */
    constructor({ name, description }) {
        if (name !== undefined) this.name = name
        if (description !== undefined) this.description = description
    }

    toJSON() {
        const json = {}
        if (this.name !== undefined) json.name = this.name
        if (this.description !== undefined) json.description = this.description
        return json
    }

    /**
     * @param {string} [name]
     * @param {string} [description]
     * @returns {[true, UpdateNodeDTO] | [false, Record<string, string>]} result
     */
    static build(name, description) {
        const data = {}
        if (name !== undefined) data.name = name
        if (description !== undefined) data.description = description

        if (Object.keys(data).length === 0) {
            return [false, { general: 'At least one field must be provided.' }]
        }

        const r = UpdateNodeDTO.#schema.safeParse(data)
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        return [true, new UpdateNodeDTO(r.data)]
    }
}

export const buildUpdateNodeDTO = UpdateNodeDTO.build

/**
 * Create a new folder.
 *
 * @param {CreateFolderDTO} dto
 * @returns {Promise<import('@/entities/nodes').Folder>}
 */
export async function apiCreateFolder(dto) {
    return await reqJSON('/api/v1/nodes', {
        method: 'POST',
        body: JSON.stringify(dto)
    })
}

/**
 * Get root nodes for the current user.
 *
 * @returns {Promise<import('@/entities/nodes').Folder[]>}
 */
export async function apiGetRootNodes() {
    return await reqJSON('/api/v1/nodes')
}

/**
 * Update a node.
 *
 * @param {string} nodeId
 * @param {UpdateNodeDTO} dto
 * @returns {Promise<import('@/entities/nodes').Folder | import('@/entities/nodes').File>}
 */
export async function apiUpdateNode(nodeId, dto) {
    return await reqJSON(`/api/v1/nodes/${nodeId}`, {
        method: 'PUT',
        body: JSON.stringify(dto)
    })
}

/**
 * Delete a node.
 *
 * @param {string} nodeId
 * @returns {Promise<{message: string}>}
 */
export async function apiDeleteNode(nodeId) {
    return await reqJSON(`/api/v1/nodes/${nodeId}`, {
        method: 'DELETE'
    })
}