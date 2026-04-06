import { reqJSON } from '@/shared/api/client'
import { ApiError } from '@shared/errors'

import { buildUsr } from '../model'

/**
 * Login a user after properly validating of the expected arguments.
 *
 * @param {LoginPwdDTO} dto
 * @throws {import('@shared/errors').ValidationError} If the arguments (username, password) are invalid.
 * @throws {import('@shared/errors').ApiError} if api returns an error.
 *
 */
export async function apiLogin(dto) {
    const payload = await reqJSON('/api/v1/usrs/login', {
        method: 'POST',
        body: JSON.stringify(dto)
    })

    const [ok, usr] = buildUsr(payload)
    if (!ok) {
        throw new ApiError('invalid api response of expected payload', usr)
    }

    return usr
}
