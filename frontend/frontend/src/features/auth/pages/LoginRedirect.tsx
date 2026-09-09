// Legacy redirect — compatibilidad histórica: la ruta /login fue consolidada en /sign-in.
// Este componente preserva enlaces antiguos (emails, bookmarks) redirigiendo a /sign-in.
// NOTA: App.tsx ya define <Route path="/login" element={<Navigate to="/sign-in" replace />} /> como redirect canónico;
// este archivo se conserva solo como documentación/compatibilidad si alguna importación lo referencia.
// Puede eliminarse una vez se verifique que no hay referencias externas.
import { Navigate } from 'react-router-dom'

export default function LoginRedirect() {
  return <Navigate to="/sign-in" replace />
}
