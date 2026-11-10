import { useCallback, useEffect, useState } from 'react';
import { Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../api/resources';
import { API_URL, request } from '../../api/http';
import useResource from '../../hooks/useResource';
import { Button, Card, Copy, ErrorText, Input, Page, label, money } from '../../components/ui';
import ResourceState from '../../components/ResourceState';
import type { AppRoutes } from '../../app/routes';
import { loadToken } from '../../services/session';

export function MechanicDetailScreen({ route }: NativeStackScreenProps<AppRoutes, 'CitaMecanico'>) {
  const [token, setToken] = useState<string | null>(null);
  const resource = useResource(() => api.mechanicDetail(route.params.id));
  const services = useResource(api.services);
  const [diagnosis, setDiagnosis] = useState('');
  const [observations, setObservations] = useState('');
  const [solution, setSolution] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('0');
  const [workDescription, setWorkDescription] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void loadToken().then(setToken); }, []);
  useFocusEffect(useCallback(() => { void resource.reload(); }, [resource.reload]));

  const availableOrders = resource.value?.ordenes || [];
  const orderId = selectedOrderId || (availableOrders.length === 1 ? String(availableOrders[0]?.id ?? '') : '');

  async function run(action: () => Promise<unknown>) {
    setError('');
    setBusy(true);
    try {
      await action();
      await resource.reload();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function photo(workId: number) {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.65 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 4 * 1024 * 1024) throw new Error('Selecciona una foto menor de 4 MB.');
    const body = new FormData();
    body.append('descripcion', 'Evidencia de reparación');
    body.append('file', { uri: asset.uri, name: asset.fileName || 'reparacion.jpg', type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
    await request(`/api/mechanic/works/${workId}/images`, 'POST', body);
  }

  function submitWork() {
    const diagnostic = resource.value?.diagnosticos[0];
    if (!diagnostic || !orderId || !serviceId || !workDescription.trim() || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || !Number.isFinite(Number(price)) || Number(price) < 0 || !/^\d+(\.\d{1,2})?$/.test(price)) {
      setError('Selecciona orden y servicio, e ingresa descripción, cantidad y precio válidos.');
      return;
    }
    void run(() => api.work({
      diagnostico_id: diagnostic.id,
      orden_id: Number(orderId),
      servicio_id: Number(serviceId),
      descripcion: workDescription.trim(),
      cantidad: Number(quantity),
      precio: Number(price),
    }));
  }

  return (
    <Page title={`Cita #${route.params.id}`} subtitle="Detalle técnico e historial">
      {error && <ErrorText message={error} />}
      <ResourceState {...resource} reload={resource.reload}>
        {resource.value && <>
          <Card>
            <Copy large>{resource.value.vehiculo?.placa}</Copy>
            <Copy>{resource.value.vehiculo?.marca} {resource.value.vehiculo?.modelo}</Copy>
            <Copy>{resource.value.cliente?.nombre} {resource.value.cliente?.apellido}</Copy>
            <Copy muted>{resource.value.fecha} · {resource.value.hora} · {label(resource.value.estado)}</Copy>
            <Copy>{resource.value.motivo || 'Sin falla reportada'}</Copy>
            <Copy muted>{resource.value.observaciones || 'Sin observaciones de la cita'}</Copy>
          </Card>

          {resource.value.diagnosticos.map(item => (
            <Card key={item.id}>
              <Copy large>Diagnóstico #{item.id}</Copy>
              <Copy>{item.descripcion}</Copy>
              <Copy muted>{item.observaciones || 'Sin observaciones'}</Copy>
              <Copy>{item.solucion_recomendada}</Copy>
            </Card>
          ))}

          {!resource.value.diagnosticos.length && (
            <Card>
              <Copy large>Registrar diagnóstico</Copy>
              <Input label="Descripción obligatoria" value={diagnosis} onChangeText={setDiagnosis} multiline />
              <Input label="Observaciones de revisión" value={observations} onChangeText={setObservations} multiline />
              <Input label="Solución recomendada" value={solution} onChangeText={setSolution} multiline />
              <Button title="Guardar diagnóstico" busy={busy} onPress={() => {
                if (!diagnosis.trim()) return setError('Describe el diagnóstico.');
                void run(() => api.diagnostic({ cita_id: route.params.id, descripcion: diagnosis.trim(), observaciones: observations, solucion_recomendada: solution, estado: 'pendiente' }));
              }} />
            </Card>
          )}

          {!!resource.value.diagnosticos.length && <>
            <Card>
              <Copy large>Orden para facturar</Copy>
              {availableOrders.length ? availableOrders.map(order => (
                <Button
                  key={order.id}
                  secondary={orderId !== String(order.id)}
                  title={`${orderId === String(order.id) ? '✓ ' : ''}Orden #${order.id} · ${money(order.total)}`}
                  onPress={() => setSelectedOrderId(String(order.id))}
                />
              )) : <Copy muted>No hay una orden activa con recibo pendiente para este vehículo. Solicita crearla desde administración.</Copy>}
            </Card>

            <Card>
              <Copy large>Agregar servicio realizado</Copy>
              <ResourceState {...services} empty={!services.value?.length} reload={services.reload}>
                {services.value?.map(item => (
                  <Button
                    key={item.id}
                    secondary={Number(serviceId) !== item.id}
                    title={`${Number(serviceId) === item.id ? '✓ ' : ''}${item.name} · ${money(item.price)}`}
                    onPress={() => { setServiceId(String(item.id)); setPrice(String(item.price)); }}
                  />
                ))}
              </ResourceState>
              <Input label="Descripción del trabajo" value={workDescription} onChangeText={setWorkDescription} multiline />
              <Input label="Cantidad" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
              <Input label="Precio unitario (COP)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
              <Copy>Total: {money(Number(quantity) * Number(price))}</Copy>
              <Button title="Guardar trabajo y actualizar cobro" busy={busy} disabled={!orderId || !services.value?.length} onPress={submitWork} />
            </Card>
          </>}

          {resource.value.trabajos.map(item => (
            <Card key={item.id}>
              <Copy large>Trabajo #{item.id}</Copy>
              <Copy>{item.descripcion}</Copy>
              <Copy muted>{label(item.estado)} · {money(item.subtotal)}</Copy>
              <Button secondary title="Agregar foto de reparación" busy={busy} onPress={() => void run(() => photo(item.id))} />
            </Card>
          ))}

          {resource.value.imagenes.map(item => (
            <Card key={item.id}>
              <Image accessibilityLabel={item.descripcion || 'Evidencia de reparación'} source={{ uri: `${API_URL}/api/mechanic/images/${item.id}`, headers: { Authorization: `Bearer ${token || ''}` } }} style={{ width: '100%', height: 200 }} />
              <Copy>{item.descripcion}</Copy>
            </Card>
          ))}
        </>}
      </ResourceState>
    </Page>
  );
}
