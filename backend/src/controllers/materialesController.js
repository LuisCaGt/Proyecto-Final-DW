import mongoose from 'mongoose';
import { Material, TIPOS_MATERIAL, ESTADOS_MATERIAL, isResourceUrl } from '../models/Material.js';
import { AsignacionMaterial } from '../models/AsignacionMaterial.js';
import { Paciente } from '../models/Paciente.js';
import { filtroPacientesProfesional } from '../services/dependenciasCitas.js';
import { listarMaterialesAsignados } from '../services/materialesPaciente.js';

function fail(message, fields, status = 400) { const error = new Error(message); error.status = status; if (fields) error.fields = fields; throw error; }
const isId = value => mongoose.isObjectIdOrHexString(value);
const isObject = body => body && typeof body === 'object' && !Array.isArray(body);
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const editable = ['identificador', 'titulo', 'descripcion', 'tipo', 'enlace'];

function validateMaterial(body) {
  if (!isObject(body)) fail('Envía un objeto JSON.');
  const fields = Object.create(null);
  for (const key of Object.keys(body)) if (!editable.includes(key)) fields[key] = key === 'estado' ? 'Cambia el estado con PATCH /api/materiales/:id/estado.' : 'Campo no permitido.';
  for (const [key, max] of [['identificador', 40], ['titulo', 150], ['descripcion', 2000]]) {
    if (typeof body[key] !== 'string' || !body[key].trim()) fields[key] = 'Campo obligatorio.';
    else if (body[key].trim().length > max) fields[key] = `Máximo ${max} caracteres.`;
  }
  if (!TIPOS_MATERIAL.includes(body.tipo)) fields.tipo = `Usa uno de: ${TIPOS_MATERIAL.join(', ')}.`;
  if (!isResourceUrl(typeof body.enlace === 'string' ? body.enlace.trim() : body.enlace)) fields.enlace = 'Usa un enlace HTTP o HTTPS válido.';
  if (Object.keys(fields).length) fail('Revisa los datos del material.', fields);
  return { identificador: body.identificador.trim(), titulo: body.titulo.trim(), descripcion: body.descripcion.trim(), tipo: body.tipo, enlace: body.enlace.trim() };
}

function duplicateIdentifier(error) {
  if (error.code === 11000) fail('Ya existe un material con ese identificador.', { identificador: 'Identificador en uso.' }, 409);
  throw error;
}

// GET /api/materiales — catálogo. El profesional solo ve materiales activos.
export async function list(req, res) {
  const allowed = ['buscar', 'tipo', 'estado', 'pagina', 'limite'];
  const q = req.query;
  if (Object.keys(q).some(key => !allowed.includes(key) || typeof q[key] !== 'string')) fail('Filtros de materiales inválidos.');
  const { buscar = '', tipo, estado, pagina = '1', limite = '20' } = q;
  if (buscar.length > 100 || (tipo && !TIPOS_MATERIAL.includes(tipo)) || (estado && !ESTADOS_MATERIAL.includes(estado))
    || !/^[1-9]\d{0,5}$/.test(pagina) || !/^[1-9]\d*$/.test(limite) || Number(limite) > 100) fail('Filtros de materiales inválidos.');
  const filter = {};
  if (tipo) filter.tipo = tipo;
  if (req.user.rol === 'PROFESIONAL') filter.estado = 'ACTIVO';
  else if (estado) filter.estado = estado;
  if (buscar.trim()) filter.$or = ['identificador', 'titulo', 'descripcion'].map(key => ({ [key]: { $regex: escape(buscar.trim()), $options: 'i' } }));
  const page = Number(pagina), limit = Number(limite);
  const [materiales, total] = await Promise.all([
    Material.find(filter).sort({ titulo: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Material.countDocuments(filter),
  ]);
  res.json({ materiales, total, pagina: page, totalPaginas: Math.ceil(total / limit) });
}

// GET /api/materiales/:id
export async function getOne(req, res) {
  if (!isId(req.params.id)) fail('Identificador de material inválido.');
  const filter = { _id: req.params.id, ...(req.user.rol === 'PROFESIONAL' ? { estado: 'ACTIVO' } : {}) };
  const material = await Material.findOne(filter).populate('registradoPor', 'nombres apellidos').lean();
  if (!material) return res.status(404).json({ message: 'Material no encontrado.' });
  res.json(material);
}

// POST /api/materiales — solo administrador.
export async function create(req, res) {
  const data = validateMaterial(req.body);
  const material = await Material.create({ ...data, registradoPor: req.user._id }).catch(duplicateIdentifier);
  res.status(201).json(material);
}

// PUT /api/materiales/:id — solo administrador. El estado se cambia aparte.
export async function update(req, res) {
  if (!isId(req.params.id)) fail('Identificador de material inválido.');
  const data = validateMaterial(req.body);
  const material = await Material.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: 'after', runValidators: true }).catch(duplicateIdentifier);
  if (!material) return res.status(404).json({ message: 'Material no encontrado.' });
  res.json(material);
}

// PATCH /api/materiales/:id/estado — desactivación lógica; conserva las asignaciones previas.
export async function changeState(req, res) {
  if (!isId(req.params.id)) fail('Identificador de material inválido.');
  const body = req.body;
  if (!isObject(body) || Object.keys(body).some(key => key !== 'estado') || !ESTADOS_MATERIAL.includes(body.estado)) fail('Envía únicamente el estado.', { estado: 'Usa ACTIVO o INACTIVO.' });
  const material = await Material.findByIdAndUpdate(req.params.id, { $set: { estado: body.estado } }, { returnDocument: 'after', runValidators: true });
  if (!material) return res.status(404).json({ message: 'Material no encontrado.' });
  res.json(material);
}

// El profesional solo accede a pacientes asignados a él o con citas suyas (mismo criterio que pacientes).
async function findAuthorizedPatient(req) {
  if (!isId(req.params.id)) fail('Identificador de paciente inválido.');
  const filter = { _id: req.params.id };
  if (req.user.rol === 'PROFESIONAL') Object.assign(filter, await filtroPacientesProfesional(req.user._id));
  const patient = await Paciente.findOne(filter).select('nombres apellidos estado').lean();
  if (!patient) fail('Paciente no encontrado.', null, 404);
  return patient;
}

// GET /api/pacientes/:id/materiales
export async function listAssigned(req, res) {
  const patient = await findAuthorizedPatient(req);
  res.json(await listarMaterialesAsignados(patient._id));
}

// POST /api/pacientes/:id/materiales — administrador o profesional autorizado.
export async function assign(req, res) {
  const body = req.body;
  if (!isObject(body)) fail('Envía un objeto JSON.');
  const fields = Object.create(null);
  for (const key of Object.keys(body)) if (!['material', 'observaciones'].includes(key)) fields[key] = 'Campo no permitido.';
  if (!isId(body.material)) fields.material = 'Selecciona un material.';
  if (body.observaciones !== undefined && (typeof body.observaciones !== 'string' || body.observaciones.trim().length > 1000)) fields.observaciones = 'Máximo 1000 caracteres.';
  if (Object.keys(fields).length) fail('Revisa los datos de la asignación.', fields);

  const patient = await findAuthorizedPatient(req);
  // RN-09: solo pacientes activos.
  if (patient.estado !== 'ACTIVO') fail('No se pueden asignar materiales a un paciente inactivo.', { paciente: 'Paciente inactivo.' }, 422);
  const material = await Material.findById(body.material).select('estado').lean();
  if (!material) fail('Revisa los datos de la asignación.', { material: 'El material no existe.' }, 422);
  if (material.estado !== 'ACTIVO') fail('Revisa los datos de la asignación.', { material: 'El material está inactivo y no puede asignarse.' }, 422);

  try {
    const asignacion = await AsignacionMaterial.create({ material: material._id, paciente: patient._id, asignadoPor: req.user._id, observaciones: (body.observaciones || '').trim() });
    const saved = await AsignacionMaterial.findById(asignacion._id)
      .populate('material', 'identificador titulo descripcion tipo enlace estado')
      .populate('asignadoPor', 'nombres apellidos rol').lean();
    res.status(201).json(saved);
  } catch (error) {
    if (error.code === 11000) fail('Este material ya está asignado al paciente.', { material: 'Ya asignado.' }, 409);
    throw error;
  }
}
