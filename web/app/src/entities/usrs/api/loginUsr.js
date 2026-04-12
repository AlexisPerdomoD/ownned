import z from 'zod'

import { reqJSON } from '@/shared/api/client'

export class LoginPwdDTO {
    static #schema = z.strictObject({
        username: z.email('Invalid email provided as username.'),
        password: z
            .string('Invalid password provided.')
            .min(1, 'Password cannot be empty.')
    })

    static get schema() {
        return structuredClone(LoginPwdDTO.#schema)
    }

    /**
     * @private
     * @param {z.infer<typeof LoginPwdDTO.schema>} dto
     */
    constructor({ username, password }) {
        this.username = username
        this.password = password
    }

    toJSON() {
        return { username: this.username, password: this.password }
    }

    /**
     * @param {string} username
     *  @param {string} password
     * @returns {[true, LoginPwdDTO] | [false, Record<string, string>]} result
     */
    static build(username, password) {
        const r = LoginPwdDTO.#schema.safeParse({ username, password })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })

            return [false, issues]
        }

        const dto = new LoginPwdDTO(r.data)
        return [true, dto]
    }
}

export const buildLoginPwdDTO = LoginPwdDTO.build

/**
 * Login a user after properly validating of the expected arguments.
 *
 * @param {LoginPwdDTO} dto
 * @returns {Promise<import('@/entities/usrs').Usr>}
 * @throws {import('@shared/errors').ApiError} if api returns an error.
 *
 */
export async function apiLogin(dto) {
    return await reqJSON('/api/v1/usrs/login', {
        method: 'POST',
        body: JSON.stringify(dto)
    })
}
