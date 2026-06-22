import z from 'zod'

export class CreateDocDTO {
    static #schema = z.strictObject({
        parent_id: z.uuid('Parent ID must be a string and a valid UUID.'),
        description: z
            .string('Description must be a string.')
            .max(255, 'Description must be at most 255 characters.')
            .optional()
    })

    static get schema() {
        return structuredClone(CreateDocDTO.#schema)
    }

    /** @param {z.infer<typeof CreateDocDTO.schema>} dto */
    constructor({ parent_id, description = '' }) {
        this.parent_id = parent_id
        this.description = description
    }

    /**
     * @param {string} parentId
     * @param {string} description
     * @returns {[true, CreateDocDTO] | [false, Record<string, string>]}
     */
    static build(parentId, description = '') {
        const r = CreateDocDTO.#schema.safeParse({
            parent_id: parentId,
            description
        })
        if (!r.success) {
            const issues = {}
            r.error.issues.forEach(issue => {
                issues[issue.path.at(-1)?.toString() ?? 'general'] =
                    issue.message
            })
            return [false, issues]
        }
        return [true, new CreateDocDTO(r.data)]
    }
}

export const buildCreateDocDTO = CreateDocDTO.build

/**
 * @param {string} docId
 * @returns {Promise<import('@/entities/nodes').Doc>}
 */
export async function apiDeleteDoc(docId) {
    const res = await fetch(`/api/v1/docs/${docId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
    })

    if (!res.ok) {
        const msg = await res
            .json()
            .then(r => r?.detail?.reason || r.message)
            .catch(() => 'Delete failed')
        throw new Error(msg)
    }

    return await res.json()
}

/**
 * @param {string} docId
 * @param {string} filename
 */
export async function apiDownloadDoc(docId, filename) {
    const res = await fetch(`/api/v1/docs/${docId}/download`, {
        method: 'GET',
        credentials: 'same-origin'
    })

    if (!res.ok) {
        const msg = await res
            .json()
            .then(r => r?.detail?.reason || r.message)
            .catch(() => 'Download failed')
        throw new Error(msg)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'document'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
