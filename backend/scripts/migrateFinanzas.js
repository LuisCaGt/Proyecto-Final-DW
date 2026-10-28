import 'dotenv/config';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
// Ejecutar sin el backend activo. No elimina movimientos ni modifica cierres.
await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
try {
  const db = mongoose.connection.db;
  const names = (await db.listCollections().toArray()).map(c=>c.name);
  if (names.includes('cajas')) {
    await db.collection('cajas').updateMany({ seedKey: null }, { $unset: { seedKey: '' } });
    const index = (await db.collection('cajas').indexes()).find(i=>i.name==='seedKey_1');
    if (index && !index.partialFilterExpression) await db.collection('cajas').dropIndex('seedKey_1');
  }
  if (names.includes('pagos')) for await (const pago of db.collection('pagos').find({})) {
    const cita = await db.collection('citas').findOne({ _id: pago.cita });
    if (!cita) throw new Error('Pago sin cita: ' + pago._id + '. Revisa el registro antes de continuar.');
    await db.collection('pagos').updateOne({ _id: pago._id }, { $set: {
      paciente: cita.paciente, comprobante: pago.comprobante || 'SIGCA-' + randomUUID(),
    } });
  }
  const { Caja } = await import('../src/models/Caja.js');
  const { Pago } = await import('../src/models/Pago.js');
  await Caja.createIndexes(); await Pago.createIndexes();
  console.log('Índices y comprobantes financieros preparados.');
} finally { await mongoose.disconnect(); }
