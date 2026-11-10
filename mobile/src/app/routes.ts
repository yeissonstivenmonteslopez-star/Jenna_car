export type AuthRoutes = { Login: undefined; Registro: undefined; Recuperar: undefined };
export type AppRoutes = {
  Inicio: undefined; Mecanico: undefined; Agenda: undefined; CitaMecanico: { id: number }; Trabajos: undefined; Historial: undefined; OrdenesMecanico: undefined;
  Vehiculos: undefined; Progreso: { id: number }; Citas: undefined; Recibos: undefined; Pagos: undefined;
  Administracion: undefined; Recurso: { resource: string }; Formulario: { resource: string; id?: number; initial?: Record<string, unknown> };
  Notificaciones: undefined; Perfil: undefined; Ajustes: undefined; Ayuda: undefined;
};
