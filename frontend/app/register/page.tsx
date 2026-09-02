'use client'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, UserRound } from 'lucide-react'
import { getApiUrl, getGoogleClientId } from '@/lib/config'

const apiUrl = getApiUrl('')
const googleClientId = getGoogleClientId()

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential?: string }) => void; auto_select?: boolean }) => void
          prompt: (notification?: (notification: { isNotDisplayed: () => boolean; getNotDisplayedReason: () => string; isSkippedMoment: () => boolean; getSkippedReason: () => string }) => void) => void
        }
      }
    }
  }
}

export default function RegisterPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogleCallback(response: { credential?: string }) {
    if (!response.credential) return
    setError('')
    setLoading(true)
    try {
      const result = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential }),
      })
      const data = await result.json()
      if (!result.ok) throw new Error(data.error || 'No fue posible crear la cuenta con Google.')
      localStorage.setItem('jenna_car_token', data.token)
      localStorage.setItem('jenna_car_user', JSON.stringify(data.user))
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/'
      window.location.href = redirect
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible crear la cuenta con Google.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!googleClientId) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.accounts.id) {
        window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCallback, auto_select: false })
      }
    }
    document.body.appendChild(script)
    return () => { if (document.body.contains(script)) document.body.removeChild(script) }
  }, [])

  function handleGoogleRegister() {
    if (!googleClientId) {
      setError('El registro con Google no está configurado.')
      return
    }
    if (!window.google?.accounts.id) {
      setError('Google aún se está cargando. Inténtalo de nuevo.')
      return
    }
    window.google.accounts.id.prompt()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    const telefono = String(form.get('telefono') || '').trim()
    if (password.length < 8 || password !== form.get('confirmation')) {
      return setError('Las contraseñas deben coincidir y tener al menos 8 caracteres.')
    }
    if (!/^\d{10}$/.test(telefono)) {
      return setError('El teléfono debe tener exactamente 10 números.')
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.get('nombre'),
          apellido: form.get('apellido'),
          email: form.get('email'),
          password,
          telefono,
          documento: form.get('documento'),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No fue posible crear la cuenta.')

      localStorage.setItem('jenna_car_token', data.token)
      localStorage.setItem('jenna_car_user', JSON.stringify(data.user))

      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/'
      window.location.href = redirect
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="grid min-h-screen lg:grid-cols-[0.82fr_1.18fr]">
        <section className="relative hidden overflow-hidden border-r border-red-950/60 lg:block">
          <img src="/jenna-car-hero.png" alt="Vehículo premium en Jenna Car" className="absolute inset-0 h-full w-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-red-950/20" />
          <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
            <a href="/" className="font-serif text-xl tracking-[0.18em]">JENNA <span className="text-red-500">CAR</span></a>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">Área cliente</p>
              <h2 className="mt-4 font-serif text-6xl leading-[0.95]">Tu vehículo,<br /><em className="text-red-500">en buenas manos.</em></h2>
              <p className="mt-6 max-w-sm text-sm leading-6 text-white/60">Crea tu cuenta para agendar citas, consultar el estado de tu vehículo y gestionar tus recibos.</p>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
          <a href="/sign-in" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-white">
            <ArrowLeft size={15} /> Ya tengo una cuenta
          </a>

          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-12">
            <div className="mb-10">
              <div className="mb-6 flex h-11 w-11 items-center justify-center border border-red-500/30 bg-red-500/10 text-red-400">
                <UserRound size={18} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-400">Registro</p>
              <h1 className="mt-4 font-serif text-5xl leading-none text-white sm:text-6xl">Crea tu cuenta.</h1>
              <p className="mt-4 text-sm text-white/55">Completa tus datos para empezar a cuidar tu vehículo.</p>
            </div>

            <form onSubmit={submit} className="grid gap-6 sm:grid-cols-2">
              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Nombre<input name="nombre" required placeholder="Tu nombre" className="rounded-lg border border-white/10 bg-[#161616] px-4 py-3.5 text-base normal-case tracking-normal text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" /></label>
              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Apellido<input name="apellido" required placeholder="Tu apellido" className="rounded-lg border border-white/10 bg-[#161616] px-4 py-3.5 text-base normal-case tracking-normal text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" /></label>
              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Documento <span className="font-normal normal-case tracking-normal text-white/35">Opcional</span><input name="documento" placeholder="Número de documento" className="rounded-lg border border-white/10 bg-[#161616] px-4 py-3.5 text-base normal-case tracking-normal text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" /></label>
              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Teléfono<input name="telefono" required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10 números" title="Ingresa exactamente 10 números" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10) }} className="rounded-lg border border-white/10 bg-[#161616] px-4 py-3.5 text-base normal-case tracking-normal text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" /></label>
              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65 sm:col-span-2">Correo electrónico<input name="email" required type="email" placeholder="tu@email.com" className="rounded-lg border border-white/10 bg-[#161616] px-4 py-3.5 text-base normal-case tracking-normal text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" /></label>
              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Contraseña<input name="password" required minLength={8} type="password" placeholder="Mínimo 8 caracteres" className="rounded-lg border border-white/10 bg-[#161616] px-4 py-3.5 text-base normal-case tracking-normal text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" /></label>
              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Confirmar contraseña<input name="confirmation" required minLength={8} type="password" placeholder="Repite tu contraseña" className="rounded-lg border border-white/10 bg-[#161616] px-4 py-3.5 text-base normal-case tracking-normal text-white outline-none transition placeholder:text-white/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" /></label>

              <button disabled={loading} className="group mt-2 flex items-center justify-center gap-3 rounded-lg bg-red-600 p-4 text-xs font-semibold tracking-[0.2em] text-white transition hover:bg-red-500 sm:col-span-2 disabled:opacity-70">
                {loading ? 'CREANDO…' : <>CREAR CUENTA <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></>}
              </button>

              {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-center text-sm text-red-200 sm:col-span-2">{error}</p>}
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">o</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button type="button" onClick={handleGoogleRegister} disabled={loading} aria-label="Registrarme con Google" title="Registrarme con Google" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white text-xl font-bold text-[#4285f4] shadow-[0_10px_25px_rgba(0,0,0,0.2)] transition hover:scale-105 hover:bg-slate-100 disabled:opacity-60">
              G
            </button>
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.16em] text-white/35">Registrarme con Google</p>
          </div>
        </section>
      </div>
    </main>
  )
}
