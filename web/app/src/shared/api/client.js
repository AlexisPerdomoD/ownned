import {
    ApiAbortedError,
    ApiBadRequestError,
    ApiConflictError,
    ApiForbiddenError,
    ApiInternalServerError,
    ApiNotFoundError,
    ApiNotImplementedError,
    ApiRateLimitError,
    ApiUnauthenticatedError,
    ApiUnknownError
} from '../errors'

/**
 * @param {string} path http to request
 * @param {RequestInit} opts
 * @returns {Promise<any>} api response
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
            .then(res => res?.detail?.reason || res.message)
            .catch(() => 'Can not process server response.')

        switch (r.status) {
            case 400:
                throw new ApiBadRequestError(msg)
            case 401:
                throw new ApiUnauthenticatedError(msg)
            case 403:
                throw new ApiForbiddenError(msg)
            case 404:
                throw new ApiNotFoundError(msg)
            case 409:
                throw new ApiConflictError(msg)
            case 429:
                throw new ApiRateLimitError(msg)
            case 499:
                throw new ApiAbortedError(msg)
            case 500:
                throw new ApiInternalServerError(msg)
            case 501:
                throw new ApiNotImplementedError(msg)

            default:
                throw new ApiUnknownError(msg)
        }
    }

    return await r.json()
}
