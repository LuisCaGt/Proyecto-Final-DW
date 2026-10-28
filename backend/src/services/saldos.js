import mongoose from 'mongoose';
import { Pago } from '../models/Pago.js';
export async function saldoCita(cita, session) {
  const query = Pago.aggregate([
    { $match: { cita: new mongoose.Types.ObjectId(cita._id), estado: 'REGISTRADO' } },
    { $group: { _id: null, pagado: { $sum: '$montoCentavos' } } },
  ]);
  if (session) query.session(session);
  const pagadoCentavos = (await query)[0]?.pagado || 0;
  const saldoCentavos = cita.precioCentavos - pagadoCentavos;
  return { precioCentavos: cita.precioCentavos, pagadoCentavos, saldoCentavos,
    estadoFinanciero: saldoCentavos <= 0 ? 'PAGADO' : pagadoCentavos > 0 ? 'PARCIAL' : 'PENDIENTE' };
}
