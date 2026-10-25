export const MAX_NAME_RETRIES = 10

/**
 * Parte base de un filename antes de su última extensión. Un dotfile sin
 * otra extensión (por ejemplo `.env`) se trata como un nombre sin extensión.
 * @param {string} fileName
 */
export function fileBaseName(fileName) {
    const dot = fileName.lastIndexOf('.')
    if (dot <= 0) return fileName
    return fileName.slice(0, dot)
}

/** @param {string} fileName */
export function fileNameExtension(fileName) {
    const dot = fileName.lastIndexOf('.')
    return dot <= 0 ? '' : fileName.slice(dot)
}

/**
 * Nombre de archivo con el primer sufijo libre `base (n).ext`. La colisión
 * se compara contra el Node.name completo, que ahora conserva el filename.
 * Devuelve el nombre original si no hay colisión.
 * @param {string} fileName
 * @param {Iterable<string>} takenNames
 */
export function uniqueFileName(fileName, takenNames) {
    const base = fileBaseName(fileName)
    const taken = new Set(takenNames)
    if (!taken.has(fileName)) return fileName
    const ext = fileNameExtension(fileName)
    for (let n = 1; n <= taken.size + 1; n++) {
        const candidate = `${base} (${n})`
        const candidateFileName = `${candidate}${ext}`
        if (!taken.has(candidateFileName)) return candidateFileName
    }
    return null
}

/**
 * @param {string} fileName
 * @returns {number} sufijo n de un nombre `base (n).ext`, o 0
 */
export function nameSuffix(fileName) {
    return Number(fileName.match(/ \((\d+)\)(?:\.[^/\\]*)?$/)?.[1]) || 0
}
