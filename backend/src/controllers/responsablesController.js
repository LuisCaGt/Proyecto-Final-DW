import mongoose from 'mongoose';
import { Responsable } from '../models/Responsable.js';
import { ResponsablePaciente } from '../models/ResponsablePaciente.js';
import { Paciente } from '../models/Paciente.js';
import { isImageUrl } from '../models/Servicio.js';

const keys = ['identificador', 'fotografia', 'nombres', 'apellidos', 'telefono', 'correo', 'direccion'];
function invalid(message, fields) {
  const error = new Error(message); error.status = 400; error.fields = fields; throw error;
}
function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) invalid('Identificador de responsable inválido.');
}
function validateBody(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Envía un objeto JSON.');
  const fields = {};
  for (const key of Object.keys(body)) if (!keys.includes(key)) fields[key] = 'Campo no permitido.';
  for (const key of ['identificador', 'fotografia', 'nombres', 'apellidos', 'telefono', 'correo', 'direccion']) {
    if (!partial && (typeof body[key] !== 'string' || !body[key].trim())) fields[key] = 'Campo obligatorio.';
    if (partial && body[key] !== undefined && (typeof body[key] !== 'string' || !body[key].trim())) fields[key] = 'Campo inválido.';
  }
  for (const [key, max] of [['identificador', 40], ['nombres', 100], ['apellidos', 100], ['telefono', 30], ['correo', 254], ['direccion', 300]]) {
    if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].trim().length > max)) fields[key] = `Máximo ${max} caracteres.`;
  }
  if (body.correo && (typeof body.correo !== 'string' || !/^\S+@\S+\.\S+$/.test(body.correo.trim()))) fields.correo = 'Correo inválido.';
  if (body.fotografia !== undefined && body.fotografia !== '' && !isImageUrl(body.fotografia)) fields.fotografia = 'Usa una URL HTTP/HTTPS o una ruta /images/.';
  if (Object.keys(fields).length) invalid('Revisa los datos del responsable.', fields);
  return body;
}

export async function listGuardians(req, res) {
  const search = typeof req.query.buscar === 'string' ? req.query.buscar.trim().slice(0, 100) : '';
  const filter = search ? { $or: ['identificador', 'nombres', 'apellidos', 'telefono', 'correo'].map(key => ({ [key]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } })) } : {};
  const guardians = await Responsable.find(filter).sort({ apellidos: 1, nombres: 1 }).lean();
  res.json(guardians);
}

export async function createGuardian(req, res) {
  const guardian = await Responsable.create(validateBody(req.body));
  res.status(201).json(guardian);
}

export async function updateGuardian(req, res) {
  validateId(req.params.id);
  validateBody(req.body, true);
  const current = await Responsable.findById(req.params.id).lean();
  if (!current) return res.status(404).json({ message: 'Responsable no encontrado.' });
  validateBody(Object.fromEntries(keys.map(key => [key, req.body[key] ?? current[key]])));
  const data = req.body;
  const guardian = await Responsable.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: 'after', runValidators: true });
  if (!guardian) return res.status(404).json({ message: 'Responsable no encontrado.' });
  res.json(guardian);
}

export async function getGuardian(req, res) {
  validateId(req.params.id);
  const guardian = await Responsable.findById(req.params.id).lean();
  if (!guardian) return res.status(404).json({ message: 'Responsable no encontrado.' });
  const links = await ResponsablePaciente.find({ responsable: guardian._id }).populate('paciente', 'identificador nombres apellidos fechaNacimiento estado').lean();
  res.json({ ...guardian, pacientes: links.filter(link => link.paciente).map(link => ({ ...link.paciente, parentesco: link.parentesco })) });
}

export async function listPatientGuardians(req, res) {
  validateId(req.params.id);
  const patient = await Paciente.findById(req.params.id).select('_id');
  if (!patient) return res.status(404).json({ message: 'Paciente no encontrado.' });
  const links = await ResponsablePaciente.find({ paciente: patient._id }).populate('responsable', 'identificador fotografia nombres apellidos telefono correo direccion').lean();
  res.json(links.filter(link => link.responsable).map(link => ({ ...link.responsable, parentesco: link.parentesco })));
}
