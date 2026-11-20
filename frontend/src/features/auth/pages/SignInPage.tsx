import { useFleetEnabled } from '@/features/convenios/useFleetEnabled'
import FleetLogin from '@/features/convenios/FleetLogin'
import { fleetKey } from '@/features/convenios/fleetApi'
import CompanyLogo from '@/components/CompanyLogo'
import '../auth-design.css'
import KeycapAlert from '@/components/ui/KeycapAlert'
import { Suspense, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Eye, EyeOff } from 'lucide-react'
import { googleAuth, login } from '@/features/auth/services/authService'
import GoogleAuthButton from '@/components/ui/GoogleAuthButton'
import { getGoogleClientId } from '@/services/apiClient'

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-primary text-primary-foreground" /> }>
      <SignInContent />
    </Suspense>
  )
}

function SignInContent() {
  const fleetEnabled = useFleetEnabled()
  const [modoConvenio, setModoConvenio] = useState(false)
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const googleClientId = getGoogleClientId()

  async function handleGoogleCallback(response: { credential?: string }) {
    if (loading) return
    if (!response.credential) return
    setError('')
    setLoading(true)
    try {
      const data = await googleAuth(response.credential)
      localStorage.removeItem(fleetKey)
      localStorage.setItem('jenna_car_token', data.token)
      localStorage.setItem('jenna_car_user', JSON.stringify(data.user))
      const defaultRoute = fleetEnabled && data.user?.empresa_id ? '/convenio/agendar' : data.user?.rol === 'mecanico' ? '/mechanic' : data.user?.rol === 'admin' ? '/admin/dashboard' : '/'
      const redirectTarget = searchParams.get('redirect') || defaultRoute
      window.location.href = redirectTarget
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible iniciar sesión con Google.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      const data = await login({ email: String(form.get('email')), password: String(form.get('password')) })
      localStorage.removeItem(fleetKey)
      localStorage.setItem('jenna_car_token', data.token)
      localStorage.setItem('jenna_car_user', JSON.stringify(data.user))
      const defaultRoute = fleetEnabled && data.user?.empresa_id ? '/convenio/agendar' : data.user?.rol === 'mecanico' ? '/mechanic' : data.user?.rol === 'admin' ? '/admin/dashboard' : '/'
      const redirectTarget = searchParams.get('redirect') || defaultRoute
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
    <main className="auth-page min-h-screen bg-primary text-primary-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">

        {/* ── Panel izquierdo (hero) ── */}
        <section className="auth-hero relative hidden overflow-hidden lg:block">
          <img
            src="/jenna-car-hero.png"
            alt="Vehículo premium en Jenna Car"
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/45 to-primary/20" />
          <div className="relative flex h-full flex-col justify-end p-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Área cliente</p>
              <h1 className="mt-4 font-serif text-6xl">
                Todo tu cuidado<br />
                <em className="text-accent">en un lugar.</em>
              </h1>
            </div>
          </div>
        </section>

        {/* ── Panel derecho (formulario) ── */}
        <section className="auth-panel flex min-h-screen min-w-0 flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
          <a href="/" className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-primary-foreground/55">
            <ArrowLeft size={15} /> Volver al inicio
          </a>

          <div className="auth-content mx-auto w-full max-w-md py-16">
            <div className="auth-intro mb-10">
              <a href="/" className="auth-form-brand" aria-label="Jenna Car, inicio"><CompanyLogo variant="dark" /></a>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-accent">Área cliente</p>
              <h2 className="auth-heading mt-4 font-serif text-5xl">Bienvenido de nuevo.</h2>
              <p className="auth-description">Tus citas, tu vehículo y tus servicios, en un solo lugar.</p>
            </div>

            {fleetEnabled && modoConvenio ? <FleetLogin back={() => setModoConvenio(false)} /> : <>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <label className="grid gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground/65">
                Email
                <input
                  name="email"
                  required
                  type="email"
                  className="w-full rounded-lg border border-primary-foreground/15 bg-field px-4 py-4 text-base normal-case tracking-normal outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground/65">
                Contraseña
                <span className="relative">
                  <input
                    name="password"
                    required
                    minLength={8}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-primary-foreground/15 bg-field px-4 py-4 pr-12 text-base normal-case tracking-normal outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-primary-foreground/55 transition hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
              <div className="text-right text-sm">
                <a href="/forgot-password" className="text-accent hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-3 flex items-center justify-center gap-3 bg-accent px-5 py-4 text-base font-semibold tracking-[0.2em] text-accent-foreground disabled:opacity-60"
              >
                {loading ? 'ENTRANDO…' : <><span>ENTRAR</span> <ArrowUpRight size={15} /></>}
              </button>
              {error && (
                <KeycapAlert type={'error'} message={error} />
              )}
            </form>

            {googleClientId ? (
              <>
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-primary-foreground/10" />
                  <span className="shrink-0 text-xs text-primary-foreground/50">O continúa con</span>
                  <div className="h-px flex-1 bg-primary-foreground/10" />
                </div>

                <GoogleAuthButton onSuccess={handleGoogleCallback} onError={() => setError('Falló el inicio de sesión con Google')} loading={loading} fullWidth variant="light" />
              </>
            ) : (
              <p className="text-center text-sm text-primary-foreground/45">Inicio con Google no configurado.</p>
            )}

            <p className="mt-10 text-center text-sm text-primary-foreground/45">
              ¿No tienes una cuenta?{' '}
              <a href={registerHref} className="text-accent hover:underline">
                Registrarme
              </a>
            </p>
            {fleetEnabled && <div className="mt-6 flex justify-center border-t border-neutral-600 pt-5">
              <button type="button" onClick={() => setModoConvenio(true)}
                className="btn-cta-pill text-zinc-900 hover:text-white dark:text-white">
                <span>Ingresar con Código de Convenio / Flotas</span>
                <svg width="15" height="10" viewBox="0 0 13 10" aria-hidden="true">
                  <path d="M1,5 L11,5" /><polyline points="8 1 12 5 8 9" />
                </svg>
              </button>
            </div>}
            </>}
          </div>

          <p className="text-sm uppercase tracking-[0.16em] text-primary-foreground/30">
            © 2026 Jenna Car Studio
          </p>
        </section>
      </div>
    </main>
  )
}
