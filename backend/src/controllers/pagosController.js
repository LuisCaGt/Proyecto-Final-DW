import mongoose from 'mongoose';
import { Pago } from '../models/Pago.js';
import { Cita } from '../models/Cita.js';
import { anularPagoCaja, registrarPagoCaja } from '../services/pagosCaja.js';
import { saldoCita } from '../services/saldos.js';
import { aCentavos } from '../utils/montos.js';
import { validDate } from '../utils/fechas.js';
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const isId = value => mongoose.isObjectIdOrHexString(value);
const populate = [{ path: 'paciente', select: 'identificador nombres apellidos' },
  { path: 'cita', select: 'fecha horaInicio precioCentavos servicio', populate: { path: 'servicio', select: 'nombre' } },
  { path: 'caja', select: 'estado responsable' }, { path: 'registradoPor', select: 'nombres apellidos' },
  { path: 'anuladoPor', select: 'nombres apellidos' }];
function pageQuery(q, extras = []) {
  if (Object.keys(q).some(k => !['pagina','limite',...extras].includes(k) || typeof q[k] !== 'string')) fail('Filtros inválidos.');
  const pagina = q.pagina || '1', limite = q.limite || '10';
  if (!/^[1-9]\d{0,5}$/.test(pagina) || !/^[1-9]\d?$/.test(limite) || Number(limite) > 50) fail('Paginación inválida.');
  return { page: Number(pagina), limit: Number(limite) };
}
export async function registrar(req, res) {
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b) || Object.keys(b).some(k => !['cita','metodo','monto'].includes(k))) fail('Envía cita, metodo y monto.');
  const montoCentavos = aCentavos(b.monto, false);
  if (!isId(b.cita) || !['EFECTIVO','TRANSFERENCIA','TARJETA'].includes(b.metodo) || montoCentavos === null) fail('Cita, método o monto inválido.');
  const pago = await registrarPagoCaja({ citaId: b.cita, usuarioId: req.user._id, metodo: b.metodo, montoCentavos });
  res.status(201).json(await Pago.findById(pago._id).populate(populate).lean());
}
export async function anular(req, res) {
  if (!isId(req.params.id)) fail('Identificador de pago inválido.');
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b) || Object.keys(b).some(k => k !== 'motivo')) fail('Envía únicamente el motivo de anulación.');
  const pago = await anularPagoCaja({ pagoId: req.params.id, usuarioId: req.user._id, rol: req.user.rol, motivo: b.motivo });
  res.json(pago);
}
export async function listar(req, res) {
  const q = req.query;
  const { page, limit } = pageQuery(q, ['paciente','cita','metodo','estado','desde','hasta']);
  const filter = {};
  for (const key of ['paciente','cita']) if (q[key]) { if (!isId(q[key])) fail('Identificador inválido.'); filter[key] = q[key]; }
  if (q.metodo) { if (!['EFECTIVO','TRANSFERENCIA','TARJETA'].includes(q.metodo)) fail('Método inválido.'); filter.metodo = q.metodo; }
  if (q.estado) { if (!['REGISTRADO','ANULADO'].includes(q.estado)) fail('Estado inválido.'); filter.estado = q.estado; }
  if ((q.desde && !validDate(q.desde)) || (q.hasta && !validDate(q.hasta)) || (q.desde && q.hasta && q.desde > q.hasta)) fail('Rango de fechas inválido.');
  if (q.desde || q.hasta) filter.registradoEn = { ...(q.desde ? { $gte: new Date(q.desde + 'T00:00:00-06:00') } : {}), ...(q.hasta ? { $lte: new Date(q.hasta + 'T23:59:59.999-06:00') } : {}) };
  const [pagos,total] = await Promise.all([Pago.find(filter).sort({ registradoEn: -1, _id: -1 }).skip((page-1)*limit).limit(limit).populate(populate).lean(), Pago.countDocuments(filter)]);
  res.json({ pagos, total, pagina: page, totalPaginas: Math.ceil(total/limit) });
}
export async function detalle(req,res) {
  if (!isId(req.params.id)) fail('Identificador de pago inválido.');
  const pago = await Pago.findById(req.params.id).populate(populate).lean();
  if (!pago) fail('Pago no encontrado.',404);
  res.json(pago);
}
export async function listarDeCita(req,res) {
  const id = req.params.citaId || req.params.id;
  if (!isId(id)) fail('Identificador de cita inválido.');
  if (!await Cita.exists({ _id:id })) fail('Cita no encontrada.',404);
  res.json(await Pago.find({ cita:id }).sort({ registradoEn:1, _id:1 }).populate(populate).lean());
}
export async function saldo(req,res) {
  if (!isId(req.params.id)) fail('Identificador de cita inválido.');
  const cita = await Cita.findById(req.params.id).lean();
  if (!cita) fail('Cita no encontrada.',404);
  res.json(await saldoCita(cita));
}
export async function citasConSaldo(req,res) {
  const { page,limit } = pageQuery(req.query,['paciente']);
  const filter = {};
  if (req.query.paciente) { if (!isId(req.query.paciente)) fail('Paciente inválido.'); filter.paciente = req.query.paciente; }
  const [citas,total] = await Promise.all([Cita.find(filter).sort({ inicio:-1,_id:-1 }).skip((page-1)*limit).limit(limit).populate('paciente','nombres apellidos').populate('servicio','nombre').lean(),Cita.countDocuments(filter)]);
  res.json({ citas: await Promise.all(citas.map(async c=>({ ...c, financiero: await saldoCita(c) }))), total, pagina:page, totalPaginas:Math.ceil(total/limit) });
}
