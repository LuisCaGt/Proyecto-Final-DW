import mongoose from 'mongoose';
import { Caja } from '../models/Caja.js';
import { Cita } from '../models/Cita.js';
import { Pago } from '../models/Pago.js';

// Invocar desde el flujo de cobro existente. La cita y la caja se escriben en
// la misma transacción para serializar cobro/cancelación y cobro/cierre.
export async function registrarPagoCaja({ citaId, usuarioId, metodo, montoCentavos }) {
  if (!mongoose.isObjectIdOrHexString(citaId)) throw Object.assign(new Error('Cita inválida.'), { status: 400 });
  if (!['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].includes(metodo)
    || !Number.isSafeInteger(montoCentavos) || montoCentavos < 1) {
    throw Object.assign(new Error('Método o monto de pago inválido.'), { status: 400 });
  }
  const session = await mongoose.startSession();
  let pago;
  try {
    await session.withTransaction(async () => {
      const cita = await Cita.findById(citaId).session(session);
      if (!cita || cita.estado === 'CANCELADA') throw Object.assign(new Error('La cita no existe o está cancelada.'), { status: 409 });
      const caja = await Caja.findOne({ responsable: usuarioId, estado: 'ABIERTA' }).session(session);
      if (!caja) throw Object.assign(new Error('Debes abrir una caja antes de registrar pagos.'), { status: 409 });
      // Escritura condicional: choca transaccionalmente con el cierre de caja.
      const touched = await Caja.updateOne({ _id: caja._id, estado: 'ABIERTA' }, { $inc: { versionMovimientos: 1 } }, { session });
      if (!touched.modifiedCount) throw Object.assign(new Error('La caja está cerrada.'), { status: 409 });
      // Escritura sobre la cita para que cancelar y cobrar compitan sobre el mismo documento.
      const citaTouched = await Cita.updateOne({ _id: cita._id, estado: { $ne: 'CANCELADA' } }, { $set: { updatedAt: new Date() } }, { session });
      if (!citaTouched.modifiedCount) throw Object.assign(new Error('La cita fue cancelada.'), { status: 409 });
      [pago] = await Pago.create([{ cita: cita._id, caja: caja._id, registradoPor: usuarioId, metodo, montoCentavos }], { session });
    });
    return pago;
  } finally { await session.endSession(); }
}

export async function anularPagoCaja({ pagoId, usuarioId, motivo }) {
  if (!mongoose.isObjectIdOrHexString(pagoId)) throw Object.assign(new Error('Pago inválido.'), { status: 400 });
  const session = await mongoose.startSession();
  let anulado;
  try {
    await session.withTransaction(async () => {
      const pago = await Pago.findById(pagoId).session(session);
      if (!pago) throw Object.assign(new Error('Pago no encontrado.'), { status: 404 });
      if (pago.estado !== 'REGISTRADO') throw Object.assign(new Error('El pago ya está anulado.'), { status: 409 });
      const caja = await Caja.findOne({ _id: pago.caja, estado: 'ABIERTA' }).session(session);
      if (!caja) throw Object.assign(new Error('No se puede anular un pago de una caja cerrada.'), { status: 409 });
      const touched = await Caja.updateOne({ _id: caja._id, estado: 'ABIERTA' }, { $inc: { versionMovimientos: 1 } }, { session });
      if (!touched.modifiedCount) throw Object.assign(new Error('La caja está cerrada.'), { status: 409 });
      const updated = await Pago.findOneAndUpdate({ _id: pago._id, estado: 'REGISTRADO' }, {
        $set: { estado: 'ANULADO', anuladoPor: usuarioId, anuladoEn: new Date(), motivoAnulacion: motivo?.trim() || null },
      }, { session, returnDocument: 'after' });
      if (!updated) throw Object.assign(new Error('El pago cambió simultáneamente.'), { status: 409 });
      anulado = updated;
    });
    return anulado;
  } finally { await session.endSession(); }
}
