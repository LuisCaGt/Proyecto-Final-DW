// Punto de integración con el módulo de pagos (compañero 4).
// RN-27: una cita con pagos válidos no puede cancelarse.
// Funciona sola cuando exista el modelo `Pago` con los campos `cita` y `estado` (REGISTRADO / ANULADO).
import mongoose from 'mongoose';

export async function tienePagosValidos(citaId) {
  const Pago = mongoose.models.Pago;
  if (!Pago) return false; // Aún no existe el módulo de pagos.
  return Boolean(await Pago.exists({ cita: citaId, estado: 'REGISTRADO' }));
}
