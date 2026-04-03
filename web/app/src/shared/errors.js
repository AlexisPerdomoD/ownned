// ─────────────────────────────────────────────────────────────────────────────
// API ERRORS (ApiError)
// ─────────────────────────────────────────────────────────────────────────────
export class ApiError extends Error {
    /** @param {string} message */
    constructor(message) {
        super(message)
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

export class ValidationError extends ClientError {
    /** @param {string} message */
    /** @param {import('zod').ZodError | undefined} issues */
    constructor(message, issues) {
        super(message)
        this.issues = issues
    }
}
