import { createSignal } from 'solid-js'

import { apiDeleteDoc } from '@/entities/docs/api'

/**
 * @param {() => void} [onSuccess] - callback when delete succeeds
 * @returns {{ remove: (docId: string) => Promise<[boolean, any]>, loading: () => boolean }}
 */
export function useDeleteDoc(onSuccess) {
    const [loading, setLoading] = createSignal(false)

    const remove = async docId => {
        setLoading(true)
        try {
            await apiDeleteDoc(docId)
            onSuccess?.()
            return [true, null]
        } catch (e) {
            return [false, { general: e.message }]
        } finally {
            setLoading(false)
        }
    }

    return { remove, loading }
}
