import { data, request } from './http';
import type { Appointment, Diagnostic, MechanicAppointment, MechanicDashboard, MechanicDetail, Notification, Order, Payment, PublicService, Receipt, RepairProgress, User, Vehicle, Work, WorkState } from '../types/models';

export const api = {
  me: () => request<{ user: User }>('/api/auth/me'),
  profile: (body: Pick<User, 'nombre' | 'apellido' | 'telefono'>) => request<{ user: User }>('/api/usuarios/perfil', 'PUT', body),
  vehicles: () => data<Vehicle[]>('/api/vehiculos'),
  services: () => data<PublicService[]>('/api/services'),
  appointments: () => data<Appointment[]>('/api/citas/mis-citas'),
  cancelAppointment: (id: number) => data<Appointment>(`/api/citas/${id}/cancelar`, 'POST'),
  receipts: () => data<Receipt[]>('/api/recibos/mis-recibos'),
  payments: () => data<Payment[]>('/api/pagos/mis-pagos'),
  paymentConfig: () => data<{ simulacion: boolean }>('/api/pagos/config'),
  pay: (recibo_id: number) => data<Payment>('/api/pagos', 'POST', { recibo_id }),
  notifications: (page = 1) => request<{ data: Notification[]; total_pages: number }>(`/api/notificaciones?page=${page}&per_page=30`),
  readNotification: (id: number) => request(`/api/notificaciones/${id}/leer`, 'PATCH'),
  readAll: () => request('/api/notificaciones/marcar-todas-leidas', 'PATCH'),
  mechanicDashboard: () => data<MechanicDashboard>('/api/mechanic/dashboard'),
  mechanicAppointments: () => data<MechanicAppointment[]>('/api/mechanic/appointments'),
  mechanicDetail: (id: number) => data<MechanicDetail>(`/api/mechanic/appointments/${id}`),
  works: () => data<Work[]>('/api/mechanic/works/history'),
  workState: (id: number, estado: WorkState) => data<Work>(`/api/mechanic/works/${id}/status`, 'PUT', { estado }),
  diagnostic: (body: Pick<Diagnostic, 'cita_id' | 'descripcion' | 'observaciones' | 'solucion_recomendada' | 'estado'>) => data<Diagnostic>('/api/mechanic/diagnostics', 'POST', body),
  work: (body: Pick<Work, 'diagnostico_id' | 'servicio_id' | 'descripcion' | 'cantidad' | 'precio'>) => data<Work>('/api/mechanic/works', 'POST', body),
  progress: (id: number) => data<RepairProgress[]>(`/api/mechanic/client/repairs/${id}/progress`),
  mechanicOrders: () => data<Order[]>('/api/mechanic/orders'),
};
