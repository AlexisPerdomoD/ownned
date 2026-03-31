import { ApiError } from '../errors'

/**
 * @param {string} path http to request
 * @param {RequestInit} opts
 * @returns {any} api response
 */
export async function reqJSON(path, opts = {}) {
    const { headers, ...init } = opts
    const r = await fetch(path, {
        ...init,
        credentials: 'same-origin',
        headers: {
            'Content-type': 'application/json',
            ...headers
        }
    })

    if (!r.ok) {
        const msg = await r
            .json()
            .then(res => res.message)
            .catch(() => 'Can not process server response.')
        throw new ApiError(msg)
    }

    return await r.json()
}
