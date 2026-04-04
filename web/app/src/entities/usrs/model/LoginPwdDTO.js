import z from 'zod'

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
     * @returns {[true, LoginPwdDTO] | [false, Record<string, string>]} result
     */
    static build(args) {
        const result = LoginPwdDTO.#schema.safeParse(args)
        if (!result.success) {
            const issues = {}
            result.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })

            return [false, issues]
        }

        const { username, password } = result.data

        const dto = new LoginPwdDTO(username, password)
        return [true, dto]
    }
}

export const buildLoginPwdDTO = LoginPwdDTO.build
