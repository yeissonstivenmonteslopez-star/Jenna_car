/** DTOs de la API Flask. Los alias cliente_id/name se conservan según sus serializadores. */
export type Role = 'admin' | 'usuario' | 'mecanico';
export type WorkState = 'pendiente' | 'en_proceso' | 'completado' | 'cancelado';
export type OrderState = 'pendiente' | 'en_diagnostico' | 'en_reparacion' | 'terminada' | 'entregada' | 'cancelada';
export type AppointmentState = 'pendiente' | 'confirmada' | 'atendida' | 'cancelada';
export interface User { id: number; nombre: string; apellido: string; email: string; telefono: string | null; documento?: string | null; rol: Role; estado: 'activo' | 'inactivo'; foto_perfil: string | null; }
export interface Session { token: string; user: User; }
export interface Vehicle { id: number; cliente_id: number; placa: string; marca: string; modelo: string; anio: number | null; color: string | null; kilometraje: number; tipo_combustible: 'gasolina' | 'diesel' | 'hibrido' | 'electrico' | 'gas'; estado: 'activo' | 'en_mantenimiento' | 'inactivo'; }
export interface Service { id: number; nombre: string; descripcion: string | null; precio: number; duracion_estimada: number | null; estado: 'activo' | 'inactivo'; }
export interface PublicService { id: number; name: string; description: string | null; price: number; duration_minutes: number | null; }
export interface Appointment { id: number; fecha: string; hora: string; estado: AppointmentState; motivo: string | null; observaciones: string | null; mecanico_id?: number | null; vehiculo?: Pick<Vehicle, 'id' | 'placa' | 'marca' | 'modelo'>; servicio?: { id: number; name: string }; }
export interface Diagnostic { id: number; cita_id: number; mecanico_id: number; descripcion: string; observaciones: string | null; solucion_recomendada: string | null; estado: Exclude<WorkState, 'cancelado'>; fecha_diagnostico: string; }
export interface Work { id: number; diagnostico_id: number; servicio_id: number; mecanico_id: number; orden_id: number | null; descripcion: string; estado: WorkState; fecha_inicio: string | null; fecha_fin: string | null; cantidad: number; precio: number; subtotal: number; }
export interface RepairImage { id: number; ruta: string; descripcion: string | null; }
export interface MechanicAppointment extends Omit<Appointment, 'servicio'> { cliente_nombre: string; placa: string; marca: string; modelo: string; servicio: string; }
export interface MechanicDetail extends Omit<Appointment, 'servicio'> { cliente: Pick<User, 'nombre' | 'apellido' | 'email'> | null; servicio: string | null; diagnosticos: Diagnostic[]; trabajos: Work[]; ordenes: Array<Pick<Order, 'id' | 'estado' | 'total'>>; imagenes: RepairImage[]; }
export interface MechanicDashboard { total_citas: number; pendientes: number; confirmadas: number; en_proceso: number; completados: number; ultimas_reparaciones: Work[]; }
export interface Order { id: number; cliente: Pick<User, 'id' | 'nombre' | 'apellido'>; vehiculo: Pick<Vehicle, 'id' | 'placa' | 'marca' | 'modelo'>; fecha_ingreso: string; fecha_entrega: string | null; kilometraje: number; problema_reportado: string; observaciones: string | null; estado: OrderState; subtotal: number; total: number; diagnostico: string | null; trabajo_realizado: string | null; }
export interface Receipt { id: number; orden_id: number; fecha_emision: string; estado: 'pendiente' | 'pagado' | 'anulado'; subtotal: number; descuento: number; total: number; vehiculo: Vehicle | null; }
export interface Payment { id: number; recibo_id: number; monto: number; metodo_pago: string; referencia: string | null; estado: 'completado' | 'pendiente' | 'anulado'; fecha_pago: string; simulacion: boolean; mensaje: string; url_redireccion?: string; }
export interface Notification { id: number; usuario_id: number; titulo: string; mensaje: string; tipo: string; leida: boolean; link: string | null; created_at: string; }
export interface RepairProgress { cita_id: number; fecha: string; estado: AppointmentState; diagnosticos: Diagnostic[]; trabajos: Work[]; }
