import mongoose from 'mongoose';
import { Pago } from '../models/Pago.js';
// Se suman solo pagos vigentes contra el precio histórico de la cita; no se guarda un saldo editable.
export async function saldoCita(cita, session) {
  const query = Pago.aggregate([
    { $match: { cita: new mongoose.Types.ObjectId(cita._id), estado: 'REGISTRADO' } },
    { $group: { _id: null, pagado: { $sum: '$montoCentavos' } } },
  ]);
  // Dentro de un cobro, el saldo debe leerse en la misma transacción que registrará el abono.
  if (session) query.session(session);
  const pagadoCentavos = (await query)[0]?.pagado || 0;
  const saldoCentavos = cita.precioCentavos - pagadoCentavos;
  return { precioCentavos: cita.precioCentavos, pagadoCentavos, saldoCentavos,
    estadoFinanciero: saldoCentavos <= 0 ? 'PAGADO' : pagadoCentavos > 0 ? 'PARCIAL' : 'PENDIENTE' };
}
