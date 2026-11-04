# SIGCA — Proyecto Final DW

Sistema para administrar un centro de atención psicológica y estimulación auditiva verbal. Incluye un portal público y un área privada para pacientes, citas, materiales, pagos y caja.

Está desarrollado con Vue 3, Vue Router, Pinia, Node.js, Express y MongoDB con Mongoose. El acceso utiliza JWT y permisos según el rol.

[Repositorio en GitHub](https://github.com/LuisCaGt/Proyecto-Final-DW)

## Instalación

Se necesita **Node.js 22.12 o posterior**, npm e Internet para la primera instalación.

Abre una terminal en la carpeta principal y ejecuta:

```bash
npm run preparar
```

El comando instala las dependencias, configura la base local y carga los datos de prueba. No hace falta instalar MongoDB por separado. La primera vez puede tardar varios minutos por la descarga.

Después inicia el sistema con:

```bash
npm start
```

Abre la dirección que muestra la terminal, normalmente **http://127.0.0.1:5173**. Deja la terminal abierta mientras uses la aplicación. Para detenerla, presiona `Ctrl+C`.

En los siguientes arranques basta con `npm start`. Los datos quedan guardados.

## Cuentas de prueba

En una instalación nueva, la contraseña de todas estas cuentas es **`Sigca-Demo-2026!`**.

| Rol | Correo |
| --- | --- |
| Administrador | admin@sigca.test |
| Recepcionista | recepcion1@sigca.test |
| Recepcionista | recepcion2@sigca.test |
| Profesional | profesional1@sigca.test |
| Profesional | profesional2@sigca.test |
| Profesional | profesional3@sigca.test |
| Profesional con citas de ejemplo | laura.gomez@sigca.test |

Selecciona **Iniciar sesión** e ingresa el correo y la contraseña. Estas cuentas son solo para pruebas locales.

Si ya existía una instalación, se conservan su configuración y sus contraseñas. El comando de preparación no restablece las claves.

## Funciones

- Portal con servicios, misión y visión, publicaciones, actividades, horarios y contacto.
- Edición del nombre, logo, carrusel y contenido del centro.
- Registro de pacientes y responsables.
- Solicitudes de citas, programación, cambios de estado y calendario.
- Materiales de apoyo y asignación a pacientes.
- Pagos completos, abonos, saldos y comprobantes.
- Apertura y cierre de caja con ingresos por método de pago y diferencia de efectivo.

El administrador accede a todos los módulos. Recepción gestiona pacientes, agenda, pagos y su caja. Los profesionales consultan sus pacientes y citas, asignan materiales y completan las citas atendidas.

## Integrantes

| Nombre | GitHub | Responsabilidad principal |
| --- | --- | --- |
| Luis Carlos Lee Mejia | LuisCaGt | Portal público, servicios y contenido institucional |
| Alejandro Garcia | AlejoGarcia7 | Autenticación, usuarios, pacientes y responsables |
| Wilson Alexander Luis | Drk1xr | Solicitudes, citas, calendario y materiales |
| Iliana Yuridia Orellana Marroquin | iliana233 | Pagos y caja diaria |

## Configuración y documentación

La configuración local se guarda en `backend/.env`. Ese archivo no se incluye en el repositorio ni en el ZIP. Hay una plantilla en `backend/.env.example`.

Si el puerto 5173 está ocupado, detén la ejecución anterior o cambia `FRONTEND_URL` en `.env` a `http://127.0.0.1:5174`.

- [Módulos, endpoints y configuración](docs/MODULOS.md)
- [Autenticación, pacientes y responsables](docs/AUTENTICACION-PACIENTES.md)
- [Pagos y caja](docs/caja-diaria.md)
- [Referencia técnica y validaciones](docs/REFERENCIA-TECNICA.md)
- [Capturas del sistema](docs/evidencias/)

Las colecciones de Postman están en `docs/`. Para compilar la interfaz, ejecuta `npm run build`; el resultado se genera en `frontend/dist`.
