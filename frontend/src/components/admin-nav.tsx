import {
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  Bell,
  CalendarDays,
  Car,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Search,
  Users,
  Wrench,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import CompanyLogo from './CompanyLogo'

const sections = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, onboarding: 'dashboard' },
  { to: '/admin/citas', label: 'Citas', icon: CalendarDays, onboarding: 'admin-appointments' },
  { to: '/admin/orders', label: 'Órdenes', icon: ClipboardList, onboarding: 'admin-orders' },
  { to: '/admin/servicios', label: 'Servicios', icon: Wrench, onboarding: 'admin-services' },
  { to: '/admin/vehiculos', label: 'Vehículos', icon: Car, onboarding: 'admin-vehicles' },
  { to: '/admin/users', label: 'Usuarios', icon: Users, onboarding: 'admin-users' },
  { to: '/admin/notificaciones', label: 'Notificaciones', icon: Bell, onboarding: 'admin-notifications' },
  { to: '/admin/search', label: 'Búsqueda', icon: Search, onboarding: 'admin-search' },
]

function handleSignOut() {
  localStorage.removeItem('jenna_car_token')
  localStorage.removeItem('jenna_car_user')
  window.location.href = '/'
}

export default function AdminNav({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return <aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
    <div className="admin-sidebar-brand"><a href="/" aria-label="Jenna Car, inicio"><CompanyLogo variant="dark" className="admin-company-logo" /><small className="sidebar-label">ADMINISTRACIÓN</small></a></div>
    <button type="button" onClick={onToggle} className="sidebar-toggle" aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'} aria-expanded={!collapsed} aria-controls="admin-navigation">{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span className="sidebar-label">Contraer menú</span></button>
    <nav aria-label="Administración" id="admin-navigation">{[
      { label: 'General', links: sections.slice(0, 1) },
      { label: 'Operaciones', links: sections.slice(1, 5) },
      { label: 'Administración', links: sections.slice(5) },
    ].map((group) => <div key={group.label} className="sidebar-group"><p className="sidebar-label">{group.label}</p>{group.links.map(({ to, label, icon: Icon, onboarding }) => <NavLink key={to} to={to} data-onboarding={onboarding} title={label} aria-label={label} className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}><Icon size={18} /><span className="sidebar-label">{label}</span></NavLink>)}</div>)}</nav>
    <div className="sidebar-footer">
      <span className="sidebar-label">Espacio de administración</span>
      <a
        href="/"
        className="sidebar-link mt-2 text-white/80 hover:text-white"
        style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}
        title="Volver a la página principal de Jenna Car"
        aria-label="Volver a la página principal"
      >
        <ArrowLeft size={17} className="text-red-400" />
        <span className="sidebar-label font-medium">Volver a la web</span>
      </a>
      <button type="button" onClick={handleSignOut} aria-label="Cerrar sesión">
        <LogOut size={16} />
        <span className="sidebar-label">Cerrar sesión</span>
      </button>
    </div>
  </aside>
}
