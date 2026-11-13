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
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState<number | null>(null)
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [files])
  useEffect(() => setState(work.estado), [work.estado])

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
      setMessage(data.sin_cambios ? 'No hay cambios para publicar.' : data.correo_enviado ? 'Avance guardado. Correo aceptado por SMTP.' : 'Avance guardado. Correo pendiente; puedes reintentarlo.')
      if (!retryOnly) { setFiles([]); setNote(''); await onSaved() }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible publicar')
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
    <label className="workspace-upload grid gap-2 text-xs text-white/65">Fotografías · JPG, PNG o WEBP · hasta 6 fotos y 4 MB en total
      <span className="inline-flex w-fit rounded bg-red-600 px-4 py-2 text-white">Seleccionar fotografías</span>
      <input type="file" multiple disabled={busy} accept="image/jpeg,image/png,image/webp" onChange={(event) => {
        const selected = Array.from(event.target.files || [])
        if (selected.length > 6 || selected.some((file) => file.size > 4 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) || selected.reduce((sum, file) => sum + file.size, 0) > 4 * 1024 * 1024) {
          setMessage('Selecciona hasta seis fotos; el conjunto debe pesar menos de 4 MB.'); event.target.value = ''; return
        }
        setFiles(selected); setMessage('')
      }} className="sr-only" />
    </label>
    <div className="flex flex-wrap gap-2">{previews.map((url, index) => <img key={url} src={url} alt={`Vista previa ${index + 1}`} className="h-24 w-24 rounded object-cover" />)}</div>
    <button type="button" disabled={busy || (!note.trim() && !files.length && state === work.estado)} onClick={() => void submit()} className="rounded bg-red-600 p-3 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Publicando…' : 'Publicar avance'}</button>
    {message && <p role="status" className="text-xs text-white/75">{message}</p>}
    {retry && <button type="button" disabled={busy} onClick={() => void submit(true)} className="text-left text-xs text-red-300 underline">Reintentar correo de este avance</button>}
  </div>
}
