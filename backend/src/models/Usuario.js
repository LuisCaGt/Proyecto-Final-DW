import mongoose from 'mongoose';

const usuarioSchema = new mongoose.Schema({
  identificador: { type: String, required: true, trim: true, maxlength: 40, unique: true },
  nombres: { type: String, required: true, trim: true, maxlength: 100 },
  apellidos: { type: String, required: true, trim: true, maxlength: 100 },
  correo: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  telefono: { type: String, trim: true, maxlength: 30, default: '' },
  rol: { type: String, enum: ['ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL'], required: true },
  estado: { type: String, enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' },
  especialidad: { type: String, trim: true, maxlength: 120, default: '' },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true, collection: 'usuarios' });

export const Usuario = mongoose.model('Usuario', usuarioSchema);