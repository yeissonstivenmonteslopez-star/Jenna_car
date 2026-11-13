import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell, CalendarDays, CarFront, ReceiptText, UserRound, Wrench, Sun, Moon } from 'lucide-react'
import './internal-workspace.css'

const clientLinks = [
  { to: '/profile', label: 'Mi perfil', icon: UserRound },
  { to: '/mis-citas', label: 'Mis citas', icon: CalendarDays },
  { to: '/citas', label: 'Agendar cita', icon: CarFront },
  { to: '/mis-reparaciones', label: 'Seguimiento', icon: Wrench },
  { to: '/mis-recibos', label: 'Recibos y pagos', icon: ReceiptText },
  { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
]
export default function InternalWorkspace({ children, role }: { children: ReactNode; role?: string }) {
  const { pathname } = useLocation()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('jenna_car_theme') === 'dark' ? 'dark' : 'light' } catch { return 'light' }
  })
  useEffect(() => { try { localStorage.setItem('jenna_car_theme', theme) } catch { /* Preference remains available for this session. */ } }, [theme])
  return <div className="workspace-ui" data-theme={theme}>
    <button type="button" className="workspace-theme-toggle" aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} aria-pressed={theme === 'dark'} onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}<span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span></button>
    {!pathname.startsWith('/admin') && <header className="workspace-header">
      <div className="workspace-header-top"><a href="/" className="workspace-brand">JENNA<span>CAR</span><small>SERVICIO AUTOMOTRIZ</small></a></div>
      {pathname !== '/profile' && <nav aria-label="Mi cuenta" className="workspace-account-nav">
        {(role === 'mecanico' ? [{ to: '/mechanic', label: 'Mi taller', icon: Wrench }, clientLinks[0], clientLinks[5]] : clientLinks).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : ''}><Icon size={16} />{label}</NavLink>)}
      </nav>}
    </header>}
    {children}
  </div>
}
