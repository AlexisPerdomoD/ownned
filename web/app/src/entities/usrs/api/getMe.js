import { ApiUnauthenticatedError } from '@/shared/errors'
import { reqJSON } from '@shared/api/client'

/**
 * Get the current user if logged in. Else, return null.
 *
 * @throws {import('@shared/errors').ApiError} if api returns an error diferent from 401.
 * @returns {Promise<import('@/entities').Usr | null }
 */
export async function apiGetMe() {
    return await reqJSON('/api/v1/usrs/me').catch(err => {
        if (err instanceof ApiUnauthenticatedError) {
            return null
        }

        throw err
    })
}
