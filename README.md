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
- Catálogo público de servicios activos con imagen, descripción, duración y precio.
- Administración de servicios: registro, edición, búsqueda, filtros y cambio de estado.
- Precio en centavos enteros y eliminación lógica mediante estado INACTIVO.

La autenticación, los pacientes, las citas, las publicaciones, las actividades corporativas y el contacto están pendientes. El botón de solicitud de cita permanece deshabilitado hasta integrar ese módulo.

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

El frontend incluye una ilustración de respaldo si la imagen no carga. No hay eliminación física de servicios. Las citas deberán copiar la duración y el precio vigentes al momento de programarse; ese módulo todavía está pendiente.

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

## Referencias

- Vue: https://vuejs.org/guide/quick-start
- Vite: https://vite.dev/guide/
- Mongoose: https://mongoosejs.com/docs/connections.html
- Express: https://expressjs.com/
