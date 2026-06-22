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
        const file = e.dataTransfer?.files?.[0]
        if (file) {
            setSelectedFile(file)
            props.onUpload?.(file)
        }
    }

    const handleFileSelect = e => {
        const file = e.target?.files?.[0]
        if (file) {
            setSelectedFile(file)
            props.onUpload?.(file)
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
                        ? 'border-[--color-accent] bg-[--color-accent-pale]'
                        : 'border-[--color-border] bg-[--color-bg] hover:border-[--color-ink]'
                }
                ${props.class ?? ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileSelect}
                disabled={props.loading}
            />

            <div class="flex flex-col items-center gap-3 text-center pointer-events-none">
                <div
                    class={`p-3 rounded-full ${dragOver() ? 'bg-[--color-accent] text-white' : 'bg-[--color-surface] text-[--color-ink]'}`}
                >
                    <UploadIcon />
                </div>

                <div>
                    <p class="text-sm font-medium text-[--color-ink-dark]">
                        {selectedFile()
                            ? selectedFile().name
                            : 'Drop a file here or click to browse'}
                    </p>
                    {selectedFile() && (
                        <p class="text-xs text-[--color-muted] mt-1">
                            {formatBytes(selectedFile().size)}
                        </p>
                    )}
                </div>

                <p class="text-xs text-[--color-muted]">
                    Any file type accepted
                </p>
            </div>

            {props.loading && (
                <div class="absolute inset-0 flex items-center justify-center bg-[--color-bg]/80 rounded-[--radius-md]">
                    <div class="flex items-center gap-2 text-sm text-[--color-ink]">
                        <span class="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                        Uploading...
                    </div>
                </div>
            )}
        </div>
    )
}
