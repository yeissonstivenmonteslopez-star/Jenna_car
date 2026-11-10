import type { Role } from '../../types/models';
export interface FieldSpec { key: string; label: string; required?: boolean; max?: number; numeric?: boolean; integer?: boolean; min?: number; values?: readonly string[]; }
export interface ResourceSpec { title: string; list: string; create?: string; update?: (id: number) => string; remove?: (id: number) => string; roles: Role[]; fields: FieldSpec[]; }
const vehicle: FieldSpec[] = [
  { key: 'placa', label: 'Placa (ABC123)', required: true, max: 20 }, { key: 'marca', label: 'Marca', required: true, max: 100 }, { key: 'modelo', label: 'Modelo', required: true, max: 100 },
  { key: 'anio', label: 'Año', numeric: true, integer: true, min: 1900 }, { key: 'color', label: 'Color', max: 50 }, { key: 'kilometraje', label: 'Kilometraje', required: true, numeric: true, integer: true, min: 0 },
  { key: 'tipo_combustible', label: 'Combustible', values: ['gasolina', 'diesel', 'hibrido', 'electrico', 'gas'], required: true },
  { key: 'estado', label: 'Estado', values: ['activo', 'en_mantenimiento', 'inactivo'], required: true },
];
const appointment: FieldSpec[] = [
  { key: 'vehiculo_id', label: 'Vehículo', numeric: true, integer: true, min: 1, required: true }, { key: 'servicio_id', label: 'Servicio', numeric: true, integer: true, min: 1, required: true },
  { key: 'fecha', label: 'Fecha (AAAA-MM-DD)', required: true }, { key: 'hora', label: 'Hora (HH:MM, hasta las 19:00)', required: true }, { key: 'motivo', label: 'Falla o motivo' }, { key: 'observaciones', label: 'Observaciones' },
];
export const resources: Record<string, ResourceSpec> = {
  vehiculos: { title: 'Mis vehículos', list: '/api/vehiculos', create: '/api/vehiculos', roles: ['usuario'], fields: vehicle },
  citas: { title: 'Mis citas', list: '/api/citas/mis-citas', create: '/api/citas', roles: ['usuario'], fields: appointment },
  usuarios: { title: 'Usuarios y roles', list: '/api/admin/usuarios', roles: ['admin'], fields: [] },
  clientes: { title: 'Clientes', list: '/api/clientes', roles: ['admin'], fields: [] },
  adminVehiculos: { title: 'Vehículos del taller', list: '/api/admin/vehiculos', create: '/api/admin/vehiculos', update: id => `/api/admin/vehiculos/${id}`, remove: id => `/api/admin/vehiculos/${id}`, roles: ['admin'], fields: [{ key: 'cliente_id', label: 'Cliente', numeric: true, integer: true, min: 1, required: true }, ...vehicle] },
  adminCitas: { title: 'Citas del taller', list: '/api/admin/citas', create: '/api/admin/citas', update: id => `/api/admin/citas/${id}`, remove: id => `/api/admin/citas/${id}`, roles: ['admin'], fields: [...appointment, { key: 'mecanico_id', label: 'Mecánico asignado', numeric: true, integer: true, min: 1 }, { key: 'estado', label: 'Estado', values: ['pendiente', 'confirmada', 'atendida', 'cancelada'], required: true }] },
  servicios: { title: 'Catálogo de servicios', list: '/api/admin/servicios', create: '/api/admin/servicios', update: id => `/api/admin/servicios/${id}`, remove: id => `/api/admin/servicios/${id}`, roles: ['admin'], fields: [{ key: 'nombre', label: 'Nombre', required: true, max: 100 }, { key: 'descripcion', label: 'Descripción' }, { key: 'precio', label: 'Precio (COP)', numeric: true, required: true, min: 0 }, { key: 'duracion_estimada', label: 'Duración (minutos)', numeric: true, integer: true, required: true, min: 0 }, { key: 'estado', label: 'Estado', values: ['activo', 'inactivo'], required: true }] },
  ordenes: { title: 'Órdenes de trabajo', list: '/api/admin/ordenes', create: '/api/admin/ordenes', update: id => `/api/admin/ordenes/${id}`, roles: ['admin'], fields: [{ key: 'cliente_id', label: 'Cliente', numeric: true, integer: true, min: 1, required: true }, { key: 'vehiculo_id', label: 'Vehículo', numeric: true, integer: true, min: 1, required: true }, { key: 'problema_reportado', label: 'Falla reportada', required: true }, { key: 'observaciones', label: 'Observaciones' }, { key: 'kilometraje', label: 'Kilometraje', numeric: true, integer: true, required: true, min: 0 }, { key: 'estado', label: 'Estado', required: true, values: ['pendiente', 'en_diagnostico', 'en_reparacion', 'terminada', 'entregada', 'cancelada'] }, { key: 'fecha_entrega', label: 'Entrega (AAAA-MM-DDTHH:MM)' }] },
  adminPagos: { title: 'Pagos del taller', list: '/api/admin/pagos', roles: ['admin'], fields: [] },
  adminNotificaciones: { title: 'Notificaciones del taller', list: '/api/admin/notificaciones', create: '/api/notificaciones/admin', roles: ['admin'], fields: [{ key: 'usuario_id', label: 'Destinatario', numeric: true, integer: true, min: 1, required: true }, { key: 'titulo', label: 'Título', required: true, max: 150 }, { key: 'mensaje', label: 'Mensaje', required: true }, { key: 'tipo', label: 'Tipo', required: true, values: ['estado_vehiculo', 'diagnostico', 'reparacion_necesaria', 'reparacion_en_proceso', 'reparacion_finalizada', 'vehiculo_listo', 'observacion', 'info_general', 'cita', 'pago', 'sistema'] }] },
};
