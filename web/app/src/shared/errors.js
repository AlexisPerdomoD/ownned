// ─────────────────────────────────────────────────────────────────────────────
// API ERRORS (ApiError)
// ─────────────────────────────────────────────────────────────────────────────
export class ApiError extends Error {
    /** @param {string} message
     *  @param {Record<string, string> | null} detail
     * */
    constructor(message, detail = null) {
        super(message)
        this.detail = detail
    }
}

export class ApiInternalServerError extends ApiError {}

export class ApiUnauthenticatedError extends ApiError {}

export class ApiForbiddenError extends ApiError {}

export class ApiNotFoundError extends ApiError {}

export class ApiConflictError extends ApiError {}

export class ApiPayloadTooLargeError extends ApiError {}

export class ApiUnsupportedMediaTypeError extends ApiError {}

export class ApiValidationError extends ApiError {}

export class ApiRateLimitError extends ApiError {}

export class ApiAbortedError extends ApiError {}

export class ApiNotImplementedError extends ApiError {}

export class ApiBadRequestError extends ApiError {}

export class ApiUnknownError extends ApiError {}

/**
 * Returns a user-facing message from API errors, use-case results, or DTO
 * validation issue maps.
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function getErrorMessage(error, fallback = 'Request failed.') {
    if (typeof error === 'string' && error.trim()) return error
    if (!error || typeof error !== 'object') return fallback

    const candidate =
        error.detail?.reason ||
        error.reason ||
        error.message ||
        error.general
    if (typeof candidate === 'string' && candidate.trim()) return candidate

    const issues = Object.values(error).filter(
        value => typeof value === 'string' && value.trim()
    )
    return issues.length ? issues.join(' · ') : fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// FRONTEND ERRORS (ClientError)
// ─────────────────────────────────────────────────────────────────────────────
export class ClientError extends Error {}
