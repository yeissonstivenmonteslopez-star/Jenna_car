import KeycapAlert from '@/components/ui/KeycapAlert'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { forgotPassword } from '@/features/auth/services/authService'
export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    const email = new FormData(event.currentTarget).get('email')

    try {
      await forgotPassword(String(email))
      navigate('/reset-password', { state: { email: String(email).trim() } })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible generar el código.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-primary px-6 text-primary-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <a href="/sign-in" className="mb-12 text-xs text-primary-foreground/60">← Volver al acceso</a>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white">Recuperar acceso</p>
        <h1 className="mt-4 font-serif text-5xl text-white">Restablece tu contraseña.</h1>
        <p className="mt-4 text-sm text-primary-foreground/60">Ingresa tu correo para recibir el código de recuperación.</p>
        <p className="mt-4 border border-primary-foreground/10 bg-white/5 p-4 text-sm leading-6 text-primary-foreground/75">
          ¿Creaste tu cuenta con Google? Puedes entrar directamente con <a href="/sign-in" className="font-semibold text-accent underline">Continuar con Google</a>; no necesitas un código para iniciar sesión. Si quieres crear una contraseña, solicita aquí el código con el mismo correo de Google.
        </p>
        <form onSubmit={submit} className="mt-8 grid gap-5">
          <input name="email" required type="email" placeholder="tu@email.com" className="bg-field p-4 text-white placeholder:text-white" />
          <button disabled={pending} className="bg-accent p-4 text-xs font-semibold tracking-[0.18em] text-accent-foreground disabled:opacity-50">{pending ? 'GENERANDO…' : 'GENERAR CÓDIGO'}</button>
        </form>
        {error && <KeycapAlert type={'error'} message={error} className="mt-5" />}
      </div>
    </main>
  )
}
