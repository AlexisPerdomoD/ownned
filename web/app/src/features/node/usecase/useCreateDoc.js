import { createSignal } from 'solid-js'

import { buildCreateDocDTO } from '@/entities/docs/api'
import { reqForm } from '@/shared/api/client'
import { ApiConflictError, getErrorMessage } from '@/shared/errors'
import { toast } from '@/shared/ui'
import {
    MAX_NAME_RETRIES,
    fileBaseName,
    fileNameExtension,
    nameSuffix,
    uniqueFileName
} from './naming'

export {
    MAX_NAME_RETRIES,
    fileBaseName,
    fileNameExtension,
    uniqueFileName
} from './naming'

function renamedFile(file, fileName) {
    return new File([file], fileName, { type: file.type })
}

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
     * @returns {Promise<[true, any] | [false, { general?: string, reason?: string, message?: string }]>}
     */
    const upload = async (
        file,
        description = '',
        parentIdOverride,
        takenNames
    ) => {
        const parentId = parentIdOverride ?? getParentId()
        if (!parentId) return [false, { general: 'No parent folder selected' }]

        const [valid, dto] = buildCreateDocDTO(parentId, description)
        if (!valid) return [false, dto]

        let activeFile = file
        let lastSuffix = 0
        const taken = takenNames ? Array.from(takenNames) : []
        if (taken.length > 0) {
            const unique = uniqueFileName(file.name, taken)
            if (unique !== file.name) {
                lastSuffix = nameSuffix(unique)
                activeFile = renamedFile(file, unique)
            }
        }

        setLoading(true)
        let attempt = 0
        try {
            while (attempt <= MAX_NAME_RETRIES) {
                try {
                    const formData = new FormData()
                    formData.append('parent_id', dto.parent_id)
                    if (dto.description) {
                        formData.append('description', dto.description)
                    }
                    formData.append('size', String(activeFile.size))
                    formData.append('file', activeFile)

                    const doc = await reqForm('/api/v1/nodes/docs', formData)
                    onSuccess?.()
                    if (activeFile.name !== file.name) {
                        toast.warning(
                            `Name already existed; saved as "${activeFile.name}"`
                        )
                    }
                    return [true, doc]
                } catch (e) {
                    if (
                        e instanceof ApiConflictError &&
                        attempt < MAX_NAME_RETRIES
                    ) {
                        attempt += 1
                        const suffix = lastSuffix + attempt
                        activeFile = renamedFile(
                            file,
                            `${fileBaseName(file.name)} (${suffix})${
                                fileNameExtension(file.name)
                            }`
                        )
                        continue
                    }
                    return [
                        false,
                        {
                            general: getErrorMessage(e, 'Upload failed'),
                            reason: e?.detail?.reason
                        }
                    ]
                }
            }
            return [false, { general: 'Could not find a free name to upload.' }]
        } finally {
            setLoading(false)
        }
    }

    return { upload, loading }
}
