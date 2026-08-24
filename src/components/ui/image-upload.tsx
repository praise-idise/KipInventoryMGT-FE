import { useState, useRef, useCallback } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ImageUploadProps = {
    value: string | null
    onChange: (file: File | null) => void
    maxSizeMB?: number
    className?: string
    disabled?: boolean
    /** Callback after successful upload — receives the image URL from the server. */
    onUploaded?: (url: string) => void
    /** Function that uploads a file and returns the URL. */
    uploadFn?: (file: File) => Promise<string>
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ImageUpload({ value, onChange, maxSizeMB = 3, className, disabled = false, onUploaded, uploadFn }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(value ?? null)
    const [error, setError] = useState<string | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const maxSizeBytes = maxSizeMB * 1024 * 1024

    const validateAndSet = useCallback(
        (file: File | null) => {
            setError(null)

            if (!file) {
                setPreview(value)
                onChange(null)
                return
            }

            if (!ACCEPTED_TYPES.includes(file.type)) {
                setError('Image must be JPEG, PNG, or WebP.')
                return
            }

            if (file.size > maxSizeBytes) {
                setError(`Image must be ${maxSizeMB} MB or less.`)
                return
            }

            const reader = new FileReader()
            reader.onload = () => {
                setPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
            onChange(file)
        },
        [value, onChange, maxSizeBytes, maxSizeMB],
    )

    function handleRemove() {
        setPreview(null)
        onChange(null)
        if (inputRef.current) {
            inputRef.current.value = ''
        }
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault()
        setIsDragOver(true)
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault()
        setIsDragOver(false)
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        setIsDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) validateAndSet(file)
    }

    return (
        <div className={cn('space-y-2', className)}>
            {preview ? (
                <>
                    <div className="relative mx-auto aspect-square w-full max-w-60 overflow-hidden rounded-md border border-border">
                        <img
                            src={preview}
                            alt="Product preview"
                            className="h-full w-full object-cover"
                        />
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={handleRemove}
                            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
                            aria-label="Remove image"
                        >
                            <Trash2 className="size-4" />
                        </button>
                    </div>
                    {uploadFn && onUploaded && (
                        <button
                            type="button"
                            disabled={disabled || isUploading}
                            onClick={async () => {
                                const file = inputRef.current?.files?.[0]
                                if (!file) return
                                setIsUploading(true)
                                setError(null)
                                try {
                                    const url = await uploadFn(file)
                                    onUploaded(url)
                                } catch {
                                    setError('Upload failed. Please try again.')
                                } finally {
                                    setIsUploading(false)
                                }
                            }}
                            className="mx-auto flex w-full max-w-60 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                            <Upload className="size-4" />
                            {isUploading ? 'Uploading...' : 'Upload Image'}
                        </button>
                    )}
                </>
            ) : (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        'mx-auto flex aspect-square w-full max-w-60 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border transition-colors hover:border-primary/50 hover:bg-muted/50',
                        isDragOver && 'border-primary bg-primary/5',
                    )}
                >
                    <div className="inline-flex size-10 items-center justify-center rounded-full bg-muted">
                        <ImagePlus className="size-5 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium">
                            <span className="text-primary">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                            JPEG, PNG or WebP (max {maxSizeMB}MB)
                        </p>
                    </div>
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                disabled={disabled}
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)}
                className="hidden"
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    )
}
