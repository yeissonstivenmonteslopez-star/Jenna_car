import {
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

export default function AdminNav() {
  return (
    <nav className="border-b border-red-900/30 bg-black/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <a href="/" className="font-serif text-lg tracking-[0.18em] text-white">
          JENNA <span className="text-red-500">CAR</span>
        </a>

        <div className="flex flex-wrap items-center gap-1">
          {sections.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-red-950/40 text-red-300'
                    : 'text-white/55 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={13} />
              {label}
            </NavLink>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 self-start rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-red-500/50 hover:text-red-300 lg:self-auto"
        >
          <LogOut size={13} />
          Salir
        </button>
      </div>
    </nav>
  )
}