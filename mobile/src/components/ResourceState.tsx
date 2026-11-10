import type { PropsWithChildren } from 'react';
import { Button, Card, Copy, ErrorText, Loading } from './ui';
export default function ResourceState({ loading, error, empty, reload, children }: PropsWithChildren<{ loading: boolean; error: string; empty?: boolean; reload: () => void }>) {
  if (loading) return <Loading />;
  if (error) return <Card><ErrorText message={error} /><Button title="Reintentar" onPress={reload} /></Card>;
  if (empty) return <Card><Copy muted>No hay registros para mostrar.</Copy><Button secondary title="Actualizar" onPress={reload} /></Card>;
  return <>{children}<Button secondary title="Actualizar" onPress={reload} /></>;
}
