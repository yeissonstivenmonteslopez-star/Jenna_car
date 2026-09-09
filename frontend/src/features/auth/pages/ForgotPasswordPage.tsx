import { useState } from 'react'
import type { FormEvent } from 'react'
import { forgotPassword } from '@/features/auth/services/authService'
export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetLink, setResetLink] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const email = new FormData(event.currentTarget).get('email')

    try {
      const data = await forgotPassword(String(email))
      const manualCode = data.code ? `Código manual: ${data.code}` : ''
      setResetLink(data.code ? `/reset-password?email=${encodeURIComponent(String(email))}&code=${encodeURIComponent(String(data.code))}` : '/reset-password')
      setMessage(`${data.message || 'Código generado correctamente.'}${manualCode ? ` ${manualCode}` : ''}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible generar el código.')
    }
  }

  return (
    <main className="min-h-screen bg-primary px-6 text-primary-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <a href="/sign-in" className="mb-12 text-xs text-primary-foreground/60">← Volver al acceso</a>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white">Recuperar acceso</p>
        <h1 className="mt-4 font-serif text-5xl text-white">Restablece tu contraseña.</h1>
        <p className="mt-4 text-sm text-primary-foreground/60">Genera un código manual para cambiar tu contraseña.</p>
        <form onSubmit={submit} className="mt-8 grid gap-5">
          <input name="email" required type="email" placeholder="tu@email.com" className="bg-field p-4 text-white placeholder:text-white" />
          <button className="bg-accent p-4 text-xs font-semibold tracking-[0.18em] text-accent-foreground">GENERAR CÓDIGO</button>
        </form>
        {message && <div className="mt-5 border border-accent/30 bg-accent/10 p-4 text-sm whitespace-pre-line"><p>{message}</p><a href={resetLink} className="mt-3 inline-block text-accent underline">Usar código y cambiar contraseña</a></div>}
        {error && <p className="mt-5 text-sm text-red-300">{error}</p>}
      </div>
    </main>
  )
}
