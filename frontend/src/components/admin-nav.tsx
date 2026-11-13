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

const sections = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/citas', label: 'Citas', icon: CalendarDays },
  { to: '/admin/orders', label: 'Órdenes', icon: ClipboardList },
  { to: '/admin/servicios', label: 'Servicios', icon: Wrench },
  { to: '/admin/vehiculos', label: 'Vehículos', icon: Car },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/notificaciones', label: 'Notificaciones', icon: Bell },
  { to: '/admin/search', label: 'Búsqueda', icon: Search },
]

function handleSignOut() {
  localStorage.removeItem('jenna_car_token')
  localStorage.removeItem('jenna_car_user')
  window.location.href = '/'
}

export default function AdminNav({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return <aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
    <div className="admin-sidebar-brand"><a href="/" aria-label="Jenna Car, inicio"><span className="brand-monogram">J<span>C</span></span><span className="sidebar-label">JENNA<span className="brand-red">CAR</span><small>ADMINISTRACIÓN</small></span></a></div>
    <button type="button" onClick={onToggle} className="sidebar-toggle" aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'} aria-expanded={!collapsed} aria-controls="admin-navigation">{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span className="sidebar-label">Contraer menú</span></button>
    <nav aria-label="Administración" id="admin-navigation">{[
      { label: 'General', links: sections.slice(0, 1) },
      { label: 'Operaciones', links: sections.slice(1, 5) },
      { label: 'Administración', links: sections.slice(5) },
    ].map((group) => <div key={group.label} className="sidebar-group"><p className="sidebar-label">{group.label}</p>{group.links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} title={label} aria-label={label} className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}><Icon size={18} /><span className="sidebar-label">{label}</span></NavLink>)}</div>)}</nav>
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
