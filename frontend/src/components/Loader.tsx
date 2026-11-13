import { useSyncExternalStore } from 'react'

const desktopQuery = '(min-width: 768px)'

function subscribeToViewport(onChange: () => void) {
  const media = window.matchMedia(desktopQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function isDesktop() {
  return window.matchMedia(desktopQuery).matches
}

export default function Loader({ text }: { text?: string }) {
  const desktop = useSyncExternalStore(subscribeToViewport, isDesktop, () => false)
  if (!desktop) return null

  return (
    <div
      className="jenna-loader fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm dark:bg-neutral-950/90"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={text || 'Cargando aplicación'}
    >
      <div
        aria-label="Orange and tan hamster running in a metal wheel"
        role="img"
        className="wheel-and-hamster"
      >
        <div className="wheel" />
        <div className="hamster">
          <div className="hamster__body">
            <div className="hamster__head">
              <div className="hamster__ear" />
              <div className="hamster__eye" />
              <div className="hamster__nose" />
            </div>
            <div className="hamster__limb hamster__limb--fr" />
            <div className="hamster__limb hamster__limb--fl" />
            <div className="hamster__limb hamster__limb--br" />
            <div className="hamster__limb hamster__limb--bl" />
            <div className="hamster__tail" />
          </div>
        </div>
        <div className="spoke" />
      </div>
      {text && (
        <p className="mt-4 animate-pulse text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {text}
        </p>
      )}
    </div>
  )
}
