import { BloqueoAgenda } from '../models/BloqueoAgenda.js';
import { Cita, ESTADOS_QUE_BLOQUEAN } from '../models/Cita.js';
import { Horario, initialHours } from '../models/Horario.js';
import { Servicio } from '../models/Servicio.js';
import { addMinutes, ageAt, dayOfWeek, todayInGuatemala, toDate } from '../utils/fechas.js';
import { findPaciente, findProfesional, tieneResponsable } from './dependenciasCitas.js';

export function fail(message, fields, status = 422) { const err = new Error(message); err.status = status; if (fields) err.fields = fields; throw err; }
const DAYS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

// Valida todas las reglas de una cita y devuelve los datos calculados listos para guardar.
// Se reutiliza al programar, reprogramar y convertir una solicitud.
export async function prepararCita({ paciente, servicio, profesional, fecha, horaInicio }) {
  const [pac, serv, prof] = await Promise.all([findPaciente(paciente), Servicio.findById(servicio).lean(), findProfesional(profesional)]);
  const fields = Object.create(null);
  // RN-03 y RN-14: paciente existente y activo. RN-04: menor con responsable.
  if (!pac) fields.paciente = 'El paciente no existe.';
  else if (pac.estado !== 'ACTIVO') fields.paciente = 'El paciente está inactivo y no puede recibir nuevas citas.';
  else if (ageAt(pac.fechaNacimiento, fecha) < 18 && !await tieneResponsable(pac)) fields.paciente = 'El paciente es menor de edad: registra al menos un responsable antes de programar la cita.';
  // RN-03 y RN-07: servicio existente y activo.
  if (!serv) fields.servicio = 'El servicio no existe.';
  else if (serv.estado !== 'ACTIVO') fields.servicio = 'El servicio está inactivo y no puede usarse para nuevas citas.';
  // RN-03: profesional existente, con rol PROFESIONAL y activo.
  if (!prof) fields.profesional = 'El profesional no existe.';
  else if (prof.estado !== 'ACTIVO') fields.profesional = 'El profesional está inactivo.';
  if (Object.keys(fields).length) fail('No se puede programar la cita.', fields);

  const horario = await calcularHorario({ fecha, horaInicio, duracionMinutos: serv.duracionMinutos });
  return {
    paciente, servicio, profesional, fecha, ...horario,
    // RF-07: duración y precio se copian del servicio en este momento.
    duracionMinutos: serv.duracionMinutos, precioCentavos: serv.precioCentavos,
  };
}

// RN-02, RN-11 y RN-12: calcula la hora de fin y verifica que la cita sea futura y quepa en el horario de atención.
export async function calcularHorario({ fecha, horaInicio, duracionMinutos }) {
  const horario = await Horario.findById('atencion').lean();
  const { hora: horaFin, mismoDia } = addMinutes(horaInicio, duracionMinutos);
  const inicio = toDate(fecha, horaInicio), fin = toDate(fecha, horaFin);
  if (fecha < todayInGuatemala() || inicio <= new Date()) fail('No se puede programar la cita.', { horaInicio: 'La fecha y hora ya pasaron.' });
  const dia = (horario?.dias || initialHours).find(item => item.dia === dayOfWeek(fecha));
  if (!dia?.abierto) fail('No se puede programar la cita.', { fecha: `El centro no atiende los ${DAYS[dayOfWeek(fecha)]}.` });
  if (horaInicio < dia.inicio) fail('No se puede programar la cita.', { horaInicio: `El centro abre a las ${dia.inicio} ese día.` });
  if (!mismoDia || horaFin > dia.fin) fail('No se puede programar la cita.', { horaInicio: `Con ${duracionMinutos} minutos de duración la cita terminaría a las ${horaFin}; el horario de ese día es de ${dia.inicio} a ${dia.fin}.` });
  return { horaInicio, horaFin, inicio, fin };
}

// Reprogramar: conserva servicio, duración y precio originales; valida profesional, paciente y nuevo horario.
export async function prepararReprogramacion(cita, { profesional, fecha, horaInicio }) {
  const [pac, prof, serv] = await Promise.all([findPaciente(cita.paciente), findProfesional(profesional), Servicio.findById(cita.servicio).select('estado').lean()]);
  const fields = Object.create(null);
  if (!pac || pac.estado !== 'ACTIVO') fields.paciente = 'El paciente está inactivo y no puede recibir citas.';
  else if (ageAt(pac.fechaNacimiento, fecha) < 18 && !await tieneResponsable(pac)) fields.paciente = 'El paciente menor de edad necesita un responsable antes de reprogramar.';
  if (!serv || serv.estado !== 'ACTIVO') fields.servicio = 'El servicio está inactivo o ya no existe; no se puede reprogramar esta cita.';
  if (!prof) fields.profesional = 'El profesional no existe.';
  else if (prof.estado !== 'ACTIVO') fields.profesional = 'El profesional está inactivo.';
  if (Object.keys(fields).length) fail('No se puede reprogramar la cita.', fields);
  const horario = await calcularHorario({ fecha, horaInicio, duracionMinutos: cita.duracionMinutos });
  return { profesional, fecha, ...horario };
}

// RN-01 y RN-13: busca citas activas del mismo profesional que se crucen con el intervalo.
export function buscarTraslape({ profesional, inicio, fin }, excluirId = null) {
  return Cita.findOne({
    profesional, estado: { $in: ESTADOS_QUE_BLOQUEAN }, inicio: { $lt: fin }, fin: { $gt: inicio },
    ...(excluirId ? { _id: { $ne: excluirId } } : {}),
  }).select('fecha horaInicio horaFin').lean();
}

// Ejecuta `accion` con la agenda del profesional bloqueada para evitar traslapes por solicitudes simultáneas.
export async function conAgendaBloqueada(profesional, accion) {
  const now = new Date();
  try {
    await BloqueoAgenda.findOneAndUpdate(
      { _id: profesional, hasta: { $lt: now } },
      { $set: { hasta: new Date(now.getTime() + 15000) } },
      { upsert: true },
    );
  } catch (error) {
    if (error.code === 11000) fail('La agenda de este profesional se está modificando en este momento. Intenta de nuevo.', null, 409);
    throw error;
  }
  try { return await accion(); }
  finally { await BloqueoAgenda.deleteOne({ _id: profesional }); }
}

export async function verificarDisponibilidad(datos, excluirId = null) {
  const choque = await buscarTraslape(datos, excluirId);
  if (choque) fail('El profesional ya tiene una cita en ese horario.', { horaInicio: `Se cruza con la cita de ${choque.horaInicio} a ${choque.horaFin}.` }, 409);
}
