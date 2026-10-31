import mongoose from 'mongoose';
import { Paciente } from '../models/Paciente.js';
import { Responsable } from '../models/Responsable.js';
import { ResponsablePaciente } from '../models/ResponsablePaciente.js';
import { Usuario } from '../models/Usuario.js';
import { isImageUrl } from '../models/Servicio.js';
import { Cita } from '../models/Cita.js';
import { filtroPacientesProfesional } from '../services/dependenciasCitas.js';
import { ageAt, todayInGuatemala } from '../utils/fechas.js';
import { listarMaterialesAsignados } from '../services/materialesPaciente.js';

const editableFields = ['identificador', 'fotografia', 'nombres', 'apellidos', 'fechaNacimiento', 'sexo', 'telefono', 'direccion', 'fechaInicioProceso', 'observacionesAdministrativas', 'estado', 'profesionales'];
const sexes = ['FEMENINO', 'MASCULINO', 'OTRO', 'PREFIERO_NO_DECIR'];
const patientStates = ['ACTIVO', 'INACTIVO'];

function invalid(message, fields) {
  const error = new Error(message); error.status = 400; error.fields = fields; throw error;
}

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) invalid('Identificador de paciente inválido.');
}

function parseDate(value, key, optional = false) {
  if (optional && (value === '' || value === null || value === undefined)) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== value) return undefined;
  if (key === 'fechaNacimiento' && value > todayInGuatemala()) return undefined;
  return date;
}

export function calculateAge(value, now = new Date()) {
  return ageAt(value, todayInGuatemala(now));
}

function validatePatient(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Envía un objeto JSON.');
  const fields = {};
  for (const key of Object.keys(body)) if (!editableFields.includes(key)) fields[key] = 'Campo no permitido.';
  for (const key of ['identificador', 'nombres', 'apellidos', 'sexo', 'fechaNacimiento']) {
    if (!partial && (typeof body[key] !== 'string' || !body[key].trim())) fields[key] = 'Campo obligatorio.';
    if (partial && body[key] !== undefined && (typeof body[key] !== 'string' || !body[key].trim())) fields[key] = 'Campo inválido.';
  }
  for (const [key, max] of [['identificador', 40], ['nombres', 100], ['apellidos', 100], ['telefono', 30], ['direccion', 300], ['observacionesAdministrativas', 3000]]) {
    if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].trim().length > max)) fields[key] = `Máximo ${max} caracteres.`;
  }
  if (body.fechaNacimiento !== undefined && !parseDate(body.fechaNacimiento, 'fechaNacimiento')) fields.fechaNacimiento = 'Usa una fecha real en formato AAAA-MM-DD que no sea futura.';
  if (body.fechaInicioProceso !== undefined && body.fechaInicioProceso !== null && body.fechaInicioProceso !== '' && !parseDate(body.fechaInicioProceso, 'fechaInicioProceso')) fields.fechaInicioProceso = 'Usa una fecha real en formato AAAA-MM-DD.';
  if (body.fotografia !== undefined && body.fotografia !== '' && !isImageUrl(body.fotografia)) fields.fotografia = 'Usa una URL HTTP/HTTPS o una ruta /images/.';
  if (body.sexo !== undefined && !sexes.includes(body.sexo)) fields.sexo = 'Sexo inválido.';
  if (body.estado !== undefined && !patientStates.includes(body.estado)) fields.estado = 'Estado inválido.';
  if (body.profesionales !== undefined && (!Array.isArray(body.profesionales) || body.profesionales.some(id => !mongoose.isObjectIdOrHexString(id)))) fields.profesionales = 'Envía una lista de identificadores válidos.';
  if (Object.keys(fields).length) invalid('Revisa los datos del paciente.', fields);
  return body;
}

async function validateProfessionals(ids) {
  if (ids === undefined) return undefined;
  const professionals = await Usuario.find({ _id: { $in: ids }, rol: 'PROFESIONAL', estado: 'ACTIVO' }).select('_id').lean();
  if (professionals.length !== new Set(ids.map(String)).size) invalid('Uno o más profesionales no existen o están inactivos.', { profesionales: 'Selecciona profesionales activos.' });
  return professionals.map(({ _id }) => _id);
}

function basicPatient(patient) {
  return {
    id: patient._id,
    identificador: patient.identificador,
    nombres: patient.nombres,
    apellidos: patient.apellidos,
    fotografia: patient.fotografia,
    fechaNacimiento: patient.fechaNacimiento,
    edad: calculateAge(patient.fechaNacimiento),
    sexo: patient.sexo,
    estado: patient.estado,
  };
}

function fullPatient(patient) {
  return {
    ...basicPatient(patient),
    fotografia: patient.fotografia,
    telefono: patient.telefono,
    direccion: patient.direccion,
    fechaInicioProceso: patient.fechaInicioProceso,
    observacionesAdministrativas: patient.observacionesAdministrativas,
    profesionales: patient.profesionales,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

export async function listPatients(req, res) {
  const filter = {};
  if (req.user.rol === 'PROFESIONAL') {
    filter.$and = [await filtroPacientesProfesional(req.user._id)];
    filter.estado = 'ACTIVO';
  } else if (patientStates.includes(req.query.estado)) filter.estado = req.query.estado;
  const search = typeof req.query.buscar === 'string' ? req.query.buscar.trim().slice(0, 100) : '';
  if (search) filter.$or = [
    { identificador: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    { nombres: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    { apellidos: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
  ];
  const patients = await Paciente.find(filter).sort({ apellidos: 1, nombres: 1 }).lean();
  res.json(patients.map(req.user.rol === 'PROFESIONAL' ? basicPatient : fullPatient));
}

export async function createPatient(req, res) {
  const data = validatePatient(req.body);
  const professionals = await validateProfessionals(data.profesionales);
  const patient = await Paciente.create({
    ...data,
    fechaNacimiento: parseDate(data.fechaNacimiento, 'fechaNacimiento'),
    fechaInicioProceso: parseDate(data.fechaInicioProceso, 'fechaInicioProceso', true),
    profesionales: professionals || [],
  });
  res.status(201).json(fullPatient(patient));
}

export async function getPatient(req, res) {
  validateId(req.params.id);
  const filter = { _id: req.params.id };
  if (req.user.rol === 'PROFESIONAL') Object.assign(filter, { ...await filtroPacientesProfesional(req.user._id), estado: 'ACTIVO' });
  const patient = await Paciente.findOne(filter).lean();
  if (!patient) return res.status(404).json({ message: 'Paciente no encontrado.' });
  if (req.user.rol === 'PROFESIONAL') return res.json(basicPatient(patient));
  const links = await ResponsablePaciente.find({ paciente: patient._id }).populate('responsable', 'identificador fotografia nombres apellidos telefono correo direccion').lean();
  res.json({
    ...fullPatient(patient),
    responsables: links.filter(link => link.responsable).map(link => ({ ...link.responsable, parentesco: link.parentesco })),
    tieneResponsable: links.some(link => link.responsable),
    menorDeEdad: calculateAge(patient.fechaNacimiento) < 18,
    citas: await Cita.find({ paciente: patient._id }).sort({ inicio: -1 }).populate('profesional', 'nombres apellidos').populate('servicio', 'nombre').lean(),
    materialesAsignados: await listarMaterialesAsignados(patient._id),
    pagos: [],
  });
}

export async function updatePatient(req, res) {
  validateId(req.params.id);
  const data = validatePatient(req.body, true);
  const changes = { ...data };
  if (data.fechaNacimiento !== undefined) changes.fechaNacimiento = parseDate(data.fechaNacimiento, 'fechaNacimiento');
  if (data.fechaInicioProceso !== undefined) changes.fechaInicioProceso = parseDate(data.fechaInicioProceso, 'fechaInicioProceso', true);
  if (data.profesionales !== undefined) changes.profesionales = await validateProfessionals(data.profesionales);
  const patient = await Paciente.findByIdAndUpdate(req.params.id, { $set: changes }, { returnDocument: 'after', runValidators: true });
  if (!patient) return res.status(404).json({ message: 'Paciente no encontrado.' });
  res.json(fullPatient(patient));
}

export async function changePatientState(req, res) {
  validateId(req.params.id);
  const { estado } = req.body || {};
  if (!patientStates.includes(estado)) invalid('Estado inválido.', { estado: 'Usa ACTIVO o INACTIVO.' });
  const patient = await Paciente.findByIdAndUpdate(req.params.id, { $set: { estado } }, { returnDocument: 'after', runValidators: true });
  if (!patient) return res.status(404).json({ message: 'Paciente no encontrado.' });
  res.json(fullPatient(patient));
}

export async function associateGuardian(req, res) {
  validateId(req.params.id);
  const { responsableId, parentesco } = req.body || {};
  if (!mongoose.isObjectIdOrHexString(responsableId) || typeof parentesco !== 'string' || !parentesco.trim() || parentesco.trim().length > 80) invalid('Indica responsable y parentesco válidos.');
  const [patient, guardian] = await Promise.all([Paciente.findById(req.params.id), Responsable.findById(responsableId)]);
  if (!patient) return res.status(404).json({ message: 'Paciente no encontrado.' });
  if (!guardian) return res.status(404).json({ message: 'Responsable no encontrado.' });
  const relation = await ResponsablePaciente.findOneAndUpdate(
    { paciente: patient._id, responsable: guardian._id },
    { $set: { parentesco: parentesco.trim() } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).catch(error => {
    if (error.code === 11000) return ResponsablePaciente.findOne({ paciente: patient._id, responsable: guardian._id });
    throw error;
  });
  res.status(201).json({ id: relation._id, paciente: patient._id, responsable: guardian._id, parentesco: relation.parentesco });
}
