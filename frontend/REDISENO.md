# Interfaces internas

El diseño está limitado al contenedor `.workspace-ui`, presente únicamente en
las rutas internas. `index.css`, Home y las pantallas de autenticación no se
modificaron. La única excepción pública es la apariencia del enlace de inicio
de sesión de Home, que conserva su destino y comportamiento.

## Sistema visual

- Fondo #F5F5F5, superficies blancas, bordes #E5E5E5, navegación #111111.
- Acento #C62828, hover #991B1B. Colores de estado discretos con texto explícito.
- Tipografía Inter cuando está instalada, con Segoe UI y Arial como alternativas
  locales; sin dependencias nuevas ni descargas de fuentes.
- Formularios claros, radios discretos, tablas espaciadas, foco visible y modales
  claros con fondo superpuesto oscuro.

El componente `InternalWorkspace` unifica la presentación de perfil, citas,
seguimiento, recibos, notificaciones y panel de mecánico. El adaptador CSS
reutiliza los componentes actuales sin reescribir sus formularios ni lógica.

## Administración

Menú lateral agrupado y contraíble, versión compacta en móvil y enlaces con
nombres accesibles incluso cuando solo se ven los iconos. Incluye únicamente
los módulos que ya tienen rutas. Los pagos permanecen en su pestaña existente
de actividad; no se inventaron rutas de reportes, diagnósticos o configuración.

El dashboard muestra cuatro métricas disponibles en la respuesta existente:
citas pendientes, órdenes en reparación, recibos pendientes e ingresos totales.
No se agregó una cifra de citas confirmadas porque ese agregado no está en el
contrato actual. Se conservan las pestañas de actividad y sus datos reales.

## Verificación

Compilación Vite, TypeScript y ESLint en los componentes editados. Las pruebas
de navegador revisan el menú lateral, navegación, ancho móvil, aislamiento de
rutas públicas y los flujos existentes de reserva, seguimiento y pago simulado.
Sus respuestas API son fixtures; no insertan datos ni acceden a MySQL.

Con Vite iniciado y Playwright disponible, desde la raíz:

```sh
node frontend/tests/redesign.browser.mjs
node frontend/tests/improvements.browser.mjs
```

Se puede configurar `TEST_ORIGIN`, `BROWSER_EXECUTABLE` y `PLAYWRIGHT_MODULE`
para usar el navegador y la instalación de Playwright disponibles. Las capturas
de revisión se guardan en carpetas `.test-tmp-*`, excluidas de Git.

## Apariencia y perfil personal

El boton flotante permite elegir modo claro u oscuro en todas las paginas
internas. La preferencia se conserva en `jenna_car_theme` del navegador;
Home y las pantallas de acceso mantienen su apariencia.

El perfil incluye portada, foto editable, resumen de la cuenta y pestanas de
actividad, vehiculos y datos personales. Las citas y carros se consultan con
los servicios existentes. Las cifras muestran un guion durante la carga o si
falla la consulta. No hay publicaciones, seguidores ni actividad inventada.

## Perfil minimalista y guardado

Se retiraron la portada, las pestanas internas y el menu horizontal del perfil.
Los accesos repetidos a citas y agendamiento se consolidaron en una sola accion.
Editar perfil abre el formulario; Volver a mi perfil regresa a las citas y carros.

Los datos y la foto se guardan con los endpoints existentes, con estados de
carga, errores del servidor y bloqueo de envios simultaneos. La imagen se
actualiza al recibir confirmacion del servidor. La informacion de sesion se
sincroniza con el encabezado. Una prueba MySQL con cuenta QA verifico datos,
archivo de foto y recuperacion desde una solicitud nueva.

El registro muestra una pantalla de carga solo durante su solicitud; no agrega
temporizadores ni retrasos. `profile-registration.browser.mjs` verifica carga,
redireccion, edicion, foto y persistencia al recargar con respuestas simuladas.

## Simplificacion de las pantallas internas

- Administracion de citas: una sola agenda y un editor de estado por fila;
  se elimino la lista adicional de pendientes con acciones duplicadas.
- Se retiraron retornos al dashboard, al perfil o a inicio cuando el menu o
  el logo ya proporcionan ese destino, y el enlace repetido de busqueda.
- El dashboard mantiene cuatro indicadores y la actividad; su panel lateral
  redundante se consolido en un breve resumen contextual.
- Agendamiento sin insignia repetida ni instrucciones decorativas de proceso.
- Imprimir, ver y descargar siguen disponibles bajo Documento en cada recibo.
- Cancelar edicion identifica claramente el reinicio de los formularios de
  servicios, vehiculos y ordenes; solo aparece mientras se edita.

No se retiran acciones distintas por pertenecer a registros diferentes: editar,
eliminar, asignar mecanico, aprobacion de cotizacion y controles de notificaciones
se conservan. `minimal-internal.browser.mjs` recorre las pantallas y comprueba
cambios de estado, cancelacion de edicion, documentos y ancho movil con fixtures.
Home, login, registro, autenticacion y backend no se modificaron en esta limpieza.

## Formato numerico y horarios

Los importes usan separadores colombianos: COP $1.250.000 y COP $1.250.000,50
cuando hay centavos. El mismo formato se utiliza en PDF, vistas de trabajo y
nuevas notificaciones. Los importes almacenados y las operaciones no cambian.
El kilometraje mostrado tambien agrupa los miles; los campos de entrada siguen
trabajando con numeros sin formato para no alterar las validaciones.

El selector de horas agrupa manana/tarde, distingue seleccion y cupos ocupados,
informa disponibilidad y permite reintentar errores. El servidor sigue decidiendo
los cupos. El boton de tema se situa en el encabezado para no tapar controles.
El frontend combina Tailwind CSS 4 con CSS propio limitado a interfaces internas.

## Correcciones y organizacion

El formulario de vehiculos se separo en `VehicleEditor.tsx` con tipos propios.
La busqueda tiene resultados tipados. Servicios y vehiculos ya no cargan dos
veces al montar ni sobrescriben la lista con respuestas de filtros anteriores.
El administrador conserva su URL al recargar. La revision completa de ESLint,
TypeScript y compilacion pasa sin errores; se validaron los flujos del navegador.

## Modulos de presentacion separados

Agendamiento separa `BookingVehicleFields`, `BookingSummary`, `bookingTypes`
y `bookingPresentation`. Servicios conserva validacion y persistencia en la
pagina y delega su formulario a `ServiceEditor`. Dashboard delega actividad
a `DashboardActivity` y comparte tipos mediante `dashboardTypes`.

La galeria del mecanico se separo en `MechanicPhotoGallery`: centraliza la
carga autenticada y la liberacion de URLs temporales. Se retiraron dos efectos
identicos de la pagina que repetian la carga de fotos. React StrictMode puede
seguir repitiendo el montaje en desarrollo; eso no se deshabilito.

Las rutas y funciones permanecen iguales. Los componentes se separaron por
responsabilidad, sin imponer un limite artificial de lineas a todos los archivos.

## Pantalla de carga

`components/Loader.tsx` contiene el hamster con la estructura y el CSS facilitados,
sin styled-components ni dependencias nuevas. Las reglas originales del hamster
se agregan al final de `src/index.css`. Unas reglas adicionales respetan el tema
claro/oscuro del area interna y la preferencia de movimiento reducido.

`App.tsx` carga el modulo de rutas con React.lazy y muestra el loader mediante
Suspense durante esa carga real. Registro reutiliza el componente mientras espera
la respuesta del servidor (tambien en el registro con Google). No hay temporizadores
ni duracion minima. La animacion desaparece al terminar o fallar la solicitud.
Por indicacion del usuario, el loader solo se muestra desde 768 px; en moviles
no se monta el overlay y registro mantiene su boton deshabilitado con CREANDO….
El componente responde tambien a los cambios de ancho mientras esta cargando.

`tests/loader.browser.mjs` comprueba la carga diferida, el tema guardado frente al
tema del sistema, su exclusion en moviles, movimiento reducido y errores de registro.
