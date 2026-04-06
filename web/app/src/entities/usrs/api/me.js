import { ApiError, ApiUnauthenticatedError } from '@/shared/errors'
import { reqJSON } from '@shared/api/client'

import { buildUsr } from '../model'

/**
 * Get the current user if logged in. Else, return null.
 *
 * @throws {import('@shared/errors').ApiError} if api returns an error diferent from 401.
 * @returns {Promise<import('../model/Usr').Usr | null> }
 */
export async function apiGetMe() {
    const payload = await reqJSON('/api/v1/usrs/me').catch(err => {
        if (err instanceof ApiUnauthenticatedError) {
            return null
        }

        throw err
    })

    if (!payload) {
        return null
    }

    const [ok, result] = buildUsr(payload)
    if (!ok) {
        throw new ApiError('Invalid api response provided.', result)
    }

    return result
}
