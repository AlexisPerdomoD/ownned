import z from 'zod'

import { reqJSON } from '@/shared/api/client'

export class CreateUsrDTO {
    static #schema = z.strictObject({
        role: z.enum(
            ['super_usr_role', 'normal_usr_role', 'limited_usr_role'],
            {
                error: 'Invalid role.'
            }
        ),
        firstname: z
            .string('Firstname must be a string.')
            .min(2, 'Firstname must be at least 2 characters.')
            .max(50, 'Firstname must be at most 50 characters.'),
        lastname: z
            .string('Lastname must be a string.')
            .min(2, 'Lastname must be at least 2 characters.')
            .max(50, 'Lastname must be at most 50 characters.'),
        username: z.email('Invalid email format.'),
        password: z
            .string('Password must be a string.')
            .min(8, 'Password must be at least 8 characters.')
            .max(255, 'Password must be at most 255 characters.'),
        access: z
            .array(
                z.strictObject({
                    group_id: z
                        .string('Group ID must be a string.')
                        .uuid('Invalid group ID format.'),
                    access: z.enum(
                        ['read_only_access', 'write_access', 'owner_access'],
                        {
                            error: 'Invalid access value.'
                        }
                    )
                })
            )
            .optional()
    })

    static get schema() {
        return structuredClone(CreateUsrDTO.#schema)
    }

    /** @param {z.infer<typeof CreateUsrDTO.schema>} dto */
    constructor({
        role,
        firstname,
        lastname,
        username,
        password,
        access = []
    }) {
        this.role = role
        this.firstname = firstname
        this.lastname = lastname
        this.username = username
        this.password = password
        this.access = access
    }

    toJSON() {
        return {
            role: this.role,
            firstname: this.firstname,
            lastname: this.lastname,
            username: this.username,
            password: this.password,
            access: this.access
        }
    }

    /**
     * @param {string} username
     * @param {string} password
     * @param {string} firstname
     * @param {string} lastname
     * @param {'super_usr_role' | 'normal_usr_role' | 'limited_usr_role'} role
     * @param {Array<{group_id: string, access: string}>} [access=[]]
     * @returns {[true, CreateUsrDTO] | [false, Record<string, string>]} result
     */
    static build(username, password, firstname, lastname, role, access = []) {
        const r = CreateUsrDTO.#schema.safeParse({
            username,
            password,
            firstname,
            lastname,
            role,
            access
        })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        return [true, new CreateUsrDTO(r.data)]
    }
}

export const buildCreateUsrDTO = CreateUsrDTO.build

/**
 * @param {number} page
 * @param {number} limit
 * @param {string} [search]
 * @param {'super_usr_role' | 'normal_usr_role' | 'limited_usr_role'} [role]
 * @returns {Promise<{data: import('@/entities/usrs').Usr[], total: number, page: number, limit: number}>}
 */
export async function apiPaginateUsrs(page = 1, limit = 20, search = '', role) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (search) params.set('search', search)
    if (role) params.set('role', role)

    return await reqJSON(`/api/v1/usrs/paginate?${params}`)
}

/**
 * @param {string} usrId
 * @returns {Promise<import('@/entities/usrs').Usr>}
 */
export async function apiGetUsr(usrId) {
    return await reqJSON(`/api/v1/usrs/${usrId}`)
}

/**
 * @param {CreateUsrDTO} dto
 * @returns {Promise<import('@/entities/usrs').Usr>}
 */
export async function apiCreateUsr(dto) {
    return await reqJSON('/api/v1/usrs', {
        method: 'POST',
        body: JSON.stringify(dto)
    })
}

/**
 * @param {string} usrId
 * @returns {Promise<{message: string}>}
 */
export async function apiDeleteUsr(usrId) {
    return await reqJSON(`/api/v1/usrs/${usrId}`, {
        method: 'DELETE'
    })
}

