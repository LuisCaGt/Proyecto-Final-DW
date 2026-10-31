# SIGCA — Referencia técnica

## Integrantes

| Integrante | GitHub | Responsabilidad principal |
| --- | --- | --- |
| Luis Carlos Lee Mejia | LuisCaGt | Portal público, servicios y contenido institucional |
| Alejandro Garcia | AlejoGarcia7 | Autenticación, usuarios, pacientes y responsables |
| Wilson Alexander Luis | Drk1xr | Solicitudes, citas, calendario y materiales |
| Iliana Yuridia Orellana Marroquin | iliana233 | Pagos y caja diaria |

Repositorio: https://github.com/LuisCaGt/Proyecto-Final-DW

## Instalación desde una copia nueva

1. Instalar Node.js 22.12 o posterior y npm.
2. En `backend`, ejecutar `npm ci`, copiar `.env.example` a `.env` y configurar `JWT_SECRET` (al menos 32 bytes aleatorios) y `DEMO_SEED_PASSWORD` (al menos 12 caracteres). La contraseña de demostración la elige quien instala; no hay una clave real publicada.
3. Para la base local, ejecutar `npm run mongo:local` desde `backend` y mantener esa terminal abierta. Utiliza MongoDB con replica set y datos persistidos en `backend/.data/mongo`. También se puede utilizar Atlas y configurar su URI en `.env`.
4. En otra terminal, desde `backend`, ejecutar `npm run seed:all` y después `npm run dev`.
5. En otra terminal, desde `frontend`, ejecutar `npm ci` y `npm run dev`.
6. Abrir `http://127.0.0.1:5173/`. Si el puerto está ocupado, liberar el servidor anterior o ejecutar `npm run dev -- --port 5174` y ajustar `FRONTEND_URL` en `.env` al origen elegido. El backend usa el puerto 3000.
7. Iniciar sesión con `admin@sigca.test`, `recepcion1@sigca.test` o `profesional1@sigca.test`, usando el valor de `DEMO_SEED_PASSWORD` elegido al crear la base. `laura.gomez@sigca.test` permite consultar las citas ficticias adicionales de agenda.

Para bases anteriores, consultar las migraciones de [personas](AUTENTICACION-PACIENTES.md) y [finanzas](caja-diaria.md) antes de arrancar el servidor. Los responsables anteriores que tengan campos vacíos se completan desde el formulario; los scripts solo completan sus propios registros ficticios conocidos.

## Correspondencia con los requisitos

| Requisito | Implementación |
| --- | --- |
| RF-01 | Portal Vue con identidad editable, carrusel de cinco imágenes, servicios, educativo, corporativo, horarios y contacto persistido |
| RF-02 | Login, JWT, contraseñas con scrypt, tres roles y autorización desde Express |
| RF-03 | Pacientes, búsqueda, edición, baja lógica, edad calculada, citas y pagos relacionados |
| RF-04 | Responsables con fotografía, contacto y dirección obligatorios; relación con varios pacientes y parentesco por relación |
| RF-05 | Servicios, duración, precio en centavos, imagen y activación/desactivación |
| RF-06 | Solicitud pública sin reserva automática; recepción convierte en cita y conserva la referencia |
| RF-07 | Programación, confirmación, reprogramación, cancelación, completado y precio histórico |
| RF-08 | Calendario mensual, selección por día y detalle por cita con permisos por profesional |
| RF-09 | Catálogo de materiales, baja lógica, asignaciones e historial por paciente |
| RF-10 | Abonos, pagos completos, saldos calculados, comprobantes, filtros y anulaciones justificadas |
| RF-11 | Caja por usuario, apertura, totales por método, movimientos, cierre y diferencia de efectivo |
| RF-12 | Edición del contenido desde administración sin modificar el código |
| RF-13 | Alta, edición, roles, estados y restablecimiento protegido de contraseñas |

Las reglas de agenda se implementan principalmente en `agendaService.js` y el controlador de citas; las de pagos en `pagosCaja.js`, `saldos.js` y el controlador de caja. Los importes se calculan con centavos enteros. Las transacciones requieren replica set o Atlas.

## Validación realizada el 31 de octubre de 2026

- 18 pruebas de integración aprobadas: autenticación, permisos, pacientes, responsables, agenda, materiales y operaciones financieras.
- 3 pruebas de seguridad y 2 pruebas de cálculo de caja aprobadas: 23 pruebas automatizadas en total.
- Compilación del frontend aprobada con `npm run build`.
- Colección Postman de personas ejecutada con Newman en una base temporal: 25 solicitudes, 33 aserciones y cero fallos.
- Carga `seed:all` en una base temporal y repetición el mismo día sin duplicar registros.
- Revisión manual del portal, calendario profesional, ficha de paciente, materiales, pagos y detalle de cierre de caja.

Las pruebas cubren los escenarios descritos.

## Colecciones Postman

Importar los archivos `docs/*.postman_collection.json`. Cada colección incluye sus instrucciones y variables. Ejecutar sobre datos ficticios; las operaciones generan o modifican registros de demostración.

- `SIGCA-personas`: login, sesión, usuarios, restablecimiento, roles, pacientes, responsables y asociaciones.
- `SIGCA-servicios`: catálogo y administración.
- `SIGCA-contenido`, `SIGCA-carrusel-horarios`, `SIGCA-editorial`, `SIGCA-contacto`: portal y contenido institucional.
- `SIGCA-solicitudes-citas`: solicitudes, citas y reglas de agenda.
- `SIGCA-materiales`: catálogo, permisos y asignaciones.
- `SIGCA-finanzas`: pagos, saldos, anulaciones y caja.

## Evidencias

Las capturas contienen exclusivamente datos ficticios.

| Archivo en `docs/evidencias` | Contenido |
| --- | --- |
| portal-publico.png | Inicio y carrusel |
| administracion.png | Administración y expedientes |
| ficha-paciente.png | Historial y materiales del paciente |
| calendario.png | Calendario mensual |
| cita-profesional.png | Cita completada por su profesional |
| materiales.png | Catálogo de materiales |
| pagos.png | Saldos e historial de pagos |
| caja.png | Cierre con ingresos Q1,000, esperado Q700, contado Q690 y faltante Q10 |
