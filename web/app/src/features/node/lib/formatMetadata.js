export const formatBytes = bytes => {
    if (!bytes) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${parseFloat((bytes / 1024 ** unitIndex).toFixed(1))} ${units[unitIndex]}`
}

export const formatRelativeDate = dateString => {
    if (!dateString) return ''
    const difference = Math.floor(
        (new Date() - new Date(dateString)) / 86400000
    )
    if (difference <= 0) return 'Today'
    if (difference === 1) return 'Yesterday'
    if (difference < 30) {
        return new Date(dateString).toLocaleDateString('es-ES', {
            month: 'short',
            day: 'numeric'
        })
    }
    return new Date(dateString).toLocaleDateString('es-ES', {
        month: 'short',
        year: 'numeric'
    })
}
