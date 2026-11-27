import KeycapAlert from '@/components/ui/KeycapAlert'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { forgotPassword, resetPassword, verifyResetCode } from '@/features/auth/services/authService'

const RESEND_WAIT_SECONDS = 4 * 60
const MAX_RESENDS = 2

function getResetRequestState(email: string) {
  try {
    const saved = sessionStorage.getItem(`password-reset:${email.toLowerCase()}`)
    if (saved) return JSON.parse(saved) as { sentAt: number; resends: number }
  } catch {
    // Continue with a fresh local cooldown if storage is unavailable.
  }
  return { sentAt: Date.now(), resends: 0 }
}

export default function ResetPasswordPage() {
  const location = useLocation()
  const email = location.state?.email || new URLSearchParams(location.search).get('email') || ''
  const [requestState, setRequestState] = useState(() => getResetRequestState(email))
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, RESEND_WAIT_SECONDS - Math.floor((Date.now() - requestState.sentAt) / 1000)))
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)
  const [resendNotice, setResendNotice] = useState('')

  useEffect(() => {
    const updateCountdown = () => setSecondsLeft(Math.max(0, RESEND_WAIT_SECONDS - Math.floor((Date.now() - requestState.sentAt) / 1000)))
    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [requestState.sentAt])

  if (!email) return <Navigate to="/forgot-password" replace />

  async function validateCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await verifyResetCode(email, code.trim())
      setVerified(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible validar el código.')
    } finally {
      setPending(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    if (password.length < 8 || password !== form.get('confirmation')) {
      setError('Las contraseñas deben coincidir y tener al menos 8 caracteres.')
      return
    }
    setPending(true)
    try {
      await resetPassword({ email, code: code.trim(), password })
      sessionStorage.removeItem(`password-reset:${email.toLowerCase()}`)
      setSuccess(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible actualizar la contraseña.')
    } finally {
      setPending(false)
    }
  }

  async function resendCode() {
    if (pending || secondsLeft > 0 || requestState.resends >= MAX_RESENDS) return
    setPending(true)
    setError('')
    setResendNotice('')
    try {
      await forgotPassword(email)
      const nextState = { sentAt: Date.now(), resends: requestState.resends + 1 }
      sessionStorage.setItem(`password-reset:${email.toLowerCase()}`, JSON.stringify(nextState))
      setRequestState(nextState)
      setSecondsLeft(RESEND_WAIT_SECONDS)
      setCode('')
      setResendNotice('Solicitud de reenvío enviada al mismo correo.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible reenviar el código.')
    } finally {
      setPending(false)
    }
  }

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`

  const inputClass = 'bg-field p-4 text-white outline-none focus:ring-2 focus:ring-accent'
  const buttonClass = 'bg-accent p-4 text-xs font-semibold tracking-[0.18em] text-accent-foreground disabled:opacity-50'

  return (
    <main className="min-h-screen bg-primary px-6 py-8 text-primary-foreground sm:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <a href="/sign-in" className="mb-12 text-xs text-primary-foreground/60">← Volver al acceso</a>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Recuperar acceso</p>
        <h1 className="mt-4 font-serif text-5xl text-white">{success ? 'Contraseña actualizada.' : verified ? 'Nueva contraseña.' : 'Ingresa tu código.'}</h1>
        {success ? (
          <KeycapAlert type="success" className="mt-8" message={<>Contraseña actualizada correctamente. <a className="underline" href="/sign-in">Iniciar sesión</a></>} />
        ) : verified ? (
          <form key="password" onSubmit={submit} className="mt-8 grid gap-5">
            <label className="grid gap-2 text-xs">Nueva contraseña
              <input autoFocus name="password" required minLength={8} maxLength={128} type="password" autoComplete="new-password" className={inputClass} />
            </label>
            <label className="grid gap-2 text-xs">Confirmar contraseña
              <input name="confirmation" required minLength={8} maxLength={128} type="password" autoComplete="new-password" className={inputClass} />
            </label>
            <button disabled={pending} className={buttonClass}>{pending ? 'ACTUALIZANDO…' : 'ACTUALIZAR CONTRASEÑA'}</button>
          </form>
        ) : (
          <form key="code" onSubmit={validateCode} className="mt-8 grid gap-5">
            <p className="text-sm text-primary-foreground/60">Si hay una cuenta asociada a <strong className="break-all text-white">{email}</strong>, recibirás un código de 6 dígitos. Puede tardar unos minutos; revisa también la carpeta de spam.</p>
            <label className="grid gap-2 text-xs">Código de recuperación
              <input autoFocus name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} className={inputClass} />
            </label>
            <button disabled={pending} className={buttonClass}>{pending ? 'VALIDANDO…' : 'VALIDAR CÓDIGO'}</button>
            <div className="grid gap-2 text-center">
              {requestState.resends < MAX_RESENDS ? (
                <button type="button" onClick={resendCode} disabled={pending || secondsLeft > 0} className="text-sm text-accent underline disabled:cursor-not-allowed disabled:opacity-50">
                  {pending ? 'ENVIANDO…' : secondsLeft > 0 ? `Reenviar código en ${countdown}` : 'Reenviar código al mismo correo'}
                </button>
              ) : (
                <p className="text-sm text-primary-foreground/55">Se alcanzó el máximo de 3 envíos permitidos en una hora para este correo.</p>
              )}
              {resendNotice && <p role="status" className="text-xs text-primary-foreground/60">{resendNotice}</p>}
            </div>
          </form>
        )}
        {error && <KeycapAlert type={'error'} message={error} className="mt-5" />}
      </div>
    </main>
  )
}
