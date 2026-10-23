import z from 'zod'

import { reqJSON } from '@/shared/api/client'

export class CreateUsrDTO {
    static #roleSchema = z.enum(['super_usr_role', 'normal_usr_role', 'limited_usr_role'], {
        error: 'Invalid role.'
    })

    static #passwordSchema = z
        .string('Password must be a string.')
        .min(8, 'Password must be at least 8 characters.')
        .max(255, 'Password must be at most 255 characters.')
        // Backend contract (POST /api/v1/usrs): 8–255 chars with at least
        // one letter, one digit and one symbol.
        .regex(/[a-zA-Z]/, 'Password must contain at least one letter.')
        .regex(/[0-9]/, 'Password must contain at least one digit.')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one symbol.')

    static #schema = z.strictObject({
        role: CreateUsrDTO.#roleSchema,
        firstname: z
            .string('Firstname must be a string.')
            .min(2, 'Firstname must be at least 2 characters.')
            .max(50, 'Firstname must be at most 50 characters.'),
        lastname: z
            .string('Lastname must be a string.')
            .min(2, 'Lastname must be at least 2 characters.')
            .max(50, 'Lastname must be at most 50 characters.'),
        username: z.email('Invalid email format.'),
        password: CreateUsrDTO.#passwordSchema
    })

    static get schema() {
        return structuredClone(CreateUsrDTO.#schema)
    }

    /** @param {z.infer<typeof CreateUsrDTO.schema>} dto */
    constructor({ role, firstname, lastname, username, password }) {
        this.role = role
        this.firstname = firstname
        this.lastname = lastname
        this.username = username
        this.password = password
    }

    toJSON() {
        return {
            role: this.role,
            firstname: this.firstname,
            lastname: this.lastname,
            username: this.username,
            password: this.password
        }
    }

    /**
     * @param {string} username
     * @param {string} password
     * @param {string} firstname
     * @param {string} lastname
     * @param {'super_usr_role' | 'normal_usr_role' | 'limited_usr_role'} role
     * @returns {[true, CreateUsrDTO] | [false, Record<string, string>]} result
     */
    static build(username, password, firstname, lastname, role) {
        const r = CreateUsrDTO.#schema.safeParse({
            username,
            password,
            firstname,
            lastname,
            role
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
 * @param {CreateUsrDTO} dto
 * @returns {Promise<import('@/entities/usrs').Usr>}
 */
export async function apiCreateUsr(dto) {
    return await reqJSON('/api/v1/usrs', {
        method: 'POST',
        body: JSON.stringify(dto)
    })
}
