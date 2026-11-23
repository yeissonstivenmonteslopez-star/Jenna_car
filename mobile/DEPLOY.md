# Compilación móvil

La app usa https://jenna-car-1-x2xn.onrender.com como API HTTPS. Render accede a Aiven con las credenciales del servidor.

Desde esta carpeta, inicia sesión en tu cuenta Expo con `npx eas-cli login` y vincula el proyecto con `npx eas-cli init`. Conserva el identificador que genera Expo en app.json.

Para generar un APK instalable ejecuta `npx eas-cli build --platform android --profile preview`. Para Google Play ejecuta `npx eas-cli build --platform android --profile production`.

El identificador de Android es `com.jennacar.mobile`. El de iOS es `com.jennacar.mobile`. Verifica que pertenezcan a tu aplicación antes de la primera publicación.

El acceso con Google requiere clientes OAuth propios para Android e iOS. Configura EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID y EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID en el entorno de compilación de EAS. Para Android registra el paquete y la huella SHA-1 de la firma de EAS en Google. Añade los IDs válidos a GOOGLE_CLIENT_IDS en Render. El inicio mediante correo y contraseña usa los usuarios existentes de Aiven.

Los pagos abren Mercado Pago y regresan a la web configurada en Render. Al volver a la app, sus datos se actualizan para consultar el resultado confirmado por el servidor.

Antes de distribuir, prueba en un dispositivo el acceso, los permisos de cámara, las fotos y un recibo autorizado. La exportación JavaScript de Android y la comprobación de tipos no sustituyen una compilación nativa firmada.
