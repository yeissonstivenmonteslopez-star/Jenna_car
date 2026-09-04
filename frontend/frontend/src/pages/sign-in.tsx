
import { FormEvent, Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, LockKeyhole } from 'lucide-react'
import { getApiUrl, getGoogleClientId } from '@/lib/config'

const apiUrl = getApiUrl('')
const googleClientId = getGoogleClientId()

declare global {
  interface Window {
  __jennaGoogleInitializedFor?: string
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential?: string }) => void; auto_select?: boolean }) => void
          renderButton: (element: HTMLElement, options: { type: string; theme: string; size: string; text: string; shape: string; width: number }) => void
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
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)

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
    const initializeGoogle = () => {
      if (window.google?.accounts.id) {
        if (window.__jennaGoogleInitializedFor === googleClientId) return
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCallback,
            auto_select: false,
            use_fedcm_for_prompt: false,
            itp_support: true,
          })
          window.__jennaGoogleInitializedFor = googleClientId
          if (googleButtonRef.current) {
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              width: 360,
            })
          }
        } catch {
          setError('No fue posible inicializar el inicio de sesión con Google.')
        }
      }
    }
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-jenna-google-sdk]')
    if (existingScript) {
      if (window.google?.accounts.id) initializeGoogle()
      else existingScript.addEventListener('load', initializeGoogle, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.jennaGoogleSdk = 'true'
    script.addEventListener('load', initializeGoogle, { once: true })
    document.body.appendChild(script)
  }, [googleClientId])

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

            <div ref={googleButtonRef} className="flex min-h-10 w-full justify-center" aria-label="Continuar con Google" />

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
