import { useEffect, useState } from 'react'
import { fleetRequest } from './fleetApi'

export function useFleetEnabled() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    let mounted = true
    fleetRequest<{activo: boolean}>('convenios/disponibilidad-portal')
      .then(data => { if (mounted) setEnabled(data.activo === true) })
      .catch(() => { if (mounted) setEnabled(false) })
    return () => { mounted = false }
  }, [])
  return enabled
}
