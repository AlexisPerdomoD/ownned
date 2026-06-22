/**
 * Logout the current user by clearing the session cookie.
 * @returns {Promise<{message: string}>}
 */
export async function apiLogout() {
    const res = await fetch('/api/v1/usrs/logout', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
    })

    if (!res.ok) {
        const msg = await res.json().then(r => r?.detail?.reason || r.message).catch(() => 'Logout failed')
        throw new Error(msg)
    }

    return await res.json()
}
