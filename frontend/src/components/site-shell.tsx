// TODO: futura integración con servicios de Google
// La lógica de notificaciones está separada de cualquier integración externa de Google.


import { useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { buildAssetUrl } from '@/services/apiClient'
import NotificationBell from './notification-bell'

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const [user, setUser] = useState<{ nombre: string; foto_perfil?: string; rol?: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const authRoutes = ['/sign-in', '/login', '/register', '/forgot-password', '/reset-password']
  const shouldShowAuthButton = mounted && !user && !authRoutes.includes(pathname || '/')
  const shouldShowUserMenu = mounted && user && pathname === '/'

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('jenna_car_user') || 'null')) } catch { setUser(null) }
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function signOut() {
    localStorage.removeItem('jenna_car_token')
    localStorage.removeItem('jenna_car_user')
    setUser(null)
    setMenuOpen(false)
    window.location.href = '/sign-in'
  }

  const avatar = buildAssetUrl(user?.foto_perfil)

  return (
    <>
      {shouldShowUserMenu ? (
        <div className="fixed top-4 right-20 z-40 flex items-center gap-3">
          <NotificationBell />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-red-500/30 bg-[#121212]/90 p-1.5 shadow-lg shadow-black/20 transition hover:border-red-400/60"
              aria-label="Abrir menú de usuario"
            >
              {avatar ? (
                <img src={avatar} alt="Foto de perfil" className="h-10 w-10 rounded-full object-cover border border-white/10" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white">
                  {user.nombre.charAt(0).toUpperCase()}
                </span>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-red-500/20 bg-[#141414] text-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="border-b border-red-500/20 px-4 py-3">
                  <p className="truncate text-xs uppercase tracking-[0.18em] text-white/50">Cuenta</p>
                  <p className="mt-2 truncate font-medium text-white">{user.nombre}</p>
                </div>

                <div className="p-2">
                  <a href="/profile" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-white/80 transition hover:bg-red-500/10 hover:text-white">Mi perfil</a>
                  <a href="/mis-citas" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-white/80 transition hover:bg-red-500/10 hover:text-white">Ver mis citas</a>
                  {user.rol === 'admin' && <a href="/admin/dashboard" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-white/80 transition hover:bg-red-500/10 hover:text-white">Panel administrativo</a>}
                  {user.rol === 'admin' && <a href="/admin/notificaciones" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-white/80 transition hover:bg-red-500/10 hover:text-white">Notificaciones</a>}
                  <button type="button" onClick={signOut} className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-red-300 transition hover:bg-red-500/10 hover:text-red-200">Cerrar sesión</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : shouldShowAuthButton ? (
        <div className="absolute right-8 top-7 z-40">
          <a
            href="/sign-in"
            className="inline-flex items-center justify-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/85 transition-colors duration-200 hover:text-red-400"
          >
            INICIAR SESIÓN
          </a>
        </div>
      ) : null}
      {children}
    </>
  )
}
