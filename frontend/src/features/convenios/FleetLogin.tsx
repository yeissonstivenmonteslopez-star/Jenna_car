import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fleetKey, fleetRequest, type Fleet } from './fleetApi'

export default function FleetLogin({ back }: { back: () => void }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await fleetRequest<Fleet & {token: string}>('convenios/validar-codigo', undefined, { codigo: code.trim() })
      localStorage.setItem(fleetKey, JSON.stringify({ token: data.token, empresa: data.empresa }))
      navigate('/convenio/agendar')
    } catch (e) { setError(e instanceof TypeError ? 'No se pudo conectar con el taller.' : (e as Error).message) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="grid gap-5 rounded-xl border border-red-800 bg-neutral-950 p-6 text-white">
    <label className="grid gap-2">Código de convenio<input required autoFocus maxLength={30} value={code}
      onChange={e => setCode(e.target.value.toUpperCase())} className="rounded border border-neutral-600 bg-neutral-900 p-3 uppercase" /></label>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy} className="rounded bg-red-700 p-3 font-semibold disabled:opacity-50">{busy ? 'Validando…' : 'Validar y Acceder a Flota'}</button>
    <button type="button" onClick={back} className="underline">Volver al inicio de sesión normal</button>
  </form>
}
