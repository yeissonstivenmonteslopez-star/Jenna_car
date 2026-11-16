import KeycapAlert from '@/components/ui/KeycapAlert'
import EvidencePhotoUpload from '@/components/ui/EvidencePhotoUpload'
import { useFeedback } from '@/components/ui/useFeedback'
import { useEffect, useState } from 'react'
import { authHeaders, getApiUrl } from '@/services/apiClient'

export default function RepairPublisher({ work, token, onSaved }: {
  work: { id: number; estado: string }; token: string; onSaved: () => Promise<void>
}) {
  const [state, setState] = useState(work.estado)
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage, messageType] = useFeedback()
  const [retry, setRetry] = useState<number | null>(null)
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [files])
  useEffect(() => setState(work.estado), [work.estado])

  function selectPhotos(selected: File[]) {
    if (busy) return
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setMessage('Formato inválido. Usa JPG, PNG o WEBP.', 'error')
      return
    }
    if (selected.length > 6 || selected.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) {
      setMessage('Máximo 6 fotos y 4 MB en total.', 'error')
      return
    }
    setFiles(selected)
    setMessage('')
  }

  async function submit(retryOnly = false) {
    setBusy(true)
    setMessage('')
    try {
      const body = new FormData()
      body.append('estado', state)
      body.append('observaciones', note)
      files.forEach((file) => body.append('files', file))
      const response = await fetch(getApiUrl(retryOnly ? `/api/mechanic/updates/${retry}/retry-email` : `/api/mechanic/works/${work.id}/updates`), {
        method: 'POST', headers: authHeaders(token), ...(retryOnly ? {} : { body }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No fue posible publicar el avance')
      const data = result.data
      setRetry(data.correo_enviado === false ? data.notificacion_id : null)
      setMessage(data.sin_cambios ? 'No hay cambios para publicar.' : data.correo_enviado ? 'Avance guardado. Correo aceptado por SMTP.' : 'Avance guardado. Correo pendiente; puedes reintentarlo.', data.sin_cambios || !data.correo_enviado ? 'warning' : 'success')
      if (!retryOnly) { setFiles([]); setNote(''); await onSaved() }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible publicar', 'error')
    } finally { setBusy(false) }
  }

  return <div className="mt-3 grid w-full gap-3 border-l-2 border-red-500/50 pl-4">
    <label className="grid gap-1 text-xs text-white/65">Estado del trabajo
      <select value={state} disabled={busy} onChange={(event) => setState(event.target.value)} className="rounded border border-white/15 bg-[#171717] p-2 text-white">
        {['pendiente', 'en_proceso', 'completado', 'cancelado'].map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
      </select>
    </label>
    <label className="grid gap-1 text-xs text-white/65">Observación actual del diagnóstico
      <textarea value={note} disabled={busy} maxLength={255} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Describe el avance (máximo 255 caracteres)" className="rounded border border-white/15 bg-[#171717] p-3 text-white" />
    </label>
    <EvidencePhotoUpload onFileSelect={selectPhotos} previewUrl={previews[0]} fileName={files.length > 1 ? `${files[0].name} y ${files.length - 1} más` : files[0]?.name}
      disabled={busy} multiple helperText="Toca o arrastra fotos · JPG, PNG o WEBP · máximo 6 fotos y 4 MB en total" />
    {previews.length > 1 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{previews.map((url, index) => <figure key={url} className="min-w-0"><img src={url} alt={`Vista previa ${index + 1}`} className="h-24 w-full rounded object-cover" /><figcaption className="mt-1 break-all text-xs text-white/65">{files[index]?.name}</figcaption></figure>)}</div>}
    <button type="button" disabled={busy || (!note.trim() && !files.length && state === work.estado)} onClick={() => void submit()} className="rounded bg-red-600 p-3 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Publicando…' : 'Publicar avance'}</button>
    {message && <KeycapAlert type={messageType} message={message} />}
    {retry && <button type="button" disabled={busy} onClick={() => void submit(true)} className="text-left text-xs text-red-300 underline">Reintentar correo de este avance</button>}
  </div>
}
