import { reqJSON } from '../../shared/api/client'
import { buildUsr } from '../model'

export async function getMe() {
    const usr = await reqJSON('/api/v1/usrs/me')
    return buildUsr(usr)
}
