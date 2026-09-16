# Jenna Car Mobile

Aplicación de autenticación hecha con Expo SDK 54 y JavaScript.

## Configuración

1. Copia `.env.example` como `.env` (o edita el `.env` existente).
2. Define `EXPO_PUBLIC_API_URL` con la URL base del backend Flask, incluyendo su puerto. En un dispositivo físico usa la IP LAN (por ejemplo, `http://192.168.1.10:5000`); en el emulador de Android usa `http://10.0.2.2:5000`. Nunca uses `localhost` en un dispositivo físico.
3. Ejecuta `npm install` y luego `npm start` para abrir el proyecto con Expo Go.

## API utilizada

- `POST /api/auth/login`: `{ email, password }` → `{ token, user }`
- `POST /api/auth/register`: `{ nombre, apellido, telefono, email, password }` → `{ token, user }`
- `POST /api/auth/google`: `{ id_token }` → `{ token, user }`
- `POST /api/auth/password-reset/request`: `{ email }` → envía un código al correo
- `POST /api/auth/password-reset/confirm`: `{ email, code, password }`

El token de sesión se guarda con `expo-secure-store` bajo la llave `jenna_car_auth_token`. Si el token existe al iniciar la app, se salta directamente a la pantalla de inicio.

## Conexión con el backend

La URL se lee de `EXPO_PUBLIC_API_URL` en `.env`. El backend debe estar corriendo en `0.0.0.0:5000` (así lo hace `python run.py`) y alcanzable desde el mismo Wi‑Fi en el caso de un teléfono físico.
