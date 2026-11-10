import { useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { data, request } from '../../api/http';
import { api } from '../../api/resources';
import { Button, Card, Choices, Copy, ErrorText, Input, Page, label } from '../../components/ui';
import ResourceState from '../../components/ResourceState';
import useResource from '../../hooks/useResource';
import { useAuth } from '../auth/store';
import { resources } from './resources';
import type { AppRoutes } from '../../app/routes';
import type { PublicService, User, Vehicle } from '../../types/models';

type Row = Record<string, unknown> & { id: number };
const display = (value: unknown): string => {
  if (value == null) return '—';
  if (typeof value === 'object') return Object.entries(value).filter(([key]) => !['id', 'usuario_id', 'google_id'].includes(key)).map(([key, item]) => `${label(key)}: ${display(item)}`).join(' · ');
  return String(value);
};
export function ResourceListScreen({ route, navigation }: NativeStackScreenProps<AppRoutes, 'Recurso'>) {
  const spec = resources[route.params.resource]; const role = useAuth(s => s.user?.rol);
  const allowed = !!spec && !!role && spec.roles.includes(role);
  const resource = useResource(() => allowed ? data<Row[]>(spec.list) : Promise.reject(new Error('No tienes acceso a esta pantalla.')));
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('todos'); const [error, setError] = useState(''); const [busy, setBusy] = useState<number>();
  useFocusEffect(useCallback(() => { void resource.reload(); }, [resource.reload]));
  if (!allowed) return <Page title="Acceso restringido"><Copy>Esta pantalla no está disponible para tu rol.</Copy></Page>;
  const states = [...new Set(resource.value?.map(item => item.estado).filter((item): item is string => typeof item === 'string'))];
  const items = resource.value?.filter(item => (filter === 'todos' || item.estado === filter) && display(item).toLowerCase().includes(search.toLowerCase()));
  async function mutate(id: number, action: () => Promise<unknown>) { setBusy(id); setError(''); try { await action(); await resource.reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); } }
  return <Page title={spec.title}>{spec.create && <Button title="Agregar nuevo" onPress={() => navigation.navigate('Formulario', { resource: route.params.resource })} />}<Input label="Buscar" value={search} onChangeText={setSearch} />{!!states.length && <Choices values={['todos', ...states]} value={filter} onChange={setFilter} />}{error && <ErrorText message={error} />}<ResourceState {...resource} empty={!items?.length} reload={resource.reload}>{items?.map(item => <Card key={item.id}><Copy large>{String(item.placa || item.nombre || item.titulo || `#${item.id}`)}</Copy>{Object.entries(item).filter(([key]) => !['id', 'password', 'google_id', 'foto_perfil'].includes(key)).map(([key, value]) => <Copy key={key}>{label(key)}: {display(value)}</Copy>)}{spec.update && <Button secondary title="Editar" onPress={() => navigation.navigate('Formulario', { resource: route.params.resource, id: item.id, initial: item })} />}{route.params.resource === 'usuarios' && <Choices values={['usuario', 'mecanico', 'admin']} value={String(item.rol)} onChange={rol => Alert.alert('Cambiar rol', `¿Asignar el rol ${rol} a ${String(item.nombre)}?`, [{ text: 'Cancelar' }, { text: 'Cambiar', onPress: () => void mutate(item.id, () => request(`/api/admin/usuarios/${item.id}/rol`, 'PUT', { rol })) }])} />}{route.params.resource === 'vehiculos' && <Button secondary title="Historial y progreso" onPress={() => navigation.navigate('Progreso', { id: item.id })} />}{route.params.resource === 'citas' && ['pendiente', 'confirmada'].includes(String(item.estado)) && <Button title="Cancelar cita" busy={busy === item.id} onPress={() => Alert.alert('Cancelar cita', '¿Deseas cancelar esta cita?', [{ text: 'Volver' }, { text: 'Cancelar cita', style: 'destructive', onPress: () => void mutate(item.id, () => api.cancelAppointment(item.id)) }])} />}{spec.remove && <Button secondary title="Eliminar o desactivar" busy={busy === item.id} onPress={() => Alert.alert('Eliminar registro', 'Los registros relacionados pueden impedir su eliminación o provocar su desactivación.', [{ text: 'Volver' }, { text: 'Continuar', style: 'destructive', onPress: () => void mutate(item.id, () => request(spec.remove!(item.id), 'DELETE')) }])} />}</Card>)}</ResourceState></Page>;
}
export function ResourceFormScreen({ route, navigation }: NativeStackScreenProps<AppRoutes, 'Formulario'>) {
  const { resource: key, id, initial } = route.params; const spec = resources[key]; const role = useAuth(s => s.user?.rol);
  const allowed = !!spec && !!role && spec.roles.includes(role) && (id ? !!spec.update : !!spec.create);
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(spec?.fields.map(field => [field.key, String(initial?.[field.key] ?? (field.key === 'cliente_id' ? (initial?.cliente as { id?: number })?.id : field.key === 'vehiculo_id' ? (initial?.vehiculo as { id?: number })?.id : field.key === 'servicio_id' ? (initial?.servicio as { id?: number })?.id : undefined) ?? field.values?.[0] ?? (field.numeric && field.min === 0 ? 0 : ''))]) ?? []));
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const refs = useResource(async () => {
    if (!allowed) return { users: [] as User[], vehicles: [] as Vehicle[], services: [] as PublicService[] };
    const needs = (name: string) => spec.fields.some(field => field.key === name);
    const [users, vehicles, services] = await Promise.all([role === 'admin' && (needs('cliente_id') || needs('mecanico_id') || needs('usuario_id')) ? data<User[]>('/api/admin/usuarios') : Promise.resolve([]), needs('vehiculo_id') ? data<Vehicle[]>(role === 'admin' ? '/api/admin/vehiculos' : '/api/vehiculos') : Promise.resolve([]), needs('servicio_id') ? api.services() : Promise.resolve([])]);
    return { users, vehicles, services };
  });
  if (!allowed) return <Page title="Acceso restringido" />;
  async function submit() {
    if (!spec) return;
    setError(''); const payload: Record<string, unknown> = {};
    for (const field of spec.fields) {
      const value = (form[field.key] || '').trim();
      if (field.required && !value) return setError(`${field.label} es obligatorio.`);
      if (!value) { if (id) payload[field.key] = null; continue; }
      if (field.max && value.length > field.max) return setError(`${field.label}: máximo ${field.max} caracteres.`);
      if (field.numeric && (!Number.isFinite(Number(value)) || (field.integer && !Number.isInteger(Number(value))) || Number(value) < (field.min ?? 0) || Number(value) > (field.integer ? 4294967295 : 99999999.99) || (!field.integer && !/^\d+(\.\d{1,2})?$/.test(value)))) return setError(`${field.label}: valor numérico inválido.`);
      if (field.values && !field.values.includes(value)) return setError(`${field.label}: opción inválida.`);
      payload[field.key] = field.numeric ? Number(value) : value;
    }
    if (payload.placa && !/^[A-Z]{3}\d{3}$/.test(String(payload.placa).toUpperCase())) return setError('La placa debe tener 3 letras y 3 números.');
    if (payload.placa) payload.placa = String(payload.placa).toUpperCase();
    if (payload.anio && Number(payload.anio) > 2100) return setError('El año debe estar entre 1900 y 2100.');
    if (payload.fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.fecha)) || Number.isNaN(Date.parse(String(payload.fecha))) || new Date(`${String(payload.fecha)}T23:59:59`) < new Date())) return setError('Selecciona una fecha válida que no esté en el pasado.');
    if (payload.hora && (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(payload.hora)) || String(payload.hora).slice(0, 5) > '19:00')) return setError('La hora debe ser válida y hasta las 19:00.');
    if (payload.fecha_entrega && Number.isNaN(Date.parse(String(payload.fecha_entrega)))) return setError('La fecha de entrega no es válida.');
    setBusy(true);
    try { await request(id ? spec.update!(id) : spec.create!, id ? 'PUT' : 'POST', payload); navigation.goBack(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Page title={`${id ? 'Editar' : 'Crear'} · ${spec.title}`}><ResourceState {...refs} reload={refs.reload}>{spec.fields.map(field => {
    const options = field.key === 'vehiculo_id' ? refs.value?.vehicles.map(item => ({ id: item.id, title: `${item.placa} · ${item.marca}` })) : field.key === 'servicio_id' ? refs.value?.services.map(item => ({ id: item.id, title: item.name })) : ['cliente_id', 'usuario_id', 'mecanico_id'].includes(field.key) ? refs.value?.users.filter(item => field.key !== 'mecanico_id' || item.rol === 'mecanico').map(item => ({ id: item.id, title: `${item.nombre} ${item.apellido} (${item.rol})` })) : undefined;
    return <Card key={field.key}>{field.values ? <><Copy>{field.label}</Copy><Choices values={field.values} value={form[field.key] || ''} onChange={value => setForm(current => ({ ...current, [field.key]: value }))} /></> : options ? <><Copy>{field.label}</Copy>{!options.length && <Copy muted>No hay opciones disponibles.</Copy>}{!field.required && <Button secondary title="Sin asignar" onPress={() => setForm(current => ({ ...current, [field.key]: '' }))} />}{options.map(option => <Button secondary key={option.id} title={`${Number(form[field.key]) === option.id ? '✓ ' : ''}${option.title}`} onPress={() => setForm(current => ({ ...current, [field.key]: String(option.id) }))} />)}</> : <Input label={`${field.label}${field.required ? ' *' : ''}`} value={form[field.key] || ''} onChangeText={value => setForm(current => ({ ...current, [field.key]: value }))} maxLength={field.max} keyboardType={field.numeric ? 'decimal-pad' : 'default'} multiline={!field.numeric && !['fecha', 'hora', 'fecha_entrega', 'placa'].includes(field.key)} />}</Card>;
  })}{error && <ErrorText message={error} />}<Button title="Guardar" busy={busy} onPress={() => void submit()} /></ResourceState></Page>;
}
