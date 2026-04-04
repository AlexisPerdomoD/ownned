import { ApiError } from '@/shared/errors'
import { reqJSON } from '@shared/api/client'

import { buildUsr } from '../model'

export async function getMe() {
    const payload = await reqJSON('/api/v1/usrs/me')
    const [ok, result] = buildUsr(payload)
    if (!ok) {
        throw new ApiError('invalid api response provided', result)
    }

    return result
}
