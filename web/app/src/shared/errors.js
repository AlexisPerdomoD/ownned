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

export class ApiRateLimitError extends ApiError {}

export class ApiAbortedError extends ApiError {}

export class ApiNotImplementedError extends ApiError {}

export class ApiBadRequestError extends ApiError {}

export class ApiUnknownError extends ApiError {}

// ─────────────────────────────────────────────────────────────────────────────
// FRONTEND ERRORS (ClientError)
// ─────────────────────────────────────────────────────────────────────────────
export class ClientError extends Error {}
