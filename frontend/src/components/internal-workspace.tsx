import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell, CalendarDays, CarFront, ReceiptText, UserRound, Wrench } from 'lucide-react'
import './internal-workspace.css'
import NotificationBell from './notification-bell'
import CompanyLogo from './CompanyLogo'

const clientLinks = [
  { to: '/profile', label: 'Mi perfil', icon: UserRound, onboarding: 'profile' },
  { to: '/mis-citas', label: 'Mis citas', icon: CalendarDays, onboarding: 'appointments' },
  { to: '/citas', label: 'Agendar cita', icon: CarFront, onboarding: 'schedule' },
  { to: '/mis-reparaciones', label: 'Seguimiento', icon: Wrench, onboarding: 'repairs' },
  { to: '/mis-recibos', label: 'Recibos y pagos', icon: ReceiptText, onboarding: 'receipts' },
  { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
]
export default function InternalWorkspace({ children, role }: { children: ReactNode; role?: string }) {
  const { pathname } = useLocation()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('jenna_car_theme') === 'dark' ? 'dark' : 'light' } catch { return 'light' }
  })
  useEffect(() => { try { localStorage.setItem('jenna_car_theme', theme) } catch { /* Preference remains available for this session. */ } }, [theme])
  return <div className="workspace-ui" data-theme={theme}>
    <label className="theme-switch workspace-theme-toggle" title={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}>
      <input type="checkbox" role="switch" aria-label="Modo oscuro" checked={theme === 'dark'} onChange={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} />
      <div className="theme-slider" aria-hidden="true">
        <div className="sun-moon">
          {[1, 2, 3].map((number) => <i key={number} className={`moon-dot moon-dot-${number}`} />)}
          {[1, 2, 3].map((number) => <i key={number} className={`light-ray light-ray-${number}`} />)}
        </div>
        {[1, 2, 3, 4, 5, 6].map((number) => <i key={number} className={`${number < 4 ? 'cloud-light' : 'cloud-dark'} cloud-${number}`} />)}
        <div className="stars">{[1, 2, 3, 4].map((number) => <svg key={number} className={`star star-${number}`} viewBox="0 0 16 16"><path d="M8 0 10 6 16 8 10 10 8 16 6 10 0 8 6 6Z" fill="currentColor" /></svg>)}</div>
      </div>
    </label>
    {!pathname.startsWith('/admin') && <header className="workspace-header">
      <div className="workspace-header-top"><a href="/" className="workspace-brand" aria-label="Jenna Car, inicio"><CompanyLogo /></a><div className="workspace-header-notifications"><NotificationBell /></div></div>
      <nav aria-label="Mi cuenta" className="workspace-account-nav">
        {(role === 'mecanico' ? [{ to: '/mechanic', label: 'Mi taller', icon: Wrench }, clientLinks[0], clientLinks[5]] : clientLinks).map(({ to, label, icon: Icon, onboarding }) => <NavLink key={to} to={to} data-onboarding={onboarding} className={({ isActive }) => isActive ? 'is-active' : ''}><Icon size={16} />{label}</NavLink>)}
      </nav>
    </header>}
    {children}
  </div>
}
