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
