'use client'

import { useEffect, useState } from 'react'
import { getApiUrl } from '@/lib/config'

const apiUrl = getApiUrl('')

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    function verifyAuth() {
      const token = localStorage.getItem('jenna_car_token') || ''
      if (!token) {
        setAuthorized(false)
        window.location.replace('/sign-in')
        return
      }

      fetch(`${apiUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async (response) => {
          if (!response.ok) throw new Error()
          return response.json()
        })
        .then((data) => {
          if (data.user?.rol !== 'admin') {
            setAuthorized(false)
            window.location.replace('/')
            return
          }
          setAuthorized(true)
        })
        .catch(() => {
          localStorage.removeItem('jenna_car_token')
          localStorage.removeItem('jenna_car_user')
          setAuthorized(false)
          window.location.replace('/sign-in')
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
  }, [])

  if (!authorized) return <main className="min-h-screen bg-black p-12 text-white">Verificando acceso...</main>

  return children
}
