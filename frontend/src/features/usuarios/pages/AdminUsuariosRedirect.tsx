// Legacy redirect — compatibilidad histórica: la ruta /admin/usuarios fue renombrada a /admin/users.
// Este componente existe solo para no romper bookmarks/enlaces antiguos; redirige permanentemente a la ruta canónica.
// Mantener mientras haya referencias externas; puede eliminarse cuando no se necesite retrocompatibilidad.
import { Navigate } from 'react-router-dom'

export default function AdminUsuariosAlias() {
  return <Navigate to="/admin/users" replace />
}
