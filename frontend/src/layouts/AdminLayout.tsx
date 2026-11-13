
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AdminNav from '@/components/admin-nav'
import { getMe } from '@/features/auth/services/authService'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [authorized, setAuthorized] = useState(false)
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 767px)').matches)


  useEffect(() => {
    function verifyAuth() {
      const token = localStorage.getItem('jenna_car_token') || ''
      if (!token) {
        setAuthorized(false)
        navigate('/sign-in')
        return
      }

      getMe(token)
        .then((data) => {
          if (data.user?.rol !== 'admin') {
            setAuthorized(false)
            navigate('/')
            return
          }
          setAuthorized(true)
        })
        .catch(() => {
          localStorage.removeItem('jenna_car_token')
          localStorage.removeItem('jenna_car_user')
          setAuthorized(false)
          navigate('/sign-in')
        })
    }

    verifyAuth()

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || !localStorage.getItem('jenna_car_token')) {
        verifyAuth()
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [navigate])

  if (!authorized) return <main className="min-h-screen bg-black p-12 text-white">Verificando acceso...</main>

  return (
    <div className={`admin-workspace ${collapsed ? 'sidebar-is-collapsed' : ''}`}>
      <a className="workspace-skip" href="#admin-content">Ir al contenido</a>
      <AdminNav collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <div className="admin-content" id="admin-content">
        <header className="admin-topbar">
          <span>Administración / <strong>{({ dashboard: 'Dashboard', citas: 'Citas', orders: 'Órdenes de trabajo', servicios: 'Servicios', vehiculos: 'Vehículos', users: 'Usuarios', notificaciones: 'Notificaciones', search: 'Búsqueda' } as Record<string, string>)[location.pathname.split('/').pop() || ''] || 'Panel'}</strong></span>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
