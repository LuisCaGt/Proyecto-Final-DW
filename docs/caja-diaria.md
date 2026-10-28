# Caja diaria

La caja diaria registra los pagos recibidos por cada usuario autorizado y permite comparar el efectivo contado con el efectivo esperado.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/cajas/abrir` | Abre una caja para el usuario autenticado. |
| GET | `/api/cajas/actual` | Consulta la caja abierta del usuario. |
| GET | `/api/cajas` | Consulta el historial de cajas permitidas para el usuario. |
| GET | `/api/cajas/:id` | Consulta el detalle de una caja. |
| GET | `/api/cajas/:id/movimientos` | Consulta los pagos asociados a una caja. |
| POST | `/api/cajas/:id/cerrar` | Cierra la caja y guarda el resultado del conteo. |

Las rutas requieren autenticación. El acceso se limita según el rol del usuario.

## Reglas de cálculo

Los ingresos se calculan a partir de los pagos válidos; los pagos anulados no se incluyen.

- Total en efectivo = suma de pagos válidos en efectivo.
- Total en transferencias = suma de pagos válidos por transferencia.
- Total en tarjeta = suma de pagos válidos con tarjeta.
- Total de ingresos = efectivo + transferencias + tarjeta.
- Efectivo esperado = monto inicial + pagos válidos en efectivo.
- Diferencia = efectivo contado − efectivo esperado.

El monto inicial no se incluye en los ingresos por servicios. Una diferencia negativa representa faltante y una positiva representa sobrante.

### Ejemplo de verificación

Con monto inicial Q200.00, pagos en efectivo Q500.00, transferencia Q350.00 y tarjeta Q150.00:

- Ingresos: Q1,000.00.
- Efectivo esperado: Q700.00.
- Si se cuentan Q690.00, la diferencia es −Q10.00: faltante de Q10.00.

## Acceso por rol

- **ADMINISTRADOR:** puede consultar y administrar las cajas según los permisos del sistema.
- **RECEPCIONISTA:** puede consultar y cerrar sus propias cajas.
- **PROFESIONAL:** no puede acceder a cajas ni pagos.

## Consistencia y auditoría

Cada usuario autorizado puede tener una sola caja abierta a la vez. Los pagos se asocian a la caja abierta de quien los registra. El cierre guarda la fecha, el usuario, el efectivo contado, la diferencia y los totales calculados.

Una caja cerrada conserva su historial y no debe aceptar nuevos pagos, anulaciones ni modificaciones. Los totales del cierre se calculan desde los pagos válidos y no se reciben como valores manuales.

Una cita con pagos válidos no se puede cancelar hasta que esos pagos hayan sido anulados mientras la caja correspondiente siga abierta. Si el pago pertenece a una caja cerrada, la cancelación permanece bloqueada.

## Pruebas y datos de demostración

El backend incluye una prueba de cálculo en `backend/test/caja.calculo.test.js` y datos de demostración en `backend/scripts/seedCajasDemo.js`.

Desde la carpeta `backend`, los comandos definidos en `package.json` son:

```bash
npm run test:caja
npm run seed:cajas
```

## Pagos y saldos

Las pantallas `/admin/pagos` y `/admin/caja` requieren ADMINISTRADOR o RECEPCIONISTA. `/admin/pagos/:id/comprobante` muestra el comprobante interno y permite imprimirlo o guardarlo como PDF desde el diálogo de impresión. El profesional no accede a finanzas.

Cada abono conserva paciente, cita, caja, monto entero en centavos, método, usuario, fecha y un comprobante único. No hay eliminación física. Las anulaciones requieren motivo: recepción solo anula cobros de su caja; administración puede anular en cualquier caja abierta. Ningún rol anula pagos de una caja cerrada.

El precio es la copia histórica de la cita. Los pagos REGISTRADO determinan el saldo y los estados PENDIENTE, PARCIAL y PAGADO; los ANULADO no cuentan. Una cita gratuita se considera PAGADO y no admite cobros de monto cero. No se permite exceder el saldo, tampoco con cobros simultáneos. Un comprobante representa el pago individual, no una factura fiscal.

| Método | Ruta | Uso |
|---|---|---|
| GET / POST | `/api/pagos` | Historial paginado / registrar abono |
| GET | `/api/pagos/:id` | Comprobante y datos del pago |
| PATCH | `/api/pagos/:id/anular` | Anular con motivo |
| GET | `/api/pagos/citas` | Citas paginadas con saldos |
| GET | `/api/citas/:id/saldo` | Precio histórico, pagado, saldo y estado financiero |
| GET | `/api/citas/:id/pagos` | Historial de la cita |

`GET /api/pagos` acepta paciente, cita, método, estado, desde, hasta, pagina y limite (máximo 50). Los nombres exactos de los parámetros son `paciente`, `cita`, `metodo`, `estado`, `desde`, `hasta`, `pagina`, `limite`. Las fechas de los filtros se interpretan en Guatemala. Desde la ficha del paciente se abre su historial financiero.

## MongoDB y ejecución local

Cobros, anulaciones, cierres y cancelaciones protegidas se ejecutan mediante transacciones. Requieren un replica set o MongoDB Atlas; un servidor standalone no sirve para estas operaciones. No hay alternativa que debilite la consistencia.

Para desarrollo local, instala las dependencias del backend y ejecuta en una terminal:

```bash
cd backend
npm ci
npm run mongo:local
```

La primera ejecución descarga el binario de MongoDB. El puerto 27017 debe estar libre. El servidor escucha solo en loopback y conserva los datos en `backend/.data/mongo`, excluido de Git. Deja esa terminal abierta. Configura en `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/sigca?replicaSet=sigca-local
```

Conserva tu `JWT_SECRET` privado. Ejecuta el backend en otra terminal con `npm run dev` y el frontend desde su carpeta con `npm run dev`. Si 5173 está ocupado, usa `npm run dev -- --port 5174` en frontend. Este servidor de MongoDB es para desarrollo; producción requiere una instalación administrada con autenticación.

Antes de actualizar una base que ya contenga cajas y pagos, guarda un respaldo y, con el backend detenido, ejecuta `npm run migrate:finanzas`. Completa las referencias a pacientes y comprobantes de pagos antiguos y corrige el índice de datos de demostración sin eliminar movimientos ni cierres. Si hay pagos sin cita, se detiene para revisión. En una instalación nueva también puede ejecutarse.

## Demostración y comprobación

Ejecuta primero los seeds de usuarios y servicios; luego `npm run seed:cajas`. Genera 3 cajas y 10 pagos ficticios, incluyendo abonos y anulaciones, con citas propias de demostración. Los ejemplos existentes se conservan y no se borran pagos al repetirlo. Si recepción ya tiene caja abierta, no se crea otra; para obtener la demostración completa utiliza una base nueva.

`npm run test:finanzas` crea y elimina exclusivamente un replica set temporal de pruebas. Verifica permisos, saldos históricos, sobrepagos, anulaciones, concurrencia entre cobros y cancelación, cierres y reapertura. `npm run test:caja` verifica las fórmulas. Importa `docs/SIGCA-finanzas.postman_collection.json` para las comprobaciones manuales; configura baseUrl, token, citaId, cajaId y pagoId con datos ficticios.
