# Jenna Car Mobile

Aplicación de autenticación hecha con Expo SDK 54 y JavaScript.

## Configuración

1. Copia `.env.example` como `.env`.
2. Define `EXPO_PUBLIC_API_URL` con la URL base del backend Flask, incluyendo su puerto (por ejemplo, `http://192.168.1.10:5000`). En un dispositivo físico no uses `localhost`.
3. Ejecuta `npm start` y abre el proyecto con Expo Go.

## API utilizada

- `POST /api/auth/login`: `{ email, password }`
- `POST /api/auth/register`: `{ nombre, apellido, email, password }`

La respuesta de ambas rutas contiene `token` y `user`; el token se guarda con `expo-secure-store`.

El backend actual no incluye rutas de recuperación, verificación o restablecimiento de contraseña. Por ello la pantalla correspondiente informa esta limitación en lugar de inventar una petición que no funcionaría.
