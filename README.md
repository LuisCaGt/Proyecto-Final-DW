# Proyecto Final DW — SIGCA

Sistema Integral de Gestión de Citas y Atención, una aplicación web académica orientada a la administración de un centro de atención psicológica y estimulación auditiva verbal.

## Estado actual

- Estructura separada de frontend y backend.
- API Express, conexión MongoDB y ruta de salud.
- Vue, Vite, Vue Router y Pinia.
- Inicio, página de información y página 404.
- Botón para comprobar la conexión frontend → API → MongoDB.
- Catálogo público de servicios activos con imagen, descripción, duración y precio.
- Administración de servicios: registro, edición, búsqueda, filtros y cambio de estado.
- Precio en centavos enteros y eliminación lógica mediante estado INACTIVO.

El contenido institucional editable, la autenticación, los pacientes y las citas están pendientes. El botón de solicitud de cita permanece deshabilitado hasta integrar ese módulo.

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

1. Abre Inicio y navega a Acerca del proyecto.
2. Usa el botón Comprobar conexión: debe mostrar que API y MongoDB están conectados.
3. Consulta `http://localhost:3000/api/health`: responde 200 y JSON cuando la base está conectada, o 503 si se pierde la conexión.
4. Abre una dirección desconocida en el frontend: debe aparecer la página 404.
5. Detén el backend y pulsa Comprobar conexión: debe aparecer un mensaje de error.

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

## Referencias

- Vue: https://vuejs.org/guide/quick-start
- Vite: https://vite.dev/guide/
- Mongoose: https://mongoosejs.com/docs/connections.html
- Express: https://expressjs.com/
