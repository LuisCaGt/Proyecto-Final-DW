# Entrega: autenticación, usuarios, profesionales, pacientes y responsables

La integración conserva solicitudes, citas y calendario de `main`. No implementa finanzas ni materiales; sus módulos siguen fuera de esta entrega.

## Preparar el entorno

1. Instalar dependencias con `npm ci` en `backend` y `frontend`.
2. Copiar `backend/.env.example` a `backend/.env`.
3. Configurar `MONGODB_URI` y generar una clave privada JWT:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

   Guardar el resultado en `JWT_SECRET`. `JWT_EXPIRES_IN_SECONDS=3600` limita la sesión a una hora. No compartir `.env` ni subirlo a Git.
4. Elegir una contraseña de demostración de al menos 12 caracteres en `DEMO_SEED_PASSWORD`.
5. **Si la base ya contiene los modelos provisionales**, detener el backend, conservar un respaldo y ejecutar desde `backend`:

   ```sh
   npm run migrate:people
   ```

   La migración es repetible: conserva `_id`, estados, citas e historial; completa identificadores faltantes y sexo no indicado. Las cuentas antiguas reciben hashes aleatorios sin contraseña compartida: un administrador debe restablecer sus contraseñas. Solo se migran asociaciones cuyos responsables existen; las referencias ficticias del antiguo seed no autorizan una cita. Revisar los parentescos marcados “No registrado”. No ejecutar el servidor antes de migrar, porque los índices únicos requieren identificadores en los registros anteriores.
6. En una base de desarrollo, cargar `npm run seed:demo`. Crea como mínimo 1 administrador, 2 recepcionistas, 3 profesionales, 10 pacientes y 5 responsables. Incluye menor con responsable, menor sin responsable, paciente inactivo y un responsable vinculado a dos pacientes. Repetirlo no sobrescribe cuentas ni duplica registros.
7. Para conservar los ejemplos del módulo de citas, ejecutar también `npm run seed:modulo-citas`. Sus usuarios adicionales tienen correos `@sigca.test`; en una base nueva usan `DEMO_SEED_PASSWORD`. Los registros anteriores conservan sus claves: restablecerlas desde Usuarios cuando corresponda.
8. Iniciar `npm run dev` en backend y frontend; abrir `http://localhost:5173/iniciar-sesion`.

| Rol | Cuenta demo |
| --- | --- |
| ADMINISTRADOR | admin@sigca.test |
| RECEPCIONISTA | recepcion1@sigca.test / recepcion2@sigca.test |
| PROFESIONAL | profesional1@sigca.test / profesional2@sigca.test / profesional3@sigca.test |

La contraseña es el valor local de `DEMO_SEED_PASSWORD`; no hay clave fija en el repositorio. Si se cambia esa variable después del primer seed, no cambia las contraseñas de cuentas ya creadas.

## Permisos y contrato para otros módulos

| Operación | Público | Administrador | Recepcionista | Profesional |
| --- | --- | --- | --- | --- |
| Consultar portal; enviar contacto y solicitud | Sí | Sí | Sí | Sí |
| Editar portal, servicios, contenido, horarios; leer mensajes | No | Sí | No | No |
| Gestionar usuarios, roles, estados y contraseñas | No | Sí | No | No |
| Gestionar pacientes y responsables | No | Sí | Sí | No |
| Consultar pacientes | No | Todos | Todos | Básicos, activos y vinculados |
| Gestionar solicitudes y citas | No | Sí | Sí | No |
| Consultar citas y calendario | No | Todas | Todas | Solo propias, sin importes |

- `requireAuth` y `authorizeRoles` están en `backend/src/middleware/auth.js`. El servidor obtiene identidad, estado y rol actual de MongoDB en cada petición; no confía en roles o identificadores de usuario enviados por el navegador.
- `POST /api/auth/login` recibe `correo` y `password`; devuelve `token` y usuario sin hash. `GET /api/auth/me` recupera la sesión.
- `GET/POST /api/usuarios`, `PUT /api/usuarios/:id`, `PATCH /api/usuarios/:id/estado`, `POST /api/usuarios/:id/restablecer-password` (body `{ "password": "..." }`).
- `GET /api/profesionales/activos` expone referencias de usuarios con rol PROFESIONAL para administración y recepción.
- `GET/POST /api/pacientes`, `GET/PUT /api/pacientes/:id`, `PATCH /api/pacientes/:id/estado` y `POST /api/pacientes/:id/responsables` (body `responsableId`, `parentesco`). Buscar con `?buscar=...`; filtrar estado con `?estado=INACTIVO`.
- `GET/POST /api/responsables` y `GET/PUT /api/responsables/:id`. El detalle incluye pacientes asociados.
- `ResponsablePaciente` almacena referencias a ambas colecciones y parentesco por relación; un índice único evita duplicados. Guardar otra vez la asociación actualiza el parentesco.
- Citas utiliza `services/dependenciasCitas.js`; crear, convertir solicitud y reprogramar verifican estados y responsables reales. La edad se calcula, nunca se almacena, y usa el día de Guatemala.
- La atención vinculada de un profesional incluye asignación explícita del paciente o una cita a su nombre. Cambiar el filtro o conocer el ID de una cita ajena no permite consultarla.
- La baja lógica mantiene relaciones e historial. La ficha administrativa incluye las citas actuales y anteriores.
- Las fotografías aceptan URL HTTP/HTTPS o rutas `/images/`; no hay carga binaria de archivos. Se muestra una imagen genérica cuando falta una foto.
- La sesión del navegador se guarda en `sessionStorage`, se recupera con `/auth/me` y se limpia al cerrar sesión o recibir 401. Cerrar sesión limpia el cliente; el JWT tiene vencimiento y no usa lista de revocación por cierre de sesión.

## Verificación

Desde `backend`:

```sh
npm test
```

Para integración, definir `MONGODB_URI_TEST` apuntando a una base cuyo nombre termine en `_test`. Ejemplo PowerShell:

```powershell
$env:MONGODB_URI_TEST='mongodb://127.0.0.1:27017/sigca_integration_test'
npm run test:integration
```

Las pruebas usan cuentas ficticias. La suite de agenda crea una base separada con sufijo aleatorio `_test` y elimina únicamente esa base al terminar. Comprueba acceso por rol, aislamiento de citas/listados/calendario, menores y referencias huérfanas, inactivos, reprogramación, conversión, conservación del historial, migración repetible y edad en Guatemala.

Desde `frontend`, ejecutar `npm run build`. En Postman, configurar `token` en las colecciones con el JWT obtenido al iniciar sesión.

Comprobación manual: iniciar sesión con los tres roles, editar y volver a crear pacientes/responsables, asociar el mismo responsable a varios pacientes, recargar una ruta privada, abrir calendario profesional, cerrar sesión y verificar el rechazo de rutas privadas.
