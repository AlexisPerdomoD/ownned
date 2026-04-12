import { Show, createSignal } from 'solid-js'

import {
    ApiBadRequestError,
    ApiConflictError,
    ApiError,
    ApiForbiddenError,
    ApiInternalServerError,
    ApiNotFoundError,
    ApiRateLimitError,
    ApiUnauthenticatedError,
    ClientError
} from '../errors'
import { Button } from './Button'

const DEFAULT_MESSAGES = {
    notFound: 'The requested resource could not be found.',
    unauthenticated: 'Your session has expired. Please sign in again.',
    forbidden: 'You do not have permission to access this resource.',
    rateLimit: 'Too many requests. Please try again later.',
    conflict: 'The request could not be completed due to a conflict.',
    badRequest: 'The request could not be processed.',
    server: 'Something went wrong on our end. Please try again later.',
    unknown: 'An unexpected error occurred. Please try again.'
}

const ERROR_TITLES = {
    notFound: 'Not Found',
    unauthenticated: 'Session Expired',
    forbidden: 'Access Denied',
    rateLimit: 'Rate Limit Exceeded',
    conflict: 'Conflict',
    badRequest: 'Invalid Request',
    server: 'Server Error',
    unknown: 'Something Went Wrong'
}

function getErrorType(error) {
    if (error instanceof ApiNotFoundError) return 'notFound'
    if (error instanceof ApiUnauthenticatedError) return 'unauthenticated'
    if (error instanceof ApiForbiddenError) return 'forbidden'
    if (error instanceof ApiRateLimitError) return 'rateLimit'
    if (error instanceof ApiConflictError) return 'conflict'
    if (error instanceof ApiBadRequestError) return 'badRequest'
    if (error instanceof ApiInternalServerError) return 'server'
    if (error instanceof ApiError) return 'badRequest'
    if (error instanceof ClientError) return null
    return 'unknown'
}

function getMessage(error, type) {
    if (error instanceof ApiError || error instanceof ClientError) {
        return error.message
    }
    return DEFAULT_MESSAGES[type] || DEFAULT_MESSAGES.unknown
}

function getTitle(type) {
    return ERROR_TITLES[type] || ERROR_TITLES.unknown
}

/**
 * Generic error view that maps errors to user-friendly displays.
 *
 * @param {Object} props
 * @param {Error} props.error - The error to display
 * @param {Function} [props.onRetry] - Optional retry callback
 * @param {Function} [props.onBack] - Optional back navigation callback
 * @returns {import('solid-js').JSX.Element}
 */
export function ErrView({ error, onRetry, onBack }) {
    const [showDetails, setShowDetails] = createSignal(false)

    const type = getErrorType(error)
    const title = getTitle(type)
    const message = getMessage(error, type)
    const isClientError = error instanceof ClientError

    return (
        <section class="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
            <div class="max-w-md w-full text-center space-y-6">
                <div class="space-y-2">
                    <h1 class="font-serif text-4xl text-ink">{title}</h1>
                </div>

                <p class="text-base text-muted leading-relaxed">{message}</p>

                <Show when={isClientError && error.issues}>
                    <div class="text-left bg-bg-2 rounded-sm p-4">
                        <p class="text-sm font-medium text-ink mb-2">
                            Validation Issues:
                        </p>
                        <ul class="text-sm text-muted space-y-1">
                            {error.issues.map(issue => (
                                <li class="flex gap-2">
                                    <span class="text-danger">•</span>
                                    <span>{issue.message}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Show>

                <Show when={showDetails() && error?.stack}>
                    <div class="text-left">
                        <button
                            type="button"
                            onClick={() => setShowDetails(false)}
                            class="text-xs text-muted hover:text-ink underline"
                        >
                            Hide technical details
                        </button>
                        <pre class="mt-2 p-3 bg-bg-2 rounded-sm text-xs text-muted overflow-x-auto whitespace-pre-wrap break-all font-mono">
                            {error.stack}
                        </pre>
                    </div>
                </Show>

                <Show when={!showDetails() && error?.stack}>
                    <button
                        type="button"
                        onClick={() => setShowDetails(true)}
                        class="text-xs text-muted hover:text-ink underline"
                    >
                        Show technical details
                    </button>
                </Show>

                <div class="flex items-center justify-center gap-3 pt-4">
                    <Show when={onBack}>
                        <Button variant="ghost" onClick={onBack}>
                            Go Back
                        </Button>
                    </Show>
                    <Show when={onRetry}>
                        <Button variant="primary" onClick={onRetry}>
                            Try Again
                        </Button>
                    </Show>
                </div>
            </div>
        </section>
    )
}
