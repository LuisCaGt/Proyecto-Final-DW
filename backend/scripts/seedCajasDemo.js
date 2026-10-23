import 'dotenv/config';
import mongoose from 'mongoose';
import { Caja } from '../src/models/Caja.js';
import { Pago } from '../src/models/Pago.js';
import { Usuario } from '../src/models/Usuario.js';
import { Cita } from '../src/models/Cita.js';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Define MONGODB_URI en el archivo .env del backend.');

try {
  await mongoose.connect(uri);
  const usuario = await Usuario.findOne({ rol: 'RECEPCIONISTA', estado: 'ACTIVO' }).sort({ createdAt: 1 });
  const cita = await Cita.findOne().sort({ createdAt: 1 });
  if (!usuario || !cita) throw new Error('Ejecuta primero los seeds del proyecto para crear recepcionistas y citas.');

  const specs = [
    { key: 'demo-cerrada-ejemplo', initial: 20000, status: 'CERRADA', payments: [['EFECTIVO', 50000], ['TRANSFERENCIA', 35000], ['TARJETA', 15000]], counted: 69000 },
    { key: 'demo-cerrada-vacia', initial: 10000, status: 'CERRADA', payments: [], counted: 10000 },
    { key: 'demo-abierta', initial: 5000, status: 'ABIERTA', payments: [['EFECTIVO', 2500]], counted: null },
  ];
  for (const spec of specs) {
    const totals = spec.payments.reduce((acc, [method, amount]) => ({ ...acc, [method]: (acc[method] || 0) + amount }), {});
    const cash = totals.EFECTIVO || 0;
    const sum = cash + (totals.TRANSFERENCIA || 0) + (totals.TARJETA || 0);
    const difference = spec.counted === null ? null : spec.counted - (spec.initial + cash);
    const cierre = spec.status === 'CERRADA' ? {
      cerradoPor: usuario._id, cerradoEn: new Date(), efectivoContadoCentavos: spec.counted,
      efectivoEsperadoCentavos: spec.initial + cash, diferenciaCentavos: difference,
      faltanteCentavos: Math.max(0, -difference), sobranteCentavos: Math.max(0, difference),
      totalEfectivoCentavos: cash, totalTransferenciasCentavos: totals.TRANSFERENCIA || 0,
      totalTarjetaCentavos: totals.TARJETA || 0, totalIngresosCentavos: sum,
    } : null;
    const caja = await Caja.findOneAndUpdate({ seedKey: spec.key }, {
      $set: { responsable: usuario._id, montoInicialCentavos: spec.initial, estado: spec.status, cierre, abiertaEn: new Date() },
      $setOnInsert: { seedKey: spec.key },
    }, { upsert: true, new: true, runValidators: true });
    await Pago.deleteMany({ caja: caja._id });
    if (spec.payments.length) await Pago.create(spec.payments.map(([metodo, montoCentavos]) => ({
      cita: cita._id, caja: caja._id, registradoPor: usuario._id, metodo, montoCentavos, estado: 'REGISTRADO',
    })));
    console.log(`${spec.key}: ${caja._id} (${spec.status})`);
  }
} finally { await mongoose.disconnect(); }
