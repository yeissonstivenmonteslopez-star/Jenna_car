'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, LockKeyhole } from 'lucide-react'
import { getApiUrl, getGoogleClientId } from '@/lib/config'

const apiUrl = getApiUrl('')
const googleClientId = getGoogleClientId()

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential?: string }) => void; auto_select?: boolean }) => void
          prompt: (
            notification?: (notification: {
              isNotDisplayed: () => boolean
              getNotDisplayedReason: () => string
              isSkippedMoment: () => boolean
              getSkippedReason: () => string
            }) => void
          ) => void
        }
      }
    }
  }
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-primary text-primary-foreground" /> }>
      <SignInContent />
    </Suspense>
  )
}

function SignInContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogleCallback(response: { credential?: string }) {
    if (!response.credential) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No fue posible iniciar sesión con Google.')
      localStorage.setItem('jenna_car_token', data.token)
      localStorage.setItem('jenna_car_user', JSON.stringify(data.user))
      const redirectTarget = searchParams.get('redirect') || '/'
      window.location.href = redirectTarget
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible iniciar sesión con Google.')
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
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCallback,
            auto_select: false,
          })
        } catch {
          // ignore initialization failure
        }
      }
    }
    document.body.appendChild(script)
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [googleClientId])

  function handleGoogleLogin() {
    if (!googleClientId) {
      setError('El inicio de sesión con Google no está configurado (falta NEXT_PUBLIC_GOOGLE_CLIENT_ID).')
      return
    }

    if (window.google?.accounts.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            const reason = notification.getNotDisplayedReason() || notification.getSkippedReason()
            if (reason === 'unregistered_origin') {
              setError(`El origen actual (${window.location.origin}) no está autorizado en Google Cloud Console para este Client ID. Agrega ${window.location.origin} en Orígenes de JavaScript autorizados.`)
            } else if (reason === 'opt_out_or_no_session') {
              setError('No hay sesión de Google activa o la ventana fue cerrada.')
            }
          }
        })
      } catch {
        setError('No fue posible abrir el diálogo de Google. Comprueba la configuración de origen.')
      }
    } else {
      setError('El servicio de Google aún se está cargando. Inténtalo de nuevo.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No fue posible iniciar sesión.')
      localStorage.setItem('jenna_car_token', data.token)
      localStorage.setItem('jenna_car_user', JSON.stringify(data.user))
      const redirectTarget = searchParams.get('redirect') || '/'
      window.location.href = redirectTarget
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  const redirectTarget = searchParams.get('redirect') || '/'
  const registerHref = redirectTarget === '/' ? '/register' : `/register?redirect=${encodeURIComponent(redirectTarget)}`

  return (
    <main className="min-h-screen bg-primary text-primary-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">

        {/* ── Panel izquierdo (hero) ── */}
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src="/jenna-car-hero.png"
            alt="Vehículo premium en Jenna Car"
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/45 to-primary/20" />
          <div className="relative flex h-full flex-col justify-between p-16">
            <a href="/" className="font-serif text-xl tracking-[0.18em]">
              JENNA <span className="text-accent">CAR</span>
            </a>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Área cliente</p>
              <h1 className="mt-4 font-serif text-6xl">
                Todo tu cuidado<br />
                <em className="text-accent">en un lugar.</em>
              </h1>
            </div>
          </div>
        </section>

        {/* ── Panel derecho (formulario) ── */}
        <section className="flex min-h-screen flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
          <a href="/" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary-foreground/55">
            <ArrowLeft size={15} /> Volver al inicio
          </a>

          <div className="mx-auto w-full max-w-md py-16">
            <div className="mb-10">
              <div className="mb-6 flex h-11 w-11 items-center justify-center border border-primary-foreground/15 text-accent">
                <LockKeyhole size={18} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Área cliente</p>
              <h2 className="mt-4 font-serif text-5xl">Bienvenido de nuevo.</h2>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5">
              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/65">
                Email
                <input
                  name="email"
                  required
                  type="email"
                  className="border border-primary-foreground/15 bg-field px-4 py-4 text-sm normal-case tracking-normal"
                />
              </label>
              <label className="grid gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/65">
                Contraseña
                <input
                  name="password"
                  required
                  minLength={8}
                  type="password"
                  className="border border-primary-foreground/15 bg-field px-4 py-4 text-sm normal-case tracking-normal"
                />
              </label>
              <div className="text-right text-xs">
                <a href="/forgot-password" className="text-accent hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <button
                disabled={loading}
                className="mt-3 flex items-center justify-center gap-3 bg-accent px-5 py-4 text-[10px] font-semibold tracking-[0.2em] text-accent-foreground disabled:opacity-60"
              >
                {loading ? 'ENTRANDO…' : <><span>ENTRAR</span> <ArrowUpRight size={15} /></>}
              </button>
              {error && (
                <p role="alert" className="border border-red-300/30 bg-red-950/30 p-3 text-center text-xs">
                  {error}
                </p>
              )}
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-primary-foreground/10" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/35">o</span>
              <div className="h-px flex-1 bg-primary-foreground/10" />
            </div>

            <div className="flex w-full justify-center">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:bg-slate-100 hover:shadow-[0_14px_35px_rgba(0,0,0,0.25)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuar con Google
              </button>
            </div>

            <p className="mt-10 text-center text-xs text-primary-foreground/45">
              ¿No tienes una cuenta?{' '}
              <a href={registerHref} className="text-accent hover:underline">
                Registrarme
              </a>
            </p>
          </div>

          <p className="text-[10px] uppercase tracking-[0.16em] text-primary-foreground/30">
            © 2026 Jenna Car Studio
          </p>
        </section>
      </div>
    </main>
  )
}
