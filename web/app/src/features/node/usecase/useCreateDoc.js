import { createSignal } from 'solid-js'

import { apiCreateDoc, buildCreateDocDTO } from '@/entities/docs/api'
import { getErrorMessage } from '@/shared/errors'
import { toast } from '@/shared/ui'

import { uniqueFileName } from './naming'

export { fileBaseName, fileNameExtension, uniqueFileName } from './naming'

function renamedFile(file, fileName) {
    return new File([file], fileName, { type: file.type })
}

export const TOAST_CODE_RENAMED_DOC = 'TOAST_CODE_RENAMED_DOC'

/**
 * @param {() => string} getParentId - function that returns the parent node ID
 * @param {() => void} [onSuccess] - callback when upload succeeds
 */
export function useCreateDoc(getParentId, onSuccess) {
    const [loading, setLoading] = createSignal(false)

    // NOTE: takenNames son Node.name completos de los children ya cargados;
    // el backend persiste el filename completo en el nodo. Así se elige el
    // primer `base (n).ext` libre sin consultas adicionales.
    /**
     * @param {File} file
     * @param {string} description
     * @param {string} [parentIdOverride]
     * @param {Iterable<string>} [takenNames] - nombres de nodo ya ocupados en el destino
     * @param {AbortSignal} [signal]
     * @returns {Promise<[true, any] | [false, { general: string }]>}
     */
    const upload = async (
        file,
        description = '',
        parentIdOverride,
        takenNames,
        signal
    ) => {
        const parentId = parentIdOverride ?? getParentId()
        if (!parentId) return [false, { general: 'No parent folder selected' }]

        const [valid, dto] = buildCreateDocDTO(parentId, description)
        if (!valid) return [false, dto]

        let activeFile = file
        const taken = new Set(takenNames ?? [])
        if (taken.size > 0) {
            const unique = uniqueFileName(file.name, taken)
            if (unique !== file.name) {
                activeFile = renamedFile(file, unique)
            }
        }

        setLoading(true)

        try {
            const doc = await apiCreateDoc(activeFile, dto, signal)
            onSuccess?.()
            if (activeFile.name !== file.name) {
                toast.warning(
                    `Name already existed; saved as "${activeFile.name}"`,
                    TOAST_CODE_RENAMED_DOC
                )
            }

            return [true, doc]
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                return [false, { general: 'Upload cancelled.' }]
            }

            return [false, { general: getErrorMessage(e, 'Upload failed') }]
        } finally {
            setLoading(false)
        }
    }

    return { upload, loading }
}
