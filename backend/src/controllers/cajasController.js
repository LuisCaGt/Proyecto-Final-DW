import mongoose from 'mongoose';
import { Caja } from '../models/Caja.js';
import { Pago } from '../models/Pago.js';
import { calcularCierreCaja } from '../services/calculosCaja.js';

const fail = (res, status, message) => res.status(status).json({ message });
const isId = value => mongoose.isObjectIdOrHexString(value);
const rolesCaja = ['ADMINISTRADOR', 'RECEPCIONISTA'];
const acceso = (req, caja) => req.user.rol === 'ADMINISTRADOR' || String(caja.responsable) === String(req.user._id);

function centavos(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100) return null;
  return Math.round(amount * 100);
}

export async function resumen(cajaId, session) {
  const query = Pago.aggregate([
    { $match: { caja: new mongoose.Types.ObjectId(cajaId), estado: 'REGISTRADO' } },
    { $group: { _id: '$metodo', total: { $sum: '$montoCentavos' }, cantidad: { $sum: 1 } } },
  ]);
  if (session) query.session(session);
  const rows = await query;
  const totals = { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0 };
  const cantidad = { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0 };
  for (const row of rows) { totals[row._id] = row.total; cantidad[row._id] = row.cantidad; }
  return { totalEfectivoCentavos: totals.EFECTIVO, totalTransferenciasCentavos: totals.TRANSFERENCIA,
    totalTarjetaCentavos: totals.TARJETA, totalIngresosCentavos: totals.EFECTIVO + totals.TRANSFERENCIA + totals.TARJETA, cantidad };
}

export async function abrir(req, res) {
  if (!rolesCaja.includes(req.user.rol)) return fail(res, 403, 'No tienes acceso a cajas.');
  const initial = centavos(req.body?.montoInicial);
  if (initial === null) return fail(res, 400, 'montoInicial debe ser un monto válido y no negativo.');
  try { return res.status(201).json(await Caja.create({ responsable: req.user._id, montoInicialCentavos: initial })); }
  catch (error) { if (error.code === 11000) return fail(res, 409, 'Ya tienes una caja abierta.'); throw error; }
}

export async function actual(req, res) {
  if (!rolesCaja.includes(req.user.rol)) return fail(res, 403, 'No tienes acceso a cajas.');
  const caja = await Caja.findOne({ responsable: req.user._id, estado: 'ABIERTA' }).lean();
  if (!caja) return fail(res, 404, 'No tienes una caja abierta.');
  const totales = await resumen(caja._id);
  return res.json({ ...caja, resumen: { ...totales, efectivoEsperadoCentavos: caja.montoInicialCentavos + totales.totalEfectivoCentavos } });
}

export async function listar(req, res) {
  if (!rolesCaja.includes(req.user.rol)) return fail(res, 403, 'No tienes acceso a cajas.');
  const filter = req.user.rol === 'ADMINISTRADOR' ? {} : { responsable: req.user._id };
  const cajas = await Caja.find(filter).sort({ abiertaEn: -1 }).populate('responsable', 'nombres apellidos correo').lean();
  return res.json(await Promise.all(cajas.map(async caja => ({ ...caja, resumen: await resumen(caja._id) }))));
}

export async function detalle(req, res) {
  if (!rolesCaja.includes(req.user.rol)) return fail(res, 403, 'No tienes acceso a cajas.');
  if (!isId(req.params.id)) return fail(res, 400, 'Identificador de caja inválido.');
  const caja = await Caja.findById(req.params.id).populate('responsable', 'nombres apellidos correo').lean();
  if (!caja) return fail(res, 404, 'Caja no encontrada.');
  if (!acceso(req, caja)) return fail(res, 403, 'Solo puedes consultar tus propias cajas.');
  const totales = await resumen(caja._id);
  return res.json({ ...caja, resumen: { ...totales, efectivoEsperadoCentavos: caja.montoInicialCentavos + totales.totalEfectivoCentavos } });
}

export async function movimientos(req, res) {
  if (!rolesCaja.includes(req.user.rol)) return fail(res, 403, 'No tienes acceso a cajas.');
  if (!isId(req.params.id)) return fail(res, 400, 'Identificador de caja inválido.');
  const caja = await Caja.findById(req.params.id).lean();
  if (!caja) return fail(res, 404, 'Caja no encontrada.');
  if (!acceso(req, caja)) return fail(res, 403, 'Solo puedes consultar tus propias cajas.');
  return res.json(await Pago.find({ caja: caja._id }).sort({ registradoEn: 1, _id: 1 })
    .populate('cita', 'fecha horaInicio estado').populate('registradoPor', 'nombres apellidos')
    .populate('anuladoPor', 'nombres apellidos').lean());
}

export async function cerrar(req, res) {
  if (!rolesCaja.includes(req.user.rol)) return fail(res, 403, 'No tienes acceso a cajas.');
  if (!isId(req.params.id)) return fail(res, 400, 'Identificador de caja inválido.');
  const contado = centavos(req.body?.efectivoContado);
  if (contado === null) return fail(res, 400, 'efectivoContado debe ser un monto válido y no negativo.');
  const session = await mongoose.startSession();
  let resultado;
  try {
    await session.withTransaction(async () => {
      const caja = await Caja.findById(req.params.id).session(session);
      if (!caja) throw Object.assign(new Error('Caja no encontrada.'), { status: 404 });
      if (!acceso(req, caja)) throw Object.assign(new Error('Solo puedes cerrar tus propias cajas.'), { status: 403 });
      if (caja.estado !== 'ABIERTA') throw Object.assign(new Error('La caja ya está cerrada.'), { status: 409 });
      const totales = await resumen(caja._id, session);
      const calculo = calcularCierreCaja({ montoInicialCentavos: caja.montoInicialCentavos, efectivoContadoCentavos: contado, totales });
      const cierre = { cerradoPor: req.user._id, cerradoEn: new Date(), efectivoContadoCentavos: contado,
        efectivoEsperadoCentavos: calculo.efectivoEsperadoCentavos, diferenciaCentavos: calculo.diferenciaCentavos,
        faltanteCentavos: calculo.faltanteCentavos, sobranteCentavos: calculo.sobranteCentavos,
        totalEfectivoCentavos: totales.totalEfectivoCentavos,
        totalTransferenciasCentavos: totales.totalTransferenciasCentavos,
        totalTarjetaCentavos: totales.totalTarjetaCentavos, totalIngresosCentavos: totales.totalIngresosCentavos };
      const update = await Caja.updateOne({ _id: caja._id, estado: 'ABIERTA' }, { $set: { estado: 'CERRADA', cierre } }, { session });
      if (!update.modifiedCount) throw Object.assign(new Error('La caja cambió mientras se cerraba.'), { status: 409 });
      resultado = { ...caja.toObject(), estado: 'CERRADA', cierre };
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    if (error.code === 112) return fail(res, 409, 'La caja tuvo un cambio simultáneo. Vuelve a intentar.');
    throw error;
  } finally { await session.endSession(); }
  return res.json(resultado);
}
