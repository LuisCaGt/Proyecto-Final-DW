import mongoose from 'mongoose';

export const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
export const validPhone = value => typeof value === 'string' && value.length <= 30 && /^\+?[()\d\s.-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15;
const schema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 120 },
  correo: { type: String, required: true, trim: true, lowercase: true, validate: validEmail },
  telefono: { type: String, required: true, trim: true, validate: validPhone },
  asunto: { type: String, required: true, trim: true, maxlength: 160 },
  mensaje: { type: String, required: true, trim: true, maxlength: 5000 },
  estado: { type: String, enum: ['NUEVO', 'LEIDO'], default: 'NUEVO' },
}, { timestamps: true, collection: 'mensajesContacto' });
schema.index({ createdAt: -1, _id: -1 });
export const MensajeContacto = mongoose.model('MensajeContacto', schema);
