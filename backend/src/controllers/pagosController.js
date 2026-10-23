import mongoose from 'mongoose';
import { Pago } from '../models/Pago.js';
import { anularPagoCaja, registrarPagoCaja } from '../services/pagosCaja.js';

const rolesPago = ['ADMINISTRADOR', 'RECEPCIONISTA'];
const fail = (res, status, message) => res.status(status).json({ message });
const isId = value => mongoose.isObjectIdOrHexString(value);

function convertirCentavos(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const scaled = amount * 100;
  const rounded = Math.round(scaled);
  return Math.abs(scaled - rounded) < 1e-7 && Number.isSafeInteger(rounded) ? rounded : null;
}

export async function registrar(req, res) {
  if (!rolesPago.includes(req.user.rol)) return fail(res, 403, 'No tienes permiso para registrar pagos.');
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => !['cita', 'metodo', 'monto'].includes(key))) {
    return fail(res, 400, 'Envía cita, metodo y monto.');
  }
  const montoCentavos = convertirCentavos(body.monto);
  if (!isId(body.cita) || !['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].includes(body.metodo) || montoCentavos === null) {
    return fail(res, 400, 'Cita, método o monto inválido.');
  }
  try {
    const pago = await registrarPagoCaja({ citaId: body.cita, usuarioId: req.user._id, metodo: body.metodo, montoCentavos });
    return res.status(201).json(pago);
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    throw error;
  }
}

export async function anular(req, res) {
  if (!rolesPago.includes(req.user.rol)) return fail(res, 403, 'No tienes permiso para anular pagos.');
  if (!isId(req.params.id)) return fail(res, 400, 'Identificador de pago inválido.');
  const body = req.body || {};
  if (typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => key !== 'motivo')
    || (body.motivo !== undefined && (typeof body.motivo !== 'string' || body.motivo.trim().length > 500))) {
    return fail(res, 400, 'Motivo inválido; máximo 500 caracteres.');
  }
  try {
    const pago = await anularPagoCaja({ pagoId: req.params.id, usuarioId: req.user._id, motivo: body.motivo });
    return res.json(pago);
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    throw error;
  }
}

export async function listarDeCita(req, res) {
  if (!rolesPago.includes(req.user.rol)) return fail(res, 403, 'No tienes permiso para consultar pagos.');
  if (!isId(req.params.citaId)) return fail(res, 400, 'Identificador de cita inválido.');
  const pagos = await Pago.find({ cita: req.params.citaId }).sort({ registradoEn: 1, _id: 1 }).lean();
  return res.json(pagos);
}
