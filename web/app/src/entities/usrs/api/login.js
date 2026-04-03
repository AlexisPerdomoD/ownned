import z from 'zod'

import { reqJSON } from '../../../shared/api/client'
import { ValidationError } from '../../../shared/errors'
import { buildUsr } from '../model'

export class LoginPwdDTO {
    static #schema = z.strictObject({
        username: z.email('Invalid email provided as username.'),
        password: z
            .string('Invalid password provided.')
            .min(1, 'Password cannot be empty.')
    })

    /**
     * @private
     * @param {string} username
     * @param {string} password
     */
    constructor(username, password) {
        this.username = username
        this.password = password
    }

    toJSON() {
        return { username: this.username, password: this.password }
    }

    /**
     * @typedef {Object} LoginPwdArgs
     * @property {string} username
     * @property {string} password
     */

    /**
     * @param {LoginPwdArgs} args
     */
    static build(args) {
        const result = LoginPwdDTO.#schema.safeParse(args)
        if (!result.success) {
            throw new ValidationError(
                'Invalid LoginPwdDTO data provided',
                result.error
            )
        }

        const { username, password } = result.data

        return new LoginPwdDTO(username, password)
    }
}

export const buildLoginPwdDTO = LoginPwdDTO.build

/**
 * @param {LoginPwdDTO} dto
 */
export async function login(dto) {
    const payload = await reqJSON('/api/v1/usrs/login', {
        method: 'POST',
        body: JSON.stringify(dto.toJSON())
    })

    return buildUsr(payload)
}
