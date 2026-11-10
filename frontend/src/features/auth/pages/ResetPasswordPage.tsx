import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { resetPassword, verifyResetCode } from '@/features/auth/services/authService'

export default function ResetPasswordPage() {
  const location = useLocation()
  const email = location.state?.email || new URLSearchParams(location.search).get('email') || ''
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

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
      setSuccess(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible actualizar la contraseña.')
    } finally {
      setPending(false)
    }
  }

  const inputClass = 'bg-field p-4 text-white outline-none focus:ring-2 focus:ring-accent'
  const buttonClass = 'bg-accent p-4 text-xs font-semibold tracking-[0.18em] text-accent-foreground disabled:opacity-50'

  return (
    <main className="min-h-screen bg-primary px-6 py-8 text-primary-foreground sm:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <a href="/sign-in" className="mb-12 text-xs text-primary-foreground/60">← Volver al acceso</a>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Recuperar acceso</p>
        <h1 className="mt-4 font-serif text-5xl text-white">{success ? 'Contraseña actualizada.' : verified ? 'Nueva contraseña.' : 'Ingresa tu código.'}</h1>
        {success ? (
          <div role="status" className="mt-8 border border-accent/30 bg-accent/10 p-4 text-sm">
            Contraseña actualizada correctamente. <a className="text-accent underline" href="/sign-in">Iniciar sesión</a>
          </div>
        ) : verified ? (
          <form key="password" onSubmit={submit} className="mt-8 grid gap-5">
            <label className="grid gap-2 text-xs">Nueva contraseña
              <input autoFocus name="password" required minLength={8} type="password" autoComplete="new-password" className={inputClass} />
            </label>
            <label className="grid gap-2 text-xs">Confirmar contraseña
              <input name="confirmation" required minLength={8} type="password" autoComplete="new-password" className={inputClass} />
            </label>
            <button disabled={pending} className={buttonClass}>{pending ? 'ACTUALIZANDO…' : 'ACTUALIZAR CONTRASEÑA'}</button>
          </form>
        ) : (
          <form key="code" onSubmit={validateCode} className="mt-8 grid gap-5">
            <p className="text-sm text-primary-foreground/60">Ingresa el código de 6 dígitos enviado a tu correo.</p>
            {location.state?.manualCode && <p className="text-sm">Código de prueba: {location.state.manualCode}</p>}
            <label className="grid gap-2 text-xs">Código de recuperación
              <input autoFocus name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} className={inputClass} />
            </label>
            <button disabled={pending} className={buttonClass}>{pending ? 'VALIDANDO…' : 'VALIDAR CÓDIGO'}</button>
            <a href="/forgot-password" className="text-center text-sm text-accent underline">Solicitar otro código</a>
          </form>
        )}
        {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
      </div>
    </main>
  )
}
