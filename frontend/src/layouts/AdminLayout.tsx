
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getMe } from '@/features/auth/services/authService'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (location.pathname !== '/') {
      window.history.replaceState(window.history.state, '', '/')
    }
  }, [location.pathname])

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

  return <Outlet />
}
