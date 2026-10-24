import { createSignal } from 'solid-js'

const UploadIcon = () => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
)

const FileIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
)

const formatBytes = bytes => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * @param {Object} props
 * @param {(file: File) => void} props.onUpload - Callback when file is selected
 * @param {boolean} props.loading - Loading state
 * @param {string} [props.class]
 * @returns {import('solid-js').JSX.Element}
 */
export function UploadDropzone(props) {
    const [dragOver, setDragOver] = createSignal(false)
    const [selectedFile, setSelectedFile] = createSignal(null)

    const handleDragOver = e => {
        e.preventDefault()
        setDragOver(true)
    }

    const handleDragLeave = e => {
        e.preventDefault()
        setDragOver(false)
    }

    const handleDrop = e => {
        e.preventDefault()
        setDragOver(false)
        const files = Array.from(e.dataTransfer?.files ?? [])
        if (files.length > 0) {
            setSelectedFile(files[0])
            files.forEach(f => props.onUpload?.(f))
        }
    }

    const handleFileSelect = e => {
        const files = Array.from(e.target?.files ?? [])
        if (files.length > 0) {
            setSelectedFile(files[0])
            files.forEach(f => props.onUpload?.(f))
        }
    }

    return (
        <div
            class={`
                relative flex flex-col items-center justify-center
                p-6 border-2 border-dashed rounded-[--radius-md]
                transition-colors duration-[--ease-base]
                ${
                    dragOver()
                        ? 'border-accent bg-accent-pale'
                        : 'border-border bg-bg hover:border-ink'
                }
                ${props.class ?? ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                multiple
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileSelect}
                disabled={props.loading}
            />

            <div class="flex flex-col items-center gap-3 text-center pointer-events-none">
                <div
                    class={`p-3 rounded-full ${dragOver() ? 'bg-accent text-white' : 'bg-surface text-ink'}`}
                >
                    <UploadIcon />
                </div>

                <div>
                    <p class="text-sm font-medium text-ink-dark">
                        {selectedFile()
                            ? selectedFile().name
                            : 'Drop a file here or click to browse'}
                    </p>
                    {selectedFile() && (
                        <p class="text-xs text-muted mt-1">
                            {formatBytes(selectedFile().size)}
                        </p>
                    )}
                </div>

                <p class="text-xs text-muted">
                    Any file type accepted
                </p>
            </div>

            {props.loading && (
                <div class="absolute inset-0 flex items-center justify-center bg-bg/80 rounded-[--radius-md]">
                    <div class="flex items-center gap-2 text-sm text-ink">
                        <span class="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                        Uploading...
                    </div>
                </div>
            )}
        </div>
    )
}
