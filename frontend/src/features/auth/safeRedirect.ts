const destinations = new Set([
  '/', '/citas', '/mis-citas', '/mis-recibos', '/mis-reparaciones', '/notificaciones',
  '/profile', '/mechanic', '/admin', '/admin/dashboard', '/admin/citas',
  '/admin/notificaciones', '/admin/orders', '/admin/search', '/admin/servicios',
  '/admin/users', '/admin/usuarios', '/admin/vehiculos',
])

export function safeRedirect(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin === window.location.origin && destinations.has(url.pathname)) {
      return url.pathname + url.search + url.hash
    }
  } catch {
    // Invalid destinations use the signed-in user's default page.
  }
  return fallback
}
