# Proyecto Final DW — SIGCA

Sistema Integral de Gestión de Citas y Atención, una aplicación web académica orientada a la administración de un centro de atención psicológica y estimulación auditiva verbal.

## Estado actual

- Estructura separada de frontend y backend.
- API Express, conexión MongoDB y ruta de salud.
- Vue, Vite, Vue Router y Pinia.
- Inicio, página de información y página 404.
- Nombre, logo, presentación de inicio, misión y visión editables desde administración.
- Carrusel de cinco a diez imágenes, con edición y orden configurables.
- Horario semanal configurable con días abiertos y cerrados.
- Publicaciones educativas con fecha de publicación e imagen o enlace opcionales.
- Actividades corporativas por tipo y galería de imágenes.
- Datos públicos de contacto editables, formulario de mensajes y bandeja administrativa.
- Catálogo público de servicios activos con imagen, descripción, duración y precio.
- Administración de servicios: registro, edición, búsqueda, filtros y cambio de estado.
- Precio en centavos enteros y eliminación lógica mediante estado INACTIVO.

- Solicitudes de cita desde el portal, bandeja administrativa, rechazo y conversión en cita.
- Citas: programación con reglas de agenda, confirmación, reprogramación, cancelación, completado, historial por paciente y filtros.
- Calendario mensual de citas con FullCalendar.

La autenticación y los módulos completos de usuarios y pacientes están pendientes; el módulo de citas usa modelos provisionales de `Paciente` y `Usuario` (ver más abajo). El acceso administrativo actual es únicamente para desarrollo local.

## Requisitos

- Node.js 22.12 o posterior (probado con Node.js 26.4).
- npm.
- MongoDB local o una base en MongoDB Atlas.

## Instalar y ejecutar

Abre dos terminales en la carpeta del proyecto.

### Terminal 1: backend

```bash
cd backend
npm ci
cp .env.example .env
npm run dev
```

Antes de ejecutar, revisa `backend/.env`. La URI de ejemplo requiere MongoDB ejecutándose localmente en el puerto 27017. Para Atlas, reemplaza `MONGODB_URI` por tu conexión real. Nunca subas ese archivo a GitHub.

Variables:

| Variable | Valor de ejemplo | Uso |
| --- | --- | --- |
| PORT | 3000 | Puerto de Express |
| MONGODB_URI | mongodb://127.0.0.1:27017/sigca | Conexión a MongoDB |
| FRONTEND_URL | http://localhost:5173 | Origen permitido por CORS |

La API inicia únicamente si logra conectar con MongoDB. Si falla, revisa la URI y la disponibilidad de la base. No hay credenciales de demostración porque todavía no existe autenticación.

### Terminal 2: frontend

```bash
cd frontend
npm ci
npm run dev
```

Abre http://localhost:5173. Vite redirige `/api` al backend en el puerto 3000. Si cambias el puerto de Express, actualiza también el proxy de `frontend/vite.config.js`.

## Verificación de funcionamiento

1. Abre Inicio y navega a Misión y visión.
2. Edita el contenido desde Administración y verifica que se refleje en el portal.
3. Consulta `http://localhost:3000/api/health`: responde 200 y JSON cuando la base está conectada, o 503 si se pierde la conexión.
4. Abre una dirección desconocida en el frontend: debe aparecer la página 404.
5. Detén el backend y recarga el portal: debe aparecer un mensaje de error con opción para reintentar.

Para generar la versión de producción del frontend:

```bash
cd frontend
npm run build
```

El resultado se genera en `frontend/dist`. El despliegue deberá servir `index.html` para las rutas de Vue Router y dirigir `/api` a Express; todavía no se configura hosting.

## Estructura

```text
backend/
  src/
    config/database.js  # Conexión Mongoose
    app.js              # Express, ruta de salud y errores
    server.js           # Inicio y cierre del servidor
  .env.example
frontend/
  src/
    router/             # Rutas
    stores/             # Estado y consulta de conexión
    views/              # Pantallas
    App.vue             # Encabezado, navegación y pie
    main.js             # Registro de Vue, Router y Pinia
    style.css
```

## Módulo de servicios

### Acceso

- `/servicios`: catálogo público, solo muestra servicios activos.
- `/admin/servicios`: formulario y listado administrativo.

La administración está bloqueada por defecto. Para probarla localmente, configura `ENABLE_DEV_ADMIN=true` en `backend/.env` y reinicia el backend. El acceso temporal solo se admite desde loopback y se bloquea con `NODE_ENV=production`. Express escucha en `127.0.0.1`.

Este acceso de desarrollo deberá reemplazarse por JWT y autorización del rol ADMINISTRADOR al integrar usuarios. No es un sistema de autenticación. El frontend puede mostrar la pantalla administrativa, pero las operaciones y el listado privado se protegen desde la API.

### Datos ficticios

Con MongoDB disponible y `MONGODB_URI` configurado, ejecuta desde `backend/`:

```bash
npm run seed:servicios
```

Carga cinco servicios ficticios. Repetir el comando no duplica los servicios con el mismo nombre ni modifica sus datos existentes.

### Endpoints

| Método | Ruta | Función |
| --- | --- | --- |
| GET | /api/servicios | Servicios activos |
| GET | /api/servicios/:id | Detalle de un servicio activo |
| GET | /api/admin/servicios | Todos los servicios; acceso administrativo |
| POST | /api/servicios | Registrar; acceso administrativo |
| PUT | /api/servicios/:id | Editar datos completos; acceso administrativo |
| PATCH | /api/servicios/:id/estado | Activar o desactivar; acceso administrativo |

Ejemplo de registro:

```json
{
  "nombre": "Atención psicológica",
  "descripcion": "Acompañamiento psicológico individual.",
  "duracionMinutos": 60,
  "precioCentavos": 25000,
  "imagen": "/images/servicio.svg",
  "estado": "ACTIVO"
}
```

`precioCentavos: 25000` representa Q250.00. La API requiere un número entero, entre 0 y 99999999 centavos. La duración debe ser un entero de 1 a 1440 minutos. La imagen admite una URL HTTP/HTTPS o un recurso local en `/images/`.

El frontend incluye una ilustración de respaldo si la imagen no carga. No hay eliminación física de servicios. Las citas copian la duración y el precio vigentes al momento de programarse, por lo que un cambio posterior de precio no afecta las citas existentes.

### Pruebas manuales

Importa `docs/SIGCA-servicios.postman_collection.json` en Postman. La petición de registro guarda el identificador en la variable `serviceId`; ejecuta después edición, desactivación, consulta pública y reactivación.

Comprueba también:

1. Registrar y editar desde la pantalla administrativa; recargar y verificar persistencia.
2. Desactivar: debe desaparecer del catálogo y permanecer en administración.
3. Reactivar: debe volver al catálogo.
4. Enviar precio decimal en centavos, duración cero o imagen con protocolo inválido: respuesta 400.
5. Deshabilitar `ENABLE_DEV_ADMIN`: las operaciones administrativas responden 403.

## Contenido institucional

La colección `contenidoInstitucional` almacena un documento único con identificador `principal`. La primera consulta crea en MongoDB la configuración inicial ficticia del Centro Armonía; las consultas siguientes conservan los valores guardados.

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | /api/contenido | Público |
| PUT | /api/contenido/principal | Administrativo |

Campos obligatorios: `nombreCentro` (100 caracteres), `logo` (2048), `tituloInicio` (180), `descripcionInicio` (1500), `mision` (3000) y `vision` (3000). La actualización requiere todos los campos. El logo admite HTTP/HTTPS o una imagen local en `/images/`. Se incluye `/images/logo.svg`.

- `/admin/contenido`: editor de identidad, inicio, misión y visión. Comparte el acceso administrativo temporal descrito en el módulo de servicios.
- `/`: muestra el título y la información principal guardados.
- `/nosotros`: muestra misión y visión.
- El encabezado, el pie y el título del navegador utilizan el nombre configurado. Si una imagen del logo no carga, se muestra un respaldo visual.

El editor muestra una vista previa de la identidad, mensajes de validación y confirmación, y permite descartar cambios. Al navegar fuera del formulario con cambios pendientes solicita confirmación. Tras guardar, el estado compartido actualiza las vistas públicas. Las demás pestañas reciben el contenido actualizado al recargar.

Importa `docs/SIGCA-contenido.postman_collection.json` para consultar y actualizar el contenido. Comprueba persistencia recargando la página y verifica que las entradas inválidas respondan 400 y que la edición sin acceso habilitado responda 403.

## Carrusel de inicio

- `/admin/carrusel`: permite editar URL, título y texto alternativo, agregar o quitar imágenes y cambiar su orden.
- El portal muestra el carrusel en `/`, con botones anterior/siguiente e indicadores accesibles. El cambio es manual, sin reproducción automática.
- Deben guardarse entre cinco y diez imágenes. No se exige alojamiento de archivos: se aceptan HTTP/HTTPS y recursos locales en `/images/`.
- Se incluyen cinco ilustraciones SVG locales. Si una imagen no carga, se muestra una imagen de respaldo.
- `PUT /api/contenido/principal/carrusel` recibe `{ "carrusel": [...] }`. Cada elemento requiere `imagen` (máximo 2048 caracteres), `titulo` (100) y `textoAlternativo` (180).
- Las imágenes se guardan dentro del documento institucional. La primera consulta agrega las imágenes iniciales a documentos anteriores que no tengan carrusel, sin reemplazar nombre, misión ni otros cambios existentes.
- La edición institucional y la edición del carrusel actualizan campos distintos para conservar la configuración del otro formulario.

## Horarios de atención

- `/horarios`: tabla pública de lunes a domingo, con horas en formato de 24 horas y días cerrados.
- `/admin/horarios`: edición de apertura, cierre y disponibilidad de cada día.
- `GET /api/horarios` obtiene la configuración; `PUT /api/horarios` la actualiza con `{ "dias": [...] }`.
- La colección `horarios` conserva un documento con `_id: "atencion"`, `zonaHoraria: "America/Guatemala"` y siete elementos en `dias`.
- Cada día tiene `dia` (0: domingo a 6: sábado), `abierto` (booleano), `inicio` y `fin` (HH:mm). Los días cerrados se guardan con horas `null`.
- Deben enviarse los siete días, sin duplicados. El cierre de un día abierto debe ser posterior a su apertura; no se admiten intervalos que crucen medianoche. Puede configurarse toda la semana cerrada.
- La primera consulta crea un horario ficticio: lunes a viernes 08:00–17:00, sábado 08:00–12:00 y domingo cerrado. Es editable; no representa un horario real del centro.
- El futuro módulo de citas deberá consumir esta configuración y validar los intervalos en el backend al programar o reprogramar citas.

Las escrituras de ambos módulos usan el mismo control administrativo temporal, bloqueado por defecto y en producción. Los formularios advierten al navegar con cambios sin guardar. Consulta `docs/SIGCA-carrusel-horarios.postman_collection.json` para probar respuestas válidas, mínimo de imágenes e intervalos inválidos.

## Publicaciones educativas y actividades corporativas

### Pantallas

| Sección | Portal público | Administración |
| --- | --- | --- |
| Contenido educativo | /educativo | /admin/publicaciones |
| Corporativo | /corporativo | /admin/actividades |

Los formularios permiten registrar, editar y activar o desactivar contenidos. El listado administrativo permite buscar por título y filtrar por estado. Los registros no se eliminan físicamente; los inactivos permanecen en administración y se excluyen de las consultas públicas. La administración utiliza el acceso temporal de desarrollo y deberá integrarse con JWT y el rol ADMINISTRADOR.

Las publicaciones requieren título (máximo 160 caracteres), descripción (6000) y `fechaPublicacion` en formato AAAA-MM-DD. `imagen` y `enlace` son opcionales y se guardan como cadenas vacías si no se proporcionan. Las fechas se almacenan sin conversión de zona horaria y se muestran sin desplazamiento de día. La fecha es informativa: un contenido ACTIVO se muestra aunque su fecha sea futura; no se implementa publicación programada.

Las actividades requieren título, descripción, un tipo (`CAPACITACION`, `ESCUELA_PARA_PADRES` u `OTRA`) y entre una y cinco URLs en `imagenes`. La vista pública permite filtrar por tipo y muestra todas las imágenes de la actividad.

Las imágenes admiten URLs HTTP/HTTPS o rutas locales de `/images/`. Los enlaces externos solo admiten HTTP/HTTPS y se abren en otra pestaña con protección `noopener noreferrer`. Los textos se muestran como texto, sin interpretar HTML. Si una imagen no carga, se muestra una ilustración local de respaldo.

### API REST

Las publicaciones usan `/api/publicaciones` y `/api/admin/publicaciones`; las actividades usan `/api/actividades` y `/api/admin/actividades`.

| Método | Ruta relativa al recurso | Operación |
| --- | --- | --- |
| GET | / | Listado público de activos |
| GET | /:id | Detalle público de un activo |
| POST | / | Registrar, requiere administración |
| PUT | /:id | Editar todos los campos del formulario, requiere administración |
| PATCH | /:id/estado | Activar o desactivar, requiere administración |
| GET | /api/admin/publicaciones o /api/admin/actividades | Todos los registros, requiere administración |

Se guardan en las colecciones `publicaciones` y `actividadesCorporativas`, con fechas de creación y actualización. Las publicaciones se ordenan por fecha de publicación descendente y las actividades por fecha de registro descendente.

### Datos de demostración y pruebas

Con MongoDB configurado, ejecuta desde `backend/`:

```bash
npm run seed:contenido
```

Carga tres publicaciones y tres actividades ficticias, incluyendo una capacitación, una escuela para padres y otra actividad. No reemplaza registros existentes con el mismo título. Las publicaciones de demostración no incluyen recomendaciones clínicas.

Importa `docs/SIGCA-editorial.postman_collection.json`. Ejecuta cada grupo en orden para registrar un contenido, guardar su identificador, editarlo, desactivarlo, comprobar que su detalle público devuelve 404 y reactivarlo. Comprueba también fechas imposibles, protocolos de enlace inválidos y galerías vacías: deben responder 400. Con el acceso administrativo deshabilitado o en producción, las operaciones privadas responden 403.

## Contacto y mensajes

### Pantallas

- `/contacto`: información pública del centro y formulario con nombre, correo, teléfono, asunto y mensaje.
- `/admin/contacto`: edición de correo, teléfono, dirección y texto de presentación.
- `/admin/mensajes`: búsqueda por nombre, correo o asunto, filtro de estado, paginación y consulta del detalle. Permite marcar como leído o nuevo sin eliminar el mensaje.

El formulario guarda los mensajes en la colección `mensajesContacto`. No envía correos electrónicos ni genera solicitudes de cita. La confirmación se muestra después de que MongoDB acepta el registro; ante un error se conservan los campos para reintentar.

Los datos públicos se guardan en `contenidoInstitucional.contacto`. La primera consulta agrega información ficticia a documentos que todavía no tengan este campo, sin reemplazar otros datos del centro. Actualiza los datos de demostración antes de usar el portal con información institucional real.

### API

| Método | Ruta | Acceso |
| --- | --- | --- |
| POST | /api/contacto | Público: guardar mensaje |
| GET | /api/contacto | Administrativo: listado paginado |
| GET | /api/contacto/:id | Administrativo: detalle |
| PATCH | /api/contacto/:id/estado | Administrativo: cambiar a NUEVO o LEIDO |
| PUT | /api/contenido/principal/contacto | Administrativo: editar datos del centro |

El listado acepta `pagina` (desde 1), `limite` (1–50), `estado` (NUEVO o LEIDO) y `buscar` (máximo 120 caracteres). Devuelve `mensajes`, `total`, `pagina` y `totalPaginas`; los resultados se ordenan del más reciente al más antiguo. La búsqueda interpreta el texto literalmente. El cuerpo y el teléfono del remitente solo se incluyen en el detalle administrativo. La respuesta pública de registro contiene únicamente una confirmación, no el documento ni datos de otros remitentes.

Límites del mensaje: nombre 120, correo 254, teléfono 30, asunto 160 y mensaje 5000 caracteres. Todos son obligatorios. El teléfono admite de 7 a 15 dígitos, con un prefijo + opcional y separadores habituales. No se aceptan campos adicionales como un estado enviado por el visitante. Los textos se muestran sin interpretar HTML.

Los datos del centro requieren `correo`, `telefono`, `direccion` (máximo 300) y `texto` (1000). Se actualizan de forma independiente del carrusel y del resto del contenido institucional.

### Datos ficticios y pruebas

Desde `backend/`, con MongoDB disponible:

```bash
npm run seed:contacto
```

Genera dos mensajes ficticios, uno nuevo y otro leído, y conserva los mensajes existentes que tengan el mismo correo y asunto. El formulario funciona aunque no se ejecute este script.

Importa `docs/SIGCA-contacto.postman_collection.json`. Verifica registro público (201), rechazo de campos inválidos (400), listado, consulta del detalle, cambio de estado y paginación. Deshabilitar `ENABLE_DEV_ADMIN` debe bloquear listado, detalle, cambios de estado y edición del centro con 403, manteniendo disponible el envío público. La integración definitiva deberá autorizar la consulta de mensajes para ADMINISTRADOR.

## Solicitudes de cita, citas y calendario

### Pantallas

- `/servicios` → botón **Solicitar cita**: abre `/solicitar-cita` con el servicio elegido.
- `/admin/solicitudes`: bandeja de solicitudes; rechazar o convertir en cita.
- `/admin/citas`: programar citas, agenda con filtros, detalle con confirmar, reprogramar, cancelar, completar e historial del paciente.
- `/admin/calendario`: calendario mensual; clic en un día para ver sus citas y en una cita para ver su detalle.

### Datos de demostración

Desde `backend/`, con `ENABLE_DEV_ADMIN=true`:

```bash
npm run seed:modulo-citas
```

Ejecuta en orden `seed:servicios`, `seed:solicitudes`, `seed:agenda-provisional` y `seed:citas`. Carga 6 solicitudes (pendientes, una rechazada y una atendida con su cita), 4 profesionales (uno inactivo), 5 pacientes (un menor con responsable, un menor sin responsable y un inactivo) y 15 citas pasadas y futuras en todos los estados. Repetir los comandos el mismo día no duplica datos; las fechas de las citas son relativas al día en que se ejecuta.

### Modelos provisionales

`backend/src/models/Paciente.js`, `backend/src/models/Usuario.js` y `scripts/seedAgendaProvisional.js` existen solo para probar citas mientras se integran los módulos de pacientes y usuarios. Al integrarlos, se reemplazan esos archivos; si los campos cambian, solo se ajusta `backend/src/services/dependenciasCitas.js`. La regla RN-27 (no cancelar citas con pagos válidos) está en `backend/src/services/pagosCitas.js` y se activa sola cuando exista el modelo `Pago` con los campos `cita` y `estado`.

### Endpoints

| Método | Ruta | Función |
| --- | --- | --- |
| POST | /api/solicitudes-cita | Enviar solicitud; pública |
| GET | /api/solicitudes-cita | Listar con filtros `estado`, `buscar`, `pagina`, `limite` |
| GET | /api/solicitudes-cita/:id | Detalle, con la cita generada si fue atendida |
| PATCH | /api/solicitudes-cita/:id/rechazar | Rechazar una solicitud pendiente |
| POST | /api/solicitudes-cita/:id/convertir | Crear la cita y marcar la solicitud ATENDIDA |
| GET | /api/citas/opciones | Pacientes, profesionales, servicios y horario para formularios |
| GET | /api/citas | Listar con filtros `paciente`, `profesional`, `estado`, `desde`, `hasta` |
| GET | /api/citas/calendario | Citas de un rango (`desde`, `hasta`, máximo 62 días) |
| GET | /api/citas/:id | Detalle |
| POST | /api/citas | Programar |
| PUT | /api/citas/:id | Reprogramar profesional, fecha y hora; editar observaciones |
| PATCH | /api/citas/:id/estado | Confirmar, completar o cancelar |

Reglas aplicadas en el backend: RN-01 a RN-07, RN-11 a RN-14, RN-27 (preparada) y RN-30. Los cambios de estado permitidos son PENDIENTE → CONFIRMADA o CANCELADA, y CONFIRMADA → COMPLETADA o CANCELADA; COMPLETADA y CANCELADA son finales. Una cita solo se completa cuando ya inició. Reprogramar conserva servicio, duración y precio, y devuelve la cita a PENDIENTE. Un bloqueo por profesional (`bloqueosAgenda`) evita traslapes cuando dos personas programan al mismo tiempo.

### Pruebas

Importa `docs/SIGCA-solicitudes-citas.postman_collection.json` y ejecútala completa con el Collection Runner. La primera petición calcula las fechas y obtiene los identificadores de los datos de demostración; cada ejecución usa una fecha futura distinta.

## Referencias

- Vue: https://vuejs.org/guide/quick-start
- Vite: https://vite.dev/guide/
- Mongoose: https://mongoosejs.com/docs/connections.html
- Express: https://expressjs.com/
