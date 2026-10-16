import mongoose from 'mongoose';

export function isImageUrl(value) {
  if (typeof value !== 'string') return false;
  if (/^\/images\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

const servicioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 120 },
  descripcion: { type: String, required: true, trim: true, maxlength: 2000 },
  duracionMinutos: { type: Number, required: true, min: 1, max: 1440, validate: Number.isInteger },
  precioCentavos: { type: Number, required: true, min: 0, max: 99999999, validate: Number.isSafeInteger },
  imagen: { type: String, required: true, trim: true, maxlength: 2048, validate: isImageUrl },
  estado: { type: String, enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' },
}, { timestamps: true, collection: 'servicios' });

export const Servicio = mongoose.model('Servicio', servicioSchema);
