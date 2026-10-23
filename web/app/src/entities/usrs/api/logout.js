import { reqJSON } from '@/shared/api/client'

/**
 * Logout the current user by clearing the session cookie.
 * @returns {Promise<{message: string}>}
 */
export function apiLogout() {
    return reqJSON('/api/v1/auth/logout', { method: 'DELETE' })
}
