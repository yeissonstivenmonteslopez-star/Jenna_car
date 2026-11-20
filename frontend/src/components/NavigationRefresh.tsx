import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Reload after history traversal so session checks and server data run again.
export default function NavigationRefresh() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    const reload = () => window.location.reload()
    const handleTraversal = () => {
      if (window.location.pathname !== pathname || window.location.search !== search) reload()
    }
    const restore = (event: PageTransitionEvent) => { if (event.persisted) reload() }
    window.addEventListener('popstate', handleTraversal)
    window.addEventListener('pageshow', restore)
    return () => { window.removeEventListener('popstate', handleTraversal); window.removeEventListener('pageshow', restore) }
  }, [pathname, search])
  return null
}
