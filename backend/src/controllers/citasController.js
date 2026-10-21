import mongoose from 'mongoose';
import { Cita, ESTADOS_CITA, ESTADOS_REPROGRAMABLES, TRANSICIONES } from '../models/Cita.js';
import { Horario, initialHours } from '../models/Horario.js';
import { Servicio } from '../models/Servicio.js';
import { validDate, validTime } from '../utils/fechas.js';
import { conAgendaBloqueada, fail, prepararCita, prepararReprogramacion, verificarDisponibilidad } from '../services/agendaService.js';
import { listarPacientes, listarProfesionales, POPULATE_PACIENTE, POPULATE_PROFESIONAL } from '../services/dependenciasCitas.js';
import { tienePagosValidos } from '../services/pagosCitas.js';

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

// Listas para formularios y filtros. Incluye inactivos (con su estado) para consultar historiales;
// el backend igual rechaza inactivos al programar.
export async function options(req, res) {
  const [pacientes, profesionales, servicios, horario] = await Promise.all([
    listarPacientes(), listarProfesionales(),
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
  await findCita(req.params.id);
  res.json(await Cita.findById(req.params.id).populate(POPULATE).lean());
}

async function findCita(id) {
  if (!isId(id)) fail('Identificador de cita inválido.', null, 400);
  const cita = await Cita.findById(id).lean();
  if (!cita) fail('Cita no encontrada.', null, 404);
  return cita;
}

// PUT /api/citas/:id — reprogramar (profesional, fecha, hora) y editar observaciones.
export async function update(req, res) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Envía un objeto JSON.', null, 400);
  const fields = Object.create(null);
  for (const key of Object.keys(body)) if (!['profesional', 'fecha', 'horaInicio', 'observaciones'].includes(key)) fields[key] = 'Campo no permitido.';
  if (!isId(body.profesional)) fields.profesional = 'Selecciona un profesional.';
  if (!validDate(body.fecha)) fields.fecha = 'Usa una fecha válida (AAAA-MM-DD).';
  if (!validTime(body.horaInicio)) fields.horaInicio = 'Usa una hora válida (HH:mm).';
  if (body.observaciones !== undefined && (typeof body.observaciones !== 'string' || body.observaciones.trim().length > 2000)) fields.observaciones = 'Máximo 2000 caracteres.';
  if (Object.keys(fields).length) fail('Revisa los datos de la cita.', fields, 400);

  const cita = await findCita(req.params.id);
  // RN-06: una cita COMPLETADA (o CANCELADA) no puede reprogramarse.
  if (!ESTADOS_REPROGRAMABLES.includes(cita.estado)) fail(`Una cita ${cita.estado.toLowerCase()} no puede reprogramarse.`, null, 409);

  const mismoHorario = String(cita.profesional) === body.profesional && cita.fecha === body.fecha && cita.horaInicio === body.horaInicio;
  const actualizada = await conAgendaBloqueada(body.profesional, async () => {
    const cambios = mismoHorario ? {} : await prepararReprogramacion(cita, body);
    if (!mismoHorario) await verificarDisponibilidad({ profesional: body.profesional, inicio: cambios.inicio, fin: cambios.fin }, cita._id);
    // Al cambiar el horario la cita vuelve a PENDIENTE para confirmarse de nuevo.
    const set = { ...cambios, ...(mismoHorario ? {} : { estado: 'PENDIENTE' }), ...(body.observaciones !== undefined ? { observaciones: body.observaciones.trim() } : {}) };
    // Se exige el mismo updatedAt para no pisar un cambio hecho por otra persona al mismo tiempo.
    return Cita.findOneAndUpdate({ _id: cita._id, estado: { $in: ESTADOS_REPROGRAMABLES }, updatedAt: cita.updatedAt }, { $set: set }, { returnDocument: 'after', runValidators: true }).populate(POPULATE);
  });
  if (!actualizada) fail('La cita fue modificada por otra persona. Recarga e intenta de nuevo.', null, 409);
  res.json(actualizada);
}

// PATCH /api/citas/:id/estado — confirmar, completar o cancelar.
export async function changeState(req, res) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['estado', 'motivo'].includes(key))) fail('Envía estado y, opcionalmente, motivo.', null, 400);
  if (!ESTADOS_CITA.includes(body.estado)) fail('Revisa los datos.', { estado: 'Estado inválido.' }, 400);
  if (body.motivo !== undefined && (typeof body.motivo !== 'string' || body.motivo.trim().length > 500)) fail('Revisa los datos.', { motivo: 'Máximo 500 caracteres.' }, 400);

  const cita = await findCita(req.params.id);
  // RN-05 y estados finales: solo se permiten las transiciones definidas.
  if (!TRANSICIONES[cita.estado].includes(body.estado)) {
    const permitidas = TRANSICIONES[cita.estado].map(e => e.toLowerCase()).join(' o ');
    fail(`Una cita ${cita.estado.toLowerCase()} no puede pasar a ${body.estado.toLowerCase()}.${permitidas ? ` Solo puede pasar a ${permitidas}.` : ''}`, null, 409);
  }
  if (body.estado === 'COMPLETADA' && new Date(cita.inicio) > new Date()) fail('No se puede completar una cita que aún no ha comenzado.', null, 409);
  // RN-27: no se cancela una cita con pagos válidos.
  if (body.estado === 'CANCELADA' && await tienePagosValidos(cita._id)) fail('La cita tiene pagos registrados. Anula primero sus pagos para poder cancelarla.', null, 409);

  const set = { estado: body.estado, ...(body.estado === 'CANCELADA' ? { motivoCancelacion: body.motivo?.trim() || null } : {}) };
  // El filtro por estado actual evita que dos cambios simultáneos se pisen.
  const actualizada = await Cita.findOneAndUpdate({ _id: cita._id, estado: cita.estado }, { $set: set }, { returnDocument: 'after', runValidators: true }).populate(POPULATE);
  if (!actualizada) fail('La cita cambió de estado mientras la editabas. Recarga e intenta de nuevo.', null, 409);
  res.json(actualizada);
}

// GET /api/citas/calendario?desde=AAAA-MM-DD&hasta=AAAA-MM-DD — citas de un rango para el calendario (RF-08).
// Sin paginación, por eso el rango se limita a 62 días (un mes visible más los días de relleno).
export async function calendar(req, res) {
  const q = req.query;
  if (Object.keys(q).some(key => !['desde', 'hasta', 'profesional', 'estado'].includes(key) || typeof q[key] !== 'string')) fail('Filtros de calendario inválidos.', null, 400);
  const { desde, hasta, profesional, estado } = q;
  if (!validDate(desde) || !validDate(hasta) || desde > hasta) fail('Indica un rango válido con desde y hasta.', null, 400);
  if ((Date.parse(hasta) - Date.parse(desde)) / 86400000 > 62) fail('El rango del calendario no puede superar 62 días.', null, 400);
  if ((profesional && !isId(profesional)) || (estado && !ESTADOS_CITA.includes(estado))) fail('Filtros de calendario inválidos.', null, 400);
  const filter = { fecha: { $gte: desde, $lte: hasta }, ...(profesional ? { profesional } : {}), ...(estado ? { estado } : {}) };
  const citas = await Cita.find(filter).sort({ inicio: 1 })
    .select('fecha horaInicio horaFin estado precioCentavos duracionMinutos observaciones paciente servicio profesional')
    .populate(POPULATE).lean();
  res.json(citas);
}
