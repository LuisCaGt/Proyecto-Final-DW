import mongoose from 'mongoose';
import { MensajeContacto, validEmail, validPhone } from '../models/MensajeContacto.js';
import { ContenidoInstitucional, initialContent } from '../models/ContenidoInstitucional.js';

function invalid(message, fields) { const err = new Error(message); err.status = 400; err.fields = fields; throw err; }
function validate(body, config = false) {
  const fields = Object.create(null);
  const limits = config ? { correo: 254, telefono: 30, direccion: 300, texto: 1000 } : { nombre: 120, correo: 254, telefono: 30, asunto: 160, mensaje: 5000 };
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Envía un objeto JSON.');
  for (const key of Object.keys(body)) if (!Object.hasOwn(limits, key)) fields[key] = 'Campo no permitido.';
  for (const [key, max] of Object.entries(limits)) if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > max) fields[key] = `Campo obligatorio, máximo ${max} caracteres.`;
  if (typeof body.correo === 'string' && !validEmail(body.correo.trim())) fields.correo = 'Ingresa un correo electrónico válido.';
  if (typeof body.telefono === 'string' && !validPhone(body.telefono.trim())) fields.telefono = 'Ingresa un teléfono válido de 7 a 15 dígitos.';
  if (Object.keys(fields).length) invalid('Revisa los datos de contacto.', fields);
  return Object.fromEntries(Object.keys(limits).map(key => [key, key === 'correo' ? body[key].trim().toLowerCase() : body[key].trim()]));
}
function id(value) { if (!mongoose.isObjectIdOrHexString(value)) invalid('Identificador de mensaje inválido.'); }
export async function createMessage(req, res) {
  await MensajeContacto.create(validate(req.body));
  // El visitante no recibe el documento ni datos de otros remitentes.
  res.status(201).json({ message: 'Mensaje recibido. El centro podrá consultarlo desde su administración.' });
}
export async function updateContact(req, res) {
  if (req.params.id !== 'principal') return res.status(404).json({ message: 'Contenido no encontrado.' });
  const contacto = validate(req.body, true);
  const defaults = Object.fromEntries(Object.entries(initialContent).filter(([key]) => key !== 'contacto'));
  const content = await ContenidoInstitucional.findByIdAndUpdate('principal', { $set: { contacto }, $setOnInsert: defaults }, { upsert: true, returnDocument: 'after', runValidators: true });
  res.json(content);
}
export async function listMessages(req, res) {
  const { pagina = '1', limite = '10', estado, buscar = '' } = req.query;
  if (Object.keys(req.query).some(key => !['pagina', 'limite', 'estado', 'buscar'].includes(key)) || typeof pagina !== 'string' || !/^[1-9]\d*$/.test(pagina) || !Number.isSafeInteger(Number(pagina)) || Number(pagina) > 1000000 || typeof limite !== 'string' || !/^[1-9]\d*$/.test(limite) || Number(limite) > 50 || (estado !== undefined && !['NUEVO', 'LEIDO'].includes(estado)) || typeof buscar !== 'string' || buscar.length > 120) invalid('Filtros de mensajes inválidos.');
  const filter = {};
  if (estado) filter.estado = estado;
  if (buscar.trim()) {
    const escaped = buscar.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['nombre', 'asunto', 'correo'].map(key => ({ [key]: { $regex: escaped, $options: 'i' } }));
  }
  const page = Number(pagina), limit = Number(limite);
  const [mensajes, total] = await Promise.all([
    MensajeContacto.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select('nombre correo asunto estado createdAt').lean(),
    MensajeContacto.countDocuments(filter),
  ]);
  res.json({ mensajes, total, pagina: page, totalPaginas: Math.ceil(total / limit) });
}
export async function getMessage(req, res) {
  id(req.params.id); const message = await MensajeContacto.findById(req.params.id).lean();
  if (!message) return res.status(404).json({ message: 'Mensaje no encontrado.' });
  res.json(message);
}
export async function setMessageState(req, res) {
  id(req.params.id);
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'estado') || !['NUEVO', 'LEIDO'].includes(body.estado)) invalid('Indica un estado NUEVO o LEIDO.');
  const message = await MensajeContacto.findByIdAndUpdate(req.params.id, { $set: { estado: body.estado } }, { returnDocument: 'after', runValidators: true });
  if (!message) return res.status(404).json({ message: 'Mensaje no encontrado.' });
  res.json(message);
}
