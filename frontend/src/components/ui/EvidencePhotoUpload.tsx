import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

type EvidencePhotoUploadProps = {
  onFileSelect: (files: File[]) => void
  previewUrl?: string
  fileName?: string
  label?: string
  helperText?: string
  disabled?: boolean
  multiple?: boolean
}

export default function EvidencePhotoUpload({
  onFileSelect, previewUrl, fileName, label = 'Subir evidencia fotográfica',
  helperText = 'Toca para tomar foto o seleccionar imagen (JPG, PNG, WEBP)',
  disabled = false, multiple = false,
}: EvidencePhotoUploadProps) {
  const id = useId()
  const [dragging, setDragging] = useState(false)

  return <label
    htmlFor={id}
    className={cn('evidence-photo-upload group relative flex min-h-[200px] w-full max-w-[360px] flex-col items-center justify-center gap-4 rounded-[10px] border-2 border-dashed border-zinc-700 bg-zinc-900 p-6 text-center text-zinc-100 shadow-[0_38px_30px_-38px_rgba(220,38,38,0.45)] transition-all motion-reduce:transition-none', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-red-600 hover:bg-zinc-950', dragging && !disabled && 'is-dragging')}
    aria-disabled={disabled}
    onDragOver={(event) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
      if (!disabled) setDragging(true)
    }}
    onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
    }}
    onDrop={(event) => {
      event.preventDefault()
      setDragging(false)
      if (disabled) return
      const files = Array.from(event.dataTransfer.files)
      if (files.length) onFileSelect(multiple ? files : files.slice(0, 1))
    }}
  >
    <input
      id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple}
      disabled={disabled} aria-label={label} aria-describedby={`${id}-help`}
      className="sr-only"
      onChange={(event) => {
        const files = Array.from(event.currentTarget.files || [])
        if (files.length) onFileSelect(files)
        // Allow selecting the same file again, including after a failed validation.
        event.currentTarget.value = ''
      }}
    />
    {previewUrl ? <div className="relative w-full">
      <img src={previewUrl} alt="Vista previa de la evidencia" className="h-36 w-full rounded-md object-contain" />
      <span className="evidence-photo-badge absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold">Cambiar foto{multiple ? 's' : ''}</span>
    </div> : <svg viewBox="0 0 64 64" className="h-16 w-16 fill-zinc-200 transition-transform motion-reduce:transition-none group-hover:scale-105 group-hover:fill-red-500" aria-hidden="true">
      <path d="M19 43H14a12 12 0 0 1-1-24 19 19 0 0 1 36-3 14 14 0 0 1 2 27h-6V30a5 5 0 0 0-5-5H24a5 5 0 0 0-5 5Z" />
      <path d="M24 29h16a1 1 0 0 1 1 1v28a1 1 0 0 1-1 1H24a1 1 0 0 1-1-1V30a1 1 0 0 1 1-1Zm6 22h4V41l4 4 3-3-9-9-9 9 3 3 4-4Z" fillRule="evenodd" />
    </svg>}
    <div className="min-w-0 w-full">
      <span className="block text-sm font-semibold">{label}</span>
      {fileName && <span className="evidence-photo-name mt-1 block break-all text-xs">{fileName}</span>}
      <span id={`${id}-help`} className="evidence-photo-help mt-2 block text-xs leading-relaxed">{helperText}</span>
    </div>
  </label>
}
