import mongoose from 'mongoose';
import { SolicitudCita, ESTADOS_SOLICITUD } from '../models/SolicitudCita.js';
import { Servicio } from '../models/Servicio.js';
import { validEmail, validPhone } from '../models/MensajeContacto.js';
import { todayInGuatemala, validDate, validTime } from '../utils/fechas.js';
import { Cita } from '../models/Cita.js';
import { conAgendaBloqueada, prepararCita, verificarDisponibilidad } from '../services/agendaService.js';

function invalid(message, fields, status = 400) { const err = new Error(message); err.status = status; if (fields) err.fields = fields; throw err; }
function id(value) { if (!mongoose.isObjectIdOrHexString(value)) invalid('Identificador de solicitud inválido.'); }
const CITA = { path: 'cita', select: 'fecha horaInicio horaFin estado' };
const isObject = body => body && typeof body === 'object' && !Array.isArray(body);

function validate(body) {
  if (!isObject(body)) invalid('Envía un objeto JSON.');
  const allowed = ['nombreSolicitante', 'correo', 'telefono', 'servicio', 'fechaPreferida', 'mensaje'];
  const fields = Object.create(null);
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fields[key] = 'Campo no permitido.';
  if (typeof body.nombreSolicitante !== 'string' || !body.nombreSolicitante.trim() || body.nombreSolicitante.trim().length > 120) fields.nombreSolicitante = 'Campo obligatorio, máximo 120 caracteres.';
  if (typeof body.correo !== 'string' || !validEmail(body.correo.trim())) fields.correo = 'Ingresa un correo electrónico válido.';
  if (typeof body.telefono !== 'string' || !validPhone(body.telefono.trim())) fields.telefono = 'Ingresa un teléfono válido de 7 a 15 dígitos.';
  if (!mongoose.isObjectIdOrHexString(body.servicio)) fields.servicio = 'Selecciona un servicio.';
  if (!validDate(body.fechaPreferida)) fields.fechaPreferida = 'Usa una fecha válida.';
  else if (body.fechaPreferida < todayInGuatemala()) fields.fechaPreferida = 'La fecha preferida no puede estar en el pasado.';
  if (body.mensaje !== undefined && (typeof body.mensaje !== 'string' || body.mensaje.trim().length > 2000)) fields.mensaje = 'Máximo 2000 caracteres.';
  if (Object.keys(fields).length) invalid('Revisa los datos de la solicitud.', fields);
  return {
    nombreSolicitante: body.nombreSolicitante.trim(), correo: body.correo.trim().toLowerCase(), telefono: body.telefono.trim(),
    servicio: body.servicio, fechaPreferida: body.fechaPreferida, mensaje: (body.mensaje || '').trim(),
  };
}

// Público: crea la solicitud en estado PENDIENTE. No reserva horario.
export async function create(req, res) {
  const data = validate(req.body);
  const servicio = await Servicio.exists({ _id: data.servicio, estado: 'ACTIVO' });
  if (!servicio) invalid('Revisa los datos de la solicitud.', { servicio: 'El servicio no está disponible.' });
  await SolicitudCita.create(data);
  res.status(201).json({ message: 'Solicitud recibida. El centro se comunicará contigo para confirmar fecha y hora.' });
}

// Privado: bandeja con filtros y paginación.
export async function list(req, res) {
  const { pagina = '1', limite = '10', estado, buscar = '' } = req.query;
  if (Object.keys(req.query).some(key => !['pagina', 'limite', 'estado', 'buscar'].includes(key)) || typeof pagina !== 'string' || !/^[1-9]\d{0,5}$/.test(pagina) || typeof limite !== 'string' || !/^[1-9]\d*$/.test(limite) || Number(limite) > 50 || (estado !== undefined && !ESTADOS_SOLICITUD.includes(estado)) || typeof buscar !== 'string' || buscar.length > 120) invalid('Filtros de solicitudes inválidos.');
  const filter = {};
  if (estado) filter.estado = estado;
  if (buscar.trim()) {
    const escaped = buscar.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['nombreSolicitante', 'correo', 'telefono'].map(key => ({ [key]: { $regex: escaped, $options: 'i' } }));
  }
  const page = Number(pagina), limit = Number(limite);
  const [solicitudes, total] = await Promise.all([
    SolicitudCita.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate('servicio', 'nombre duracionMinutos estado').populate(CITA).lean(),
    SolicitudCita.countDocuments(filter),
  ]);
  res.json({ solicitudes, total, pagina: page, totalPaginas: Math.ceil(total / limit) });
}

export async function getOne(req, res) {
  id(req.params.id);
  const solicitud = await SolicitudCita.findById(req.params.id).populate('servicio', 'nombre duracionMinutos precioCentavos estado').populate(CITA).lean();
  if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada.' });
  res.json(solicitud);
}

// Privado: rechaza solo si sigue PENDIENTE. El filtro por estado hace la operación atómica.
export async function reject(req, res) {
  id(req.params.id);
  const body = req.body ?? {};
  if (!isObject(body) || Object.keys(body).some(key => key !== 'motivo') || (body.motivo !== undefined && (typeof body.motivo !== 'string' || body.motivo.trim().length > 500))) invalid('Envía únicamente un motivo de hasta 500 caracteres.');
  const solicitud = await SolicitudCita.findOneAndUpdate(
    { _id: req.params.id, estado: 'PENDIENTE' },
    { $set: { estado: 'RECHAZADA', motivoRechazo: body.motivo?.trim() || null, atendidaEn: new Date() } },
    { returnDocument: 'after', runValidators: true },
  ).populate('servicio', 'nombre duracionMinutos estado');
  if (solicitud) return res.json(solicitud);
  const exists = await SolicitudCita.exists({ _id: req.params.id });
  if (!exists) return res.status(404).json({ message: 'Solicitud no encontrada.' });
  res.status(409).json({ message: 'La solicitud ya fue atendida o rechazada.' });
}

// Privado: convierte una solicitud PENDIENTE en una cita de un paciente registrado.
// La cita pasa por las mismas reglas que al programar (RN-01..04, 07, 11..14) y la solicitud queda ATENDIDA con su referencia.
export async function convert(req, res) {
  id(req.params.id);
  const body = req.body;
  if (!isObject(body)) invalid('Envía un objeto JSON.');
  const allowed = ['paciente', 'servicio', 'profesional', 'fecha', 'horaInicio', 'observaciones'];
  const fields = Object.create(null);
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fields[key] = 'Campo no permitido.';
  for (const key of ['paciente', 'servicio', 'profesional']) if (!mongoose.isObjectIdOrHexString(body[key])) fields[key] = 'Selecciona una opción válida.';
  if (!validDate(body.fecha)) fields.fecha = 'Usa una fecha válida (AAAA-MM-DD).';
  if (!validTime(body.horaInicio)) fields.horaInicio = 'Usa una hora válida (HH:mm).';
  if (body.observaciones !== undefined && (typeof body.observaciones !== 'string' || body.observaciones.trim().length > 2000)) fields.observaciones = 'Máximo 2000 caracteres.';
  if (Object.keys(fields).length) invalid('Revisa los datos de la cita.', fields);

  const solicitud = await SolicitudCita.findById(req.params.id).select('estado').lean();
  if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada.' });
  if (solicitud.estado !== 'PENDIENTE') invalid('La solicitud ya fue atendida o rechazada.', null, 409);

  const cita = await conAgendaBloqueada(body.profesional, async () => {
    const datos = await prepararCita(body);
    await verificarDisponibilidad(datos);
    try { return await Cita.create({ ...datos, observaciones: (body.observaciones || '').trim(), solicitud: req.params.id }); }
    catch (error) { if (error.code === 11000) invalid('Esta solicitud ya fue convertida en cita.', null, 409); throw error; }
  });

  // Marca la solicitud solo si sigue PENDIENTE. Si otra persona la rechazó mientras tanto, se deshace la cita.
  const atendida = await SolicitudCita.findOneAndUpdate(
    { _id: req.params.id, estado: 'PENDIENTE' },
    { $set: { estado: 'ATENDIDA', cita: cita._id, atendidaEn: new Date() } },
    { returnDocument: 'after', runValidators: true },
  ).populate('servicio', 'nombre duracionMinutos estado').populate(CITA);
  if (!atendida) { await Cita.deleteOne({ _id: cita._id }); invalid('La solicitud cambió de estado mientras la convertías.', null, 409); }
  res.status(201).json(atendida);
}
