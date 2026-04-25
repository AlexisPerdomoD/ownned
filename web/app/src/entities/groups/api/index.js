import z from 'zod'

import { reqJSON } from '@/shared/api/client'

export class CreateGroupDTO {
    static #schema = z.strictObject({
        name: z
            .string('Name must be a string.')
            .min(1, 'Name is required.')
            .max(255, 'Name must be at most 255 characters.')
            .regex(/^(?!.*\/).*$/, 'Name cannot contain forward slash.'),
        description: z
            .string('Description must be a string.')
            .max(1000, 'Description must be at most 1000 characters.')
            .optional()
    })

    static get schema() {
        return structuredClone(CreateGroupDTO.#schema)
    }

    /** @param {z.infer<typeof CreateGroupDTO.schema>} dto */
    constructor({ name, description = '' }) {
        this.name = name
        this.description = description
    }

    toJSON() {
        return { name: this.name, description: this.description }
    }

    /**
     * @param {string} name
     * @param {string} [description]
     * @returns {[true, CreateGroupDTO] | [false, Record<string, string>]} result
     */
    static build(name, description = '') {
        const r = CreateGroupDTO.#schema.safeParse({ name, description })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        const dto = new CreateGroupDTO(r.data)
        return [true, dto]
    }
}

export const buildCreateGroupDTO = CreateGroupDTO.build

export class UpdateGroupDTO {
    static #schema = z.strictObject({
        name: z
            .string('Name must be a string.')
            .min(1, 'Name cannot be empty.')
            .max(255, 'Name must be at most 255 characters.')
            .regex(/^(?!.*\/).*$/, 'Name cannot contain forward slash.')
            .optional(),
        description: z
            .string('Description must be a string.')
            .max(1000, 'Description must be at most 1000 characters.')
            .optional()
    })

    static get schema() {
        return structuredClone(UpdateGroupDTO.#schema)
    }

    /** @param {z.infer<typeof UpdateGroupDTO.schema>} dto */
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
     * @returns {[true, UpdateGroupDTO] | [false, Record<string, string>]} result
     */
    static build(name, description) {
        const data = {}
        if (name !== undefined) data.name = name
        if (description !== undefined) data.description = description

        if (Object.keys(data).length === 0) {
            return [false, { general: 'At least one field must be provided.' }]
        }

        const r = UpdateGroupDTO.#schema.safeParse(data)
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        const dto = new UpdateGroupDTO(r.data)
        return [true, dto]
    }
}

export const buildUpdateGroupDTO = UpdateGroupDTO.build

export class UpsertGroupUsrDTO {
    static #schema = z.strictObject({
        usr_id: z
            .string('User ID must be a string.')
            .uuid('Invalid user ID format.'),
        access: z.enum(['read_only_access', 'write_access', 'owner_access'], {
            error: 'Invalid access value.'
        })
    })

    static get schema() {
        return structuredClone(UpsertGroupUsrDTO.#schema)
    }

    /** @param {z.infer<typeof UpsertGroupUsrDTO.schema>} dto */
    constructor({ usr_id, access }) {
        this.usr_id = usr_id
        this.access = access
    }

    toJSON() {
        return { usr_id: this.usr_id, access: this.access }
    }

    /**
     * @param {string} usr_id
     * @param {'read_only_access' | 'write_access' | 'owner_access'} access
     * @returns {[true, UpsertGroupUsrDTO] | [false, Record<string, string>]} result
     */
    static build(usr_id, access) {
        const r = UpsertGroupUsrDTO.#schema.safeParse({ usr_id, access })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        const dto = new UpsertGroupUsrDTO(r.data)
        return [true, dto]
    }
}

export const buildUpsertGroupUsrDTO = UpsertGroupUsrDTO.build

export class UpsertGroupNodeDTO {
    static #schema = z.strictObject({
        node_id: z
            .string('Node ID must be a string.')
            .uuid('Invalid node ID format.')
    })

    static get schema() {
        return structuredClone(UpsertGroupNodeDTO.#schema)
    }

    /** @param {z.infer<typeof UpsertGroupNodeDTO.schema>} dto */
    constructor({ node_id }) {
        this.node_id = node_id
    }

    toJSON() {
        return { node_id: this.node_id }
    }

    /**
     * @param {string} node_id
     * @returns {[true, UpsertGroupNodeDTO] | [false, Record<string, string>]} result
     */
    static build(node_id) {
        const r = UpsertGroupNodeDTO.#schema.safeParse({ node_id })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        const dto = new UpsertGroupNodeDTO(r.data)
        return [true, dto]
    }
}

export const buildUpsertGroupNodeDTO = UpsertGroupNodeDTO.build

/**
 * Paginate groups with optional search.
 *
 * @param {number} page - Page number (base 1).
 * @param {number} limit - Items per page.
 * @param {string} [search] - Optional search term.
 * @returns {Promise<{data: import('@/entities/groups').Group[], total: number, page: number, limit: number}>}
 */
export async function apiPaginateGroups(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (search) {
        params.set('search', search)
    }

    return await reqJSON(`/api/v1/groups/paginate?${params}`)
}

/**
 * Create a new group.
 *
 * @param {CreateGroupDTO} dto
 * @returns {Promise<import('@/entities/groups').Group>}
 */
export async function apiCreateGroup(dto) {
    return await reqJSON('/api/v1/groups', {
        method: 'POST',
        body: JSON.stringify(dto)
    })
}

/**
 * Get a group by its ID with populated users and nodes.
 *
 * @param {string} groupId
 * @returns {Promise<import('@/entities/groups').PopulatedGroup>}
 */
export async function apiGetGroup(groupId) {
    return await reqJSON(`/api/v1/groups/${groupId}`)
}

/**
 * Update a group.
 *
 * @param {string} groupId
 * @param {UpdateGroupDTO} dto
 * @returns {Promise<import('@/entities/groups').Group>}
 */
export async function apiUpdateGroup(groupId, dto) {
    return await reqJSON(`/api/v1/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify(dto)
    })
}

/**
 * Delete a group.
 *
 * @param {string} groupId
 * @returns {Promise<{message: string}>}
 */
export async function apiDeleteGroup(groupId) {
    return await reqJSON(`/api/v1/groups/${groupId}`, {
        method: 'DELETE'
    })
}

/**
 * Assign a user to a group.
 *
 * @param {string} groupId
 * @param {UpsertGroupUsrDTO} dto
 * @returns {Promise<{message: string}>}
 */
export async function apiUpsertGroupUsr(groupId, dto) {
    return await reqJSON(`/api/v1/groups/${groupId}/users`, {
        method: 'POST',
        body: JSON.stringify(dto)
    })
}

/**
 * Remove a user from a group.
 *
 * @param {string} groupId
 * @param {string} usrId
 * @returns {Promise<{message: string}>}
 */
export async function apiDeleteGroupUsr(groupId, usrId) {
    return await reqJSON(`/api/v1/groups/${groupId}/users/${usrId}`, {
        method: 'DELETE'
    })
}

/**
 * Assign a node to a group.
 *
 * @param {string} groupId
 * @param {UpsertGroupNodeDTO} dto
 * @returns {Promise<{message: string}>}
 */
export async function apiUpsertGroupNode(groupId, dto) {
    return await reqJSON(`/api/v1/groups/${groupId}/nodes`, {
        method: 'POST',
        body: JSON.stringify(dto)
    })
}

/**
 * Remove a node from a group.
 *
 * @param {string} groupId
 * @param {string} nodeId
 * @returns {Promise<{message: string}>}
 */
export async function apiDeleteGroupNode(groupId, nodeId) {
    return await reqJSON(`/api/v1/groups/${groupId}/nodes/${nodeId}`, {
        method: 'DELETE'
    })
}

