import { createSignal } from 'solid-js'

import { apiDeleteDoc } from '@/entities/docs/api'
import { ApiError } from '@/shared/errors'

/**
 * @param {() => void} [onSuccess] - callback when delete succeeds
 */
export function useDeleteDoc(onSuccess) {
    const [loading, setLoading] = createSignal(false)

    /**
     * @param {string} docId
     * @returns {Promise<[true, null] | [false, { message: string, reason?: string }]>}
     */
    const remove = async docId => {
        setLoading(true)
        try {
            await apiDeleteDoc(docId)
            onSuccess?.()
            return [true, null]
        } catch (e) {
            if (e instanceof ApiError) {
                return [false, { message: e.message, reason: e.detail?.reason }]
            }
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}
