import mongoose from 'mongoose';
import { Servicio, isImageUrl } from '../models/Servicio.js';

function validateBody(body, stateOnly = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Envía un objeto JSON.'); error.status = 400; throw error;
  }
  const allowed = stateOnly ? ['estado'] : ['nombre', 'descripcion', 'duracionMinutos', 'precioCentavos', 'imagen', 'estado'];
  const errors = Object.create(null);
  for (const key of Object.keys(body)) if (!allowed.includes(key)) errors[key] = 'Campo no permitido.';
  if (!stateOnly) {
    for (const [key, max] of [['nombre', 120], ['descripcion', 2000]]) {
      if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > max) errors[key] = `Campo obligatorio, máximo ${max} caracteres.`;
    }
    if (!Number.isInteger(body.duracionMinutos) || body.duracionMinutos < 1 || body.duracionMinutos > 1440) errors.duracionMinutos = 'Usa minutos enteros entre 1 y 1440.';
    if (!Number.isSafeInteger(body.precioCentavos) || body.precioCentavos < 0 || body.precioCentavos > 99999999) errors.precioCentavos = 'Envía un entero en centavos entre 0 y 99999999.';
    if (!isImageUrl(body.imagen) || body.imagen.length > 2048) errors.imagen = 'Usa una URL HTTP/HTTPS o una imagen de /images/.';
  }
  if ((stateOnly || body.estado !== undefined) && !['ACTIVO', 'INACTIVO'].includes(body.estado)) errors.estado = 'Estado inválido.';
  if (Object.keys(errors).length) {
    const error = new Error('Revisa los campos del servicio.'); error.status = 400; error.fields = errors; throw error;
  }
  return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
}

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) { const error = new Error('Identificador de servicio inválido.'); error.status = 400; throw error; }
}

export async function listPublic(req, res) {
  res.json(await Servicio.find({ estado: 'ACTIVO' }).sort({ nombre: 1 }).lean());
}
export async function listAdmin(req, res) {
  res.json(await Servicio.find().sort({ nombre: 1 }).lean());
}
export async function getPublic(req, res) {
  validateId(req.params.id);
  const service = await Servicio.findOne({ _id: req.params.id, estado: 'ACTIVO' }).lean();
  if (!service) return res.status(404).json({ message: 'Servicio no encontrado.' });
  res.json(service);
}
export async function create(req, res) {
  const service = await Servicio.create(validateBody(req.body));
  res.status(201).json(service);
}
export async function update(req, res) {
  validateId(req.params.id);
  const data = validateBody(req.body);
  const service = await Servicio.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: 'after', runValidators: true });
  if (!service) return res.status(404).json({ message: 'Servicio no encontrado.' });
  res.json(service);
}
export async function changeState(req, res) {
  validateId(req.params.id);
  const data = validateBody(req.body, true);
  const service = await Servicio.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: 'after', runValidators: true });
  if (!service) return res.status(404).json({ message: 'Servicio no encontrado.' });
  res.json(service);
}
