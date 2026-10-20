import mongoose from 'mongoose';
import { Cita, ESTADOS_CITA } from '../models/Cita.js';
import { Horario, initialHours } from '../models/Horario.js';
import { Servicio } from '../models/Servicio.js';
import { validDate, validTime } from '../utils/fechas.js';
import { conAgendaBloqueada, fail, prepararCita, verificarDisponibilidad } from '../services/agendaService.js';
import { pacientesActivos, POPULATE_PACIENTE, POPULATE_PROFESIONAL, profesionalesActivos } from '../services/dependenciasCitas.js';

const isId = value => mongoose.isObjectIdOrHexString(value);
const POPULATE = [POPULATE_PACIENTE, POPULATE_PROFESIONAL, { path: 'servicio', select: 'nombre estado' }];

function validateCreate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Envía un objeto JSON.', null, 400);
  const allowed = ['paciente', 'servicio', 'profesional', 'fecha', 'horaInicio', 'observaciones'];
  const fields = Object.create(null);
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fields[key] = 'Campo no permitido.';
  for (const key of ['paciente', 'servicio', 'profesional']) if (!isId(body[key])) fields[key] = 'Selecciona una opción válida.';
  if (!validDate(body.fecha)) fields.fecha = 'Usa una fecha válida (AAAA-MM-DD).';
  if (!validTime(body.horaInicio)) fields.horaInicio = 'Usa una hora válida (HH:mm).';
  if (body.observaciones !== undefined && (typeof body.observaciones !== 'string' || body.observaciones.trim().length > 2000)) fields.observaciones = 'Máximo 2000 caracteres.';
  if (Object.keys(fields).length) fail('Revisa los datos de la cita.', fields, 400);
  return { paciente: body.paciente, servicio: body.servicio, profesional: body.profesional, fecha: body.fecha, horaInicio: body.horaInicio, observaciones: (body.observaciones || '').trim() };
}

// Listas para el formulario de programación.
export async function options(req, res) {
  const [pacientes, profesionales, servicios, horario] = await Promise.all([
    pacientesActivos(), profesionalesActivos(),
    Servicio.find({ estado: 'ACTIVO' }).select('nombre duracionMinutos precioCentavos').sort({ nombre: 1 }).lean(),
    Horario.findById('atencion').lean(),
  ]);
  res.json({ pacientes, profesionales, servicios, horario: horario?.dias || initialHours });
}

// POST /api/citas — programar.
export async function create(req, res) {
  const input = validateCreate(req.body);
  const cita = await conAgendaBloqueada(input.profesional, async () => {
    const datos = await prepararCita(input);
    await verificarDisponibilidad(datos);
    return Cita.create({ ...datos, observaciones: input.observaciones });
  });
  res.status(201).json(await cita.populate(POPULATE));
}

// GET /api/citas — consultar con filtros por profesional, paciente, estado y rango de fechas.
export async function list(req, res) {
  const allowed = ['pagina', 'limite', 'profesional', 'paciente', 'estado', 'desde', 'hasta'];
  const q = req.query;
  if (Object.keys(q).some(key => !allowed.includes(key) || typeof q[key] !== 'string')) fail('Filtros de citas inválidos.', null, 400);
  const { pagina = '1', limite = '20', profesional, paciente, estado, desde, hasta } = q;
  if (!/^[1-9]\d{0,5}$/.test(pagina) || !/^[1-9]\d*$/.test(limite) || Number(limite) > 100
    || (profesional && !isId(profesional)) || (paciente && !isId(paciente)) || (estado && !ESTADOS_CITA.includes(estado))
    || (desde && !validDate(desde)) || (hasta && !validDate(hasta)) || (desde && hasta && desde > hasta)) fail('Filtros de citas inválidos.', null, 400);
  const filter = {};
  if (profesional) filter.profesional = profesional;
  if (paciente) filter.paciente = paciente;
  if (estado) filter.estado = estado;
  if (desde || hasta) filter.fecha = { ...(desde ? { $gte: desde } : {}), ...(hasta ? { $lte: hasta } : {}) };
  const page = Number(pagina), limit = Number(limite);
  const [citas, total] = await Promise.all([
    Cita.find(filter).sort({ inicio: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE).lean(),
    Cita.countDocuments(filter),
  ]);
  res.json({ citas, total, pagina: page, totalPaginas: Math.ceil(total / limit) });
}

// GET /api/citas/:id
export async function getOne(req, res) {
  if (!isId(req.params.id)) fail('Identificador de cita inválido.', null, 400);
  const cita = await Cita.findById(req.params.id).populate(POPULATE).lean();
  if (!cita) return res.status(404).json({ message: 'Cita no encontrada.' });
  res.json(cita);
}
