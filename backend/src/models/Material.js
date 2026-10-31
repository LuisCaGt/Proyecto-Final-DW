import mongoose from 'mongoose';

export const TIPOS_MATERIAL = ['DOCUMENTO', 'VIDEO', 'AUDIO', 'EJERCICIO', 'ENLACE', 'OTRO'];
export const ESTADOS_MATERIAL = ['ACTIVO', 'INACTIVO'];

// Enlace público HTTP/HTTPS sin credenciales. No se almacenan archivos físicos (RF-09).
export function isResourceUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

// Materiales educativos o de apoyo para pacientes. Son distintos de las publicaciones educativas del portal.
const materialSchema = new mongoose.Schema({
  identificador: { type: String, required: true, trim: true, maxlength: 40, unique: true },
  titulo: { type: String, required: true, trim: true, maxlength: 150 },
  descripcion: { type: String, required: true, trim: true, maxlength: 2000 },
  tipo: { type: String, enum: TIPOS_MATERIAL, required: true },
  enlace: { type: String, required: true, trim: true, validate: isResourceUrl },
  fechaRegistro: { type: Date, default: Date.now, immutable: true },
  estado: { type: String, enum: ESTADOS_MATERIAL, default: 'ACTIVO' },
  registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
}, { timestamps: true, collection: 'materiales' });

materialSchema.index({ estado: 1, titulo: 1 });

export const Material = mongoose.model('Material', materialSchema);
