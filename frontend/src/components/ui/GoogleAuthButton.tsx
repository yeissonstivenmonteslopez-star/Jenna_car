import { useEffect, useRef, useState } from 'react'
import type { MouseEventHandler, ReactNode } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import type { CredentialResponse } from '@react-oauth/google'
import { cn } from '@/lib/utils'

type GoogleAuthButtonProps = {
  children?: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  variant?: 'dark' | 'light'
  className?: string
  onSuccess?: (response: CredentialResponse) => void
  onError?: () => void
}

export default function GoogleAuthButton({
  children = 'Continuar con Google', onClick, disabled = false, loading = false,
  fullWidth = true, variant = 'dark', className = '', onSuccess, onError,
}: GoogleAuthButtonProps) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(260)
  const blocked = disabled || loading
  const isGoogleFlow = Boolean(onSuccess)
  const classes = cn('flex min-h-11 min-w-0 max-w-full items-center justify-center gap-3 rounded-lg border text-sm font-bold uppercase tracking-wide transition-all duration-500 ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none',
    fullWidth ? 'w-full' : 'w-fit max-w-[320px]',
    variant === 'dark' ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-black/25 bg-white text-[#413f3f]',
    blocked ? 'cursor-not-allowed opacity-50' : cn('cursor-pointer hover:scale-[1.02] active:scale-[0.99] motion-reduce:hover:scale-100 motion-reduce:active:scale-100', variant === 'dark' ? 'hover:border-red-600/60 hover:bg-zinc-800' : 'hover:bg-zinc-50'), className)

  useEffect(() => {
    if (!isGoogleFlow || !container.current) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(200, Math.min(400, Math.floor(entry.contentRect.width))))
    })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [isGoogleFlow])

  // GIS owns this clickable surface: it supplies the verified ID credential
  // expected by the existing backend. Do not replace it with token-client OAuth
  // (access tokens), a hidden overlay, or a programmatic click.
  if (onSuccess) return <div ref={container}
    className={cn('relative mx-auto min-w-0 max-w-[400px] rounded-full transition-shadow duration-200 focus-within:ring-2 focus-within:ring-red-600 focus-within:ring-offset-4 focus-within:ring-offset-[#171717] motion-reduce:transition-none', fullWidth ? 'w-full' : 'w-[320px] max-w-full', blocked && 'cursor-wait opacity-60', className)}
    aria-busy={loading}>
    <fieldset disabled={blocked} aria-label="Continuar con Google" className={cn('m-0 flex min-h-10 w-full min-w-0 max-w-full justify-center overflow-hidden rounded-full border-0 p-0', blocked && 'pointer-events-none')} inert={blocked}>
      <GoogleLogin
        onSuccess={(response) => { if (!blocked) onSuccess(response) }}
        onError={() => { if (!blocked) onError?.() }}
        useOneTap={false} ux_mode="popup" use_fedcm_for_button={true}
        theme={variant === 'dark' ? 'filled_black' : 'outline'}
        size="large" text="continue_with" shape="pill"
        logo_alignment="left" width={width}
      />
    </fieldset>
  </div>

  return <button type="button" onClick={onClick} disabled={blocked || !onClick} aria-busy={loading}
    className={cn(classes, 'px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50', variant === 'dark' ? 'enabled:hover:border-red-600/60 enabled:hover:bg-zinc-800' : 'enabled:hover:bg-zinc-50')}>
    <svg viewBox="0 0 256 262" className="h-6 w-6 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M255.68 133.5c0-10.88-.88-18.82-2.79-27.05H130.55v49.1h71.83c-1.45 12.2-9.27 30.58-26.66 42.93l-.25 1.65 38.69 30 2.68.27c24.62-22.78 38.84-56.3 38.84-96.9Z" />
      <path fill="#34A853" d="M130.55 261.1c35.19 0 64.73-11.61 86.3-31.7l-41.13-31.92c-11 7.67-25.77 13.03-45.17 13.03-34.47 0-63.72-22.78-74.15-54.28l-1.53.13-40.23 31.2-.53 1.46c21.44 42.56 65.45 72.08 116.44 72.08Z" />
      <path fill="#FBBC05" d="M56.4 156.23a78.5 78.5 0 0 1-4.35-25.68c0-8.96 1.59-17.61 4.2-25.68l-.07-1.72-40.73-31.7-1.34.64A130.14 130.14 0 0 0 0 130.55c0 21 5.07 40.83 14.11 58.47l42.29-32.79Z" />
      <path fill="#EA4335" d="M130.55 50.59c24.48 0 40.98 10.57 50.4 19.4l36.78-35.84C195.14 13.14 165.74 0 130.55 0 79.56 0 35.55 29.52 14.11 72.09l42.14 32.78c10.57-31.5 39.82-54.28 74.3-54.28Z" />
    </svg>
    <span>{loading ? 'Conectando...' : children}</span>
  </button>
}
