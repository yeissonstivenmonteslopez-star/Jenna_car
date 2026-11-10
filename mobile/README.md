# Jenna Car Mobile

Expo SDK 57.0.32, React Native 0.86.3, React 19.2.3 y TypeScript estricto. React Navigation separa los navegadores por rol y Zustand administra la sesión. No se modificó el esquema de la BD.

## Instalar y ejecutar

Con Node compatible con Expo 57 (se verificó con Node 24):

```powershell
cd mobile
npm ci
Copy-Item .env.example .env
npm run typecheck
npm start
```

Configura EXPO_PUBLIC_API_URL con la IP LAN y puerto del backend Flask. En Android emulado puedes usar http://10.0.2.2:5000. En un teléfono físico no uses localhost. Ejecuta el backend siguiendo backend/README.md. No ejecutes migraciones sin revisar antes la versión de tu BD.

```powershell
npm run android
npm run ios
```

iOS requiere macOS para compilar localmente. Usa Expo Go compatible con SDK 57 o un development build. Google necesita los client IDs de .env.example y la configuración nativa correspondiente. Los pagos usan la configuración del servidor y solo el webhook verificado confirma pagos reales.

## Organización

- App.tsx: proveedores y arranque.
- src/app/: rutas tipadas y navegadores protegidos por rol.
- src/api/: transporte HTTP y servicios tipados.
- src/features/auth/: login, registro, recuperación, Google y sesión Zustand.
- src/features/mechanic/: jornada, agenda, diagnóstico, trabajos, fotos e historial.
- src/features/admin/: catálogo de formularios y listas de recursos, con permisos.
- src/features/common/: perfil, ajustes, notificaciones, pagos, recibos y progreso.
- src/components/: controles accesibles y estados de carga/vacío/error.
- src/theme/: tema claro/oscuro/sistema persistido.
- src/types/: contratos reales de la API.
- src/hooks/: carga de recursos con protección frente a respuestas obsoletas.
- src/services/: almacenamiento seguro del token.

Consulta MODELO_Y_NAVEGACION.md para tablas, campos, relaciones, permisos, supuestos y cambios sugeridos. Las listas/formularios compartidos renderizan solo los campos declarados por recurso; no generan entidades nuevas.

## Verificación manual pendiente

Login con cada rol; cierre y expiración de sesión; rechazo de rutas ajenas; creación de vehículo y cita; asignación administrativa; diagnóstico y trabajo; actualización de estado; foto; notificaciones; checkout y retorno; temas claro/oscuro; lector de pantalla y teclado. Se requiere servidor y datos de prueba para validar estos recorridos completos.
