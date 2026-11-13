import { useEffect } from 'react'

// Reload after history traversal so session checks and server data run again.
export default function NavigationRefresh() {
  useEffect(() => {
    const reload = () => window.location.reload()
    const restore = (event: PageTransitionEvent) => { if (event.persisted) reload() }
    window.addEventListener('popstate', reload)
    window.addEventListener('pageshow', restore)
    return () => { window.removeEventListener('popstate', reload); window.removeEventListener('pageshow', restore) }
  }, [])
  return null
}
