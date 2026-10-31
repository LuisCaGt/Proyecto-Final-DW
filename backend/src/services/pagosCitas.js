// Consulta de pagos válidos asociados a una cita.
// RN-27: una cita con pagos válidos no puede cancelarse.
import mongoose from 'mongoose';

export async function tienePagosValidos(citaId) {
  const Pago = mongoose.models.Pago;
  if (!Pago) return false; // Compatibilidad cuando el modelo no está registrado.
  return Boolean(await Pago.exists({ cita: citaId, estado: 'REGISTRADO' }));
}
