import mongoose from 'mongoose';
import { isImageUrl } from './Servicio.js';

export function isWebUrl(value) {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}
export function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const base = {
  titulo: { type: String, required: true, trim: true, maxlength: 160 },
  descripcion: { type: String, required: true, trim: true, maxlength: 6000 },
  estado: { type: String, enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' },
};
const publicationSchema = new mongoose.Schema({ ...base,
  fechaPublicacion: { type: String, required: true, validate: isDateOnly },
  imagen: { type: String, default: '', maxlength: 2048, validate: value => value === '' || isImageUrl(value) },
  enlace: { type: String, default: '', maxlength: 2048, validate: value => value === '' || isWebUrl(value) },
}, { timestamps: true, collection: 'publicaciones' });
const activitySchema = new mongoose.Schema({ ...base,
  tipo: { type: String, required: true, enum: ['CAPACITACION', 'ESCUELA_PARA_PADRES', 'OTRA'] },
  imagenes: { type: [String], required: true, validate: { validator: values => values.length >= 1 && values.length <= 5 && values.every(value => value.length <= 2048 && isImageUrl(value)), message: 'Incluye entre una y cinco imágenes válidas.' } },
}, { timestamps: true, collection: 'actividadesCorporativas' });
export const Publicacion = mongoose.model('Publicacion', publicationSchema);
export const ActividadCorporativa = mongoose.model('ActividadCorporativa', activitySchema);
