import mongoose from 'mongoose';
import { Caja } from '../models/Caja.js';
import { Cita } from '../models/Cita.js';
import { Pago } from '../models/Pago.js';
import { saldoCita } from './saldos.js';
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };

export async function registrarPagoCaja({ citaId, usuarioId, metodo, montoCentavos }) {
  if (!mongoose.isObjectIdOrHexString(citaId) || !['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].includes(metodo)
    || !Number.isSafeInteger(montoCentavos) || montoCentavos < 1) fail('Datos del pago inválidos.', 400);
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const cita = await Cita.findById(citaId).session(session);
      if (!cita || cita.estado === 'CANCELADA') fail('La cita no existe o está cancelada.');
      const caja = await Caja.findOne({ responsable: usuarioId, estado: 'ABIERTA' }).session(session);
      if (!caja) fail('Debes abrir tu caja antes de registrar pagos.');
      // Ambas escrituras serializan pagos contra cierre, cancelación y otros cobros.
      await Caja.updateOne({ _id: caja._id, estado: 'ABIERTA' }, { $inc: { versionMovimientos: 1 } }, { session });
      await Cita.updateOne({ _id: cita._id }, { $set: { updatedAt: new Date() } }, { session });
      const saldo = await saldoCita(cita, session);
      if (montoCentavos > saldo.saldoCentavos) fail('El monto supera el saldo pendiente de la cita.');
      const [pago] = await Pago.create([{ paciente: cita.paciente, cita: cita._id, caja: caja._id,
        registradoPor: usuarioId, metodo, montoCentavos }], { session });
      return pago;
    });
  } finally { await session.endSession(); }
}

export async function anularPagoCaja({ pagoId, usuarioId, rol, motivo }) {
  if (!mongoose.isObjectIdOrHexString(pagoId)) fail('Pago inválido.', 400);
  if (typeof motivo !== 'string' || !motivo.trim() || motivo.trim().length > 500) fail('Indica un motivo de 1 a 500 caracteres.', 400);
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const pago = await Pago.findById(pagoId).session(session);
      if (!pago) fail('Pago no encontrado.', 404);
      const caja = await Caja.findById(pago.caja).session(session);
      if (!caja) fail('Caja no encontrada.', 404);
      if (rol !== 'ADMINISTRADOR' && String(caja.responsable) !== String(usuarioId)) fail('Solo puedes anular pagos de tu propia caja.', 403);
      if (caja.estado !== 'ABIERTA') fail('No se puede anular un pago de una caja cerrada.');
      if (pago.estado !== 'REGISTRADO') fail('El pago ya está anulado.');
      await Caja.updateOne({ _id: caja._id }, { $inc: { versionMovimientos: 1 } }, { session });
      await Cita.updateOne({ _id: pago.cita }, { $set: { updatedAt: new Date() } }, { session });
      return Pago.findOneAndUpdate({ _id: pago._id, estado: 'REGISTRADO' }, {
        $set: { estado: 'ANULADO', anuladoPor: usuarioId, anuladoEn: new Date(), motivoAnulacion: motivo.trim() },
      }, { session, returnDocument: 'after', runValidators: true });
    });
  } finally { await session.endSession(); }
}
