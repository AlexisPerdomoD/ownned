import { APP_MODE } from '../config/env'
import {
    ApiAbortedError,
    ApiBadRequestError,
    ApiConflictError,
    ApiForbiddenError,
    ApiInternalServerError,
    ApiNotFoundError,
    ApiNotImplementedError,
    ApiPayloadTooLargeError,
    ApiRateLimitError,
    ApiUnauthenticatedError,
    ApiUnknownError,
    ApiUnsupportedMediaTypeError,
    ApiValidationError
} from '../errors'

const LOCAL_API_URL = 'http://localhost:3000'

const credentials = APP_MODE === 'local' ? 'include' : 'same-origin'

function apiURL(path) {
    return new URL(path, APP_MODE === 'local' ? LOCAL_API_URL : undefined)
}

/**
 * Parses a failed API response and throws the matching ApiError.
 * The backend error shape is `{ detail: { reason, ... } | string } | { message }`
 * along with `detail` field issues for 400/422 responses.
 * @param {Response} res
 * @param {string} [fallback] - message to use when the body can not be parsed
 * @returns {Promise<never>}
 */
async function throwForApiError(res, fallback = 'Request failed.') {
    const body = await res.json().catch(() => null)
    const msg = body?.detail?.reason || body?.message || fallback
    /** @type {Record<string, string> | null} */
    const detail =
        typeof body === 'string' || body == null ? null : (body.detail ?? null)

    switch (res.status) {
        case 400:
            throw new ApiBadRequestError(msg, detail)
        case 401:
            throw new ApiUnauthenticatedError(msg, detail)
        case 403:
            throw new ApiForbiddenError(msg, detail)
        case 404:
            throw new ApiNotFoundError(msg, detail)
        case 409:
            throw new ApiConflictError(msg, detail)
        case 413:
            throw new ApiPayloadTooLargeError(msg, detail)
        case 415:
            throw new ApiUnsupportedMediaTypeError(msg, detail)
        case 422:
            throw new ApiValidationError(msg, detail)
        case 429:
            throw new ApiRateLimitError(msg, detail)
        case 499:
            throw new ApiAbortedError(msg, detail)
        case 500:
            throw new ApiInternalServerError(msg, detail)
        case 501:
            throw new ApiNotImplementedError(msg, detail)
        default:
            throw new ApiUnknownError(msg, detail)
    }
}

/**
 * Sends a request without expecting a response body.
 *
 * @param {string} path relative API path (e.g. '/api/v1/usrs/me')
 * @param {RequestInit} opts
 * @returns {Promise<void>} empty response
 */
export async function reqNoContent(path, opts = {}) {
    const { headers, ...init } = opts

    const r = await fetch(apiURL(path), {
        ...init,
        credentials,
        headers: {
            'Content-type': 'application/json',
            ...headers
        }
    })

    if (!r.ok) await throwForApiError(r)
}

/**
 * @param {string} path relative API path (e.g. '/api/v1/usrs/me')
 * @param {RequestInit} opts
 * @returns {Promise<any>} parsed json response
 */
export async function reqJSON(path, opts = {}) {
    const { headers, ...init } = opts

    const r = await fetch(apiURL(path), {
        ...init,
        credentials,
        headers: {
            'Content-type': 'application/json',
            ...headers
        }
    })

    if (!r.ok) await throwForApiError(r)

    return await r.json()
}

/**
 * Sends a multipart form. Do NOT set 'Content-Type' manually: the
 * browser must generate it together with the multipart boundary.
 * @param {string} path relative API path
 * @param {FormData} form
 * @returns {Promise<any>} parsed json response
 */
export async function reqForm(path, form = new FormData()) {
    const r = await fetch(apiURL(path), {
        method: 'POST',
        credentials,
        body: form
    })

    if (!r.ok) await throwForApiError(r)

    return await r.json()
}

/**
 * Fetches a binary file (download) as Blob.
 * @param {string} path relative API path
 * @returns {Promise<Blob>}
 */
export async function reqBlob(path) {
    const r = await fetch(apiURL(path), {
        method: 'GET',
        credentials
    })

    if (!r.ok) await throwForApiError(r)

    return await r.blob()
}
