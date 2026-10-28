import mongoose from 'mongoose';
import { Cita } from '../models/Cita.js';
import { Pago } from '../models/Pago.js';

// Usar para la transición a CANCELADA en citasController.js. El mismo documento
// Cita es escrito por registrarPagoCaja, de modo que MongoDB serializa ambas.
export async function cancelarCitaSiNoTienePagosValidos({ citaId, estadoActual, motivo }) {
  const session = await mongoose.startSession();
  let citaActualizada;
  try {
    await session.withTransaction(async () => {
      const cita = await Cita.findOne({ _id: citaId, estado: estadoActual }).session(session);
      if (!cita) throw Object.assign(new Error('La cita cambió de estado. Recarga e intenta de nuevo.'), { status: 409 });
      if (await Pago.exists({ cita: citaId, estado: 'REGISTRADO' }).session(session)) {
        throw Object.assign(new Error('La cita tiene pagos registrados. Anula primero sus pagos para poder cancelarla.'), { status: 409 });
      }
      cita.estado = 'CANCELADA';
      cita.motivoCancelacion = motivo?.trim() || null;
      await cita.save({ session });
      citaActualizada = cita;
    });
    return citaActualizada;
  } finally { await session.endSession(); }
}
