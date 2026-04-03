import z from 'zod'

import { reqJSON } from '@shared/api/client'
import { ValidationError } from '@shared/errors'

import { buildUsr } from '../model'

/**
 * @typedef {Object} LoginPwdArgs
 * @property {string} username
 * @property {string} password
 */

class LoginPwdDTO {
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

/**
 * Login a user after properly validating of the expected arguments.
 *
 * @param {LoginPwdArgs} args
 * @throws {import('@shared/errors').ValidationError} If the arguments (username, password) are invalid.
 * @throws {import('@shared/errors').ApiError} if api returns an error.
 *
 */
export async function login(args) {
    const dto = LoginPwdDTO.build(args)
    const payload = await reqJSON('/api/v1/usrs/login', {
        method: 'POST',
        body: JSON.stringify(dto)
    })

    return buildUsr(payload)
}
