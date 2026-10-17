import mongoose from 'mongoose';
import { Publicacion, ActividadCorporativa, isWebUrl, isDateOnly } from '../models/Editorial.js';
import { isImageUrl } from '../models/Servicio.js';

function validate(body, publication, stateOnly = false) {
  const fields = Object.create(null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) { const err = new Error('Envía un objeto JSON.'); err.status = 400; throw err; }
  const allowed = stateOnly ? ['estado'] : ['titulo', 'descripcion', 'estado', ...(publication ? ['fechaPublicacion', 'imagen', 'enlace'] : ['tipo', 'imagenes'])];
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fields[key] = 'Campo no permitido.';
  if (!stateOnly) {
    for (const [key, max] of [['titulo', 160], ['descripcion', 6000]]) if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > max) fields[key] = `Campo obligatorio, máximo ${max} caracteres.`;
    if (publication) {
      if (!isDateOnly(body.fechaPublicacion)) fields.fechaPublicacion = 'Usa una fecha válida en formato AAAA-MM-DD.';
      if (body.imagen !== undefined && (typeof body.imagen !== 'string' || body.imagen.length > 2048 || (body.imagen.trim() && !isImageUrl(body.imagen.trim())))) fields.imagen = 'Usa una imagen HTTP/HTTPS o de /images/.';
      if (body.enlace !== undefined && (typeof body.enlace !== 'string' || body.enlace.length > 2048 || (body.enlace.trim() && !isWebUrl(body.enlace.trim())))) fields.enlace = 'Usa un enlace HTTP/HTTPS válido.';
    } else {
      if (!['CAPACITACION', 'ESCUELA_PARA_PADRES', 'OTRA'].includes(body.tipo)) fields.tipo = 'Selecciona un tipo de actividad válido.';
      if (!Array.isArray(body.imagenes) || body.imagenes.length < 1 || body.imagenes.length > 5 || body.imagenes.some(value => typeof value !== 'string' || value.length > 2048 || !isImageUrl(value.trim()))) fields.imagenes = 'Incluye entre una y cinco imágenes válidas.';
    }
  }
  if ((stateOnly || body.estado !== undefined) && !['ACTIVO', 'INACTIVO'].includes(body.estado)) fields.estado = 'Estado inválido.';
  if (Object.keys(fields).length) { const err = new Error('Revisa los campos del contenido.'); err.status = 400; err.fields = fields; throw err; }
  const normalized = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
  if (!stateOnly && publication) { normalized.imagen ??= ''; normalized.enlace ??= ''; }
  if (!stateOnly && !publication) normalized.imagenes = normalized.imagenes.map(value => value.trim());
  return normalized;
}
function id(value) { if (!mongoose.isObjectIdOrHexString(value)) { const err = new Error('Identificador inválido.'); err.status = 400; throw err; } }
export function editorialController(publication) {
  const Model = publication ? Publicacion : ActividadCorporativa;
  const sort = publication ? { fechaPublicacion: -1, _id: -1 } : { createdAt: -1, _id: -1 };
  return {
    async listPublic(req, res) { res.json(await Model.find({ estado: 'ACTIVO' }).sort(sort).lean()); },
    async listAdmin(req, res) { res.json(await Model.find().sort(sort).lean()); },
    async getPublic(req, res) { id(req.params.id); const item = await Model.findOne({ _id: req.params.id, estado: 'ACTIVO' }).lean(); if (!item) return res.status(404).json({ message: 'Contenido no encontrado.' }); res.json(item); },
    async create(req, res) { res.status(201).json(await Model.create(validate(req.body, publication))); },
    async update(req, res) { id(req.params.id); const data = validate(req.body, publication); const item = await Model.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: 'after', runValidators: true }); if (!item) return res.status(404).json({ message: 'Contenido no encontrado.' }); res.json(item); },
    async changeState(req, res) { id(req.params.id); const data = validate(req.body, publication, true); const item = await Model.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: 'after', runValidators: true }); if (!item) return res.status(404).json({ message: 'Contenido no encontrado.' }); res.json(item); },
  };
}
