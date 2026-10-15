# Proyecto Final DW — SIGCA

Sistema Integral de Gestión de Citas y Atención.

## Avance de hoy

- Estructura frontend/backend y configuración de Git.
- API Express, conexión MongoDB y ruta de salud.
- Vue, Vite, Vue Router y Pinia.
- Inicio, página de información y página 404.
- Botón para comprobar la conexión frontend → API → MongoDB.

Esta es una base inicial: todavía no incluye servicios, contenido editable, login, pacientes ni citas.

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

## Comprobar el avance

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

## Próximo avance del integrante 1

Modelo y API de servicios, formulario administrativo y listado público. Después se implementarán contenido institucional, horarios y contacto. Las rutas administrativas deberán protegerse al integrar autenticación con el integrante 2.

## Responsabilidades previstas

1. Base, portal público, contenido, servicios, horarios y contacto.
2. Autenticación, usuarios, profesionales, pacientes y responsables.
3. Solicitudes, citas, calendario y materiales.
4. Pagos y caja.

Cada integrante agregará sus datos de prueba, solicitudes Postman y documentación. El script de datos ficticios está pendiente hasta contar con los modelos de negocio.

## Referencias

- Vue: https://vuejs.org/guide/quick-start
- Vite: https://vite.dev/guide/
- Mongoose: https://mongoosejs.com/docs/connections.html
- Express: https://expressjs.com/
