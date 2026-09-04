import { FormEvent, useState } from 'react'
import { getApiUrl } from '@/lib/config'
const apiUrl = getApiUrl('')
export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetLink, setResetLink] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const email = new FormData(event.currentTarget).get('email')

    try {
      const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No fue posible enviar la solicitud.')

      const manualCode = data.code ? `Código manual: ${data.code}` : ''
      setResetLink(data.code ? `/reset-password?email=${encodeURIComponent(String(email))}&code=${encodeURIComponent(String(data.code))}` : '/reset-password')
      setMessage(`${data.message || 'Si el correo está registrado, recibirás instrucciones.'}${manualCode ? ` ${manualCode}` : ''}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible enviar la solicitud.')
    }
  }

  return (
    <main className="min-h-screen bg-primary px-6 text-primary-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <a href="/sign-in" className="mb-12 text-xs text-primary-foreground/60">← Volver al acceso</a>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Recuperar acceso</p>
        <h1 className="mt-4 font-serif text-5xl">Restablece tu contraseña.</h1>
        <p className="mt-4 text-sm text-primary-foreground/60">
          Puedes recibir el enlace por correo o usar el código de recuperación generado en este entorno.
        </p>
        <form onSubmit={submit} className="mt-8 grid gap-5">
          <input name="email" required type="email" placeholder="tu@email.com" className="bg-field p-4 text-primary" />
          <button className="bg-accent p-4 text-xs font-semibold tracking-[0.18em] text-accent-foreground">
            ENVIAR INSTRUCCIONES
          </button>
        </form>
        {message && <div className="mt-5 border border-accent/30 bg-accent/10 p-4 text-sm whitespace-pre-line"><p>{message}</p><a href={resetLink} className="mt-3 inline-block text-accent underline">Introducir código y cambiar contraseña</a></div>}
        {error && <p className="mt-5 text-sm text-red-300">{error}</p>}
      </div>
    </main>
  )
}
