import mongoose from 'mongoose';
import { Usuario } from '../models/Usuario.js';
import { hashPassword } from '../utils/security.js';

const roles = ['ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL'];
const estados = ['ACTIVO', 'INACTIVO'];
const publicUser = user => ({
  id: user._id,
  identificador: user.identificador,
  nombres: user.nombres,
  apellidos: user.apellidos,
  correo: user.correo,
  telefono: user.telefono,
  rol: user.rol,
  estado: user.estado,
  especialidad: user.especialidad,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

function invalid(message, fields) {
  const error = new Error(message); error.status = 400; error.fields = fields; throw error;
}

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) invalid('Identificador de usuario inválido.');
}

function validateUser(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Envía un objeto JSON.');
  const allowed = ['identificador', 'nombres', 'apellidos', 'correo', 'telefono', 'rol', 'estado', 'especialidad', 'password'];
  const fields = {};
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fields[key] = 'Campo no permitido.';
  if (partial && body.password !== undefined) fields.password = 'Usa la operación protegida de restablecimiento de contraseña.';
  const required = ['identificador', 'nombres', 'apellidos', 'correo', 'rol'];
  for (const key of required) {
    if (!partial && (typeof body[key] !== 'string' || !body[key].trim())) fields[key] = 'Campo obligatorio.';
    if (partial && body[key] !== undefined && (typeof body[key] !== 'string' || !body[key].trim())) fields[key] = 'Campo inválido.';
  }
  for (const key of ['identificador', 'nombres', 'apellidos', 'correo', 'telefono', 'especialidad']) {
    const max = key === 'correo' ? 254 : key === 'especialidad' ? 120 : key === 'identificador' ? 40 : key === 'telefono' ? 30 : 100;
    if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].trim().length > max)) fields[key] = `Máximo ${max} caracteres.`;
  }
  if (body.correo !== undefined && (typeof body.correo !== 'string' || !/^\S+@\S+\.\S+$/.test(body.correo.trim()))) fields.correo = 'Correo inválido.';
  if (body.rol !== undefined && !roles.includes(body.rol)) fields.rol = 'Rol inválido.';
  if (body.estado !== undefined && !estados.includes(body.estado)) fields.estado = 'Estado inválido.';
  if (body.password !== undefined && (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128)) fields.password = 'La contraseña debe tener entre 12 y 128 caracteres.';
  if (!partial && !body.password) fields.password = 'Contraseña obligatoria, mínimo 12 caracteres.';
  if (Object.keys(fields).length) invalid('Revisa los datos del usuario.', fields);
  return body;
}

export async function listUsers(req, res) {
  const users = await Usuario.find().sort({ apellidos: 1, nombres: 1 }).lean();
  res.json(users.map(publicUser));
}

export async function createUser(req, res) {
  const data = validateUser(req.body);
  const user = await Usuario.create({
    identificador: data.identificador,
    nombres: data.nombres,
    apellidos: data.apellidos,
    correo: data.correo,
    telefono: data.telefono || '',
    rol: data.rol,
    estado: data.estado || 'ACTIVO',
    especialidad: data.especialidad || '',
    passwordHash: await hashPassword(data.password),
  });
  res.status(201).json(publicUser(user));
}

export async function updateUser(req, res) {
  validateId(req.params.id);
  const data = validateUser(req.body, true);
  const target = await Usuario.findById(req.params.id);
  if (!target) return res.status(404).json({ message: 'Usuario no encontrado.' });
  if (String(target._id) === String(req.user._id) && data.rol && data.rol !== target.rol) return res.status(403).json({ message: 'No puedes cambiar tu propio rol.' });
  if (String(target._id) === String(req.user._id) && data.estado === 'INACTIVO') return res.status(403).json({ message: 'No puedes desactivar tu propia cuenta.' });
  const removesActiveAdmin = target.rol === 'ADMINISTRADOR' && target.estado === 'ACTIVO' && ((data.rol && data.rol !== 'ADMINISTRADOR') || data.estado === 'INACTIVO');
  if (removesActiveAdmin && await Usuario.countDocuments({ rol: 'ADMINISTRADOR', estado: 'ACTIVO' }) <= 1) {
    return res.status(409).json({ message: 'Debe permanecer al menos un administrador activo.' });
  }
  const changes = { ...data };
  delete changes.password;
  const user = await Usuario.findByIdAndUpdate(req.params.id, { $set: changes }, { returnDocument: 'after', runValidators: true });
  res.json(publicUser(user));
}

export async function changeUserState(req, res) {
  validateId(req.params.id);
  const { estado } = req.body || {};
  if (!estados.includes(estado)) invalid('Estado inválido.', { estado: 'Usa ACTIVO o INACTIVO.' });
  const target = await Usuario.findById(req.params.id);
  if (!target) return res.status(404).json({ message: 'Usuario no encontrado.' });
  if (String(target._id) === String(req.user._id) && estado === 'INACTIVO') return res.status(403).json({ message: 'No puedes desactivar tu propia cuenta.' });
  if (target.rol === 'ADMINISTRADOR' && target.estado === 'ACTIVO' && estado === 'INACTIVO' && await Usuario.countDocuments({ rol: 'ADMINISTRADOR', estado: 'ACTIVO' }) <= 1) {
    return res.status(409).json({ message: 'Debe permanecer al menos un administrador activo.' });
  }
  target.estado = estado;
  await target.save();
  res.json(publicUser(target));
}

export async function resetPassword(req, res) {
  validateId(req.params.id);
  const { password } = req.body || {};
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) invalid('La contraseña debe tener entre 12 y 128 caracteres.', { password: 'Usa entre 12 y 128 caracteres.' });
  const user = await Usuario.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
  user.passwordHash = await hashPassword(password);
  await user.save();
  res.json({ message: 'Contraseña restablecida.' });
}

export async function listActiveProfessionals(req, res) {
  const users = await Usuario.find({ rol: 'PROFESIONAL', estado: 'ACTIVO' }).select('identificador nombres apellidos especialidad telefono').sort({ apellidos: 1, nombres: 1 }).lean();
  res.json(users.map(user => ({ id: user._id, ...user })));
}
