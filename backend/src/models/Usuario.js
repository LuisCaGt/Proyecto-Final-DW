// PROVISIONAL — Compañero 2 reemplaza este archivo con el modelo completo de RF-02/RF-13 (contraseña, JWT, etc.).
// El módulo de citas solo usa: nombres, apellidos, rol y estado.
// Si cambian esos nombres, ajustar únicamente services/dependenciasCitas.js.
import mongoose from 'mongoose';

export const ROLES = ['ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL'];
const schema = new mongoose.Schema({
  nombres: { type: String, required: true, trim: true, maxlength: 120 },
  apellidos: { type: String, required: true, trim: true, maxlength: 120 },
  correo: { type: String, required: true, trim: true, lowercase: true, unique: true },
  rol: { type: String, enum: ROLES, required: true },
  estado: { type: String, enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' },
}, { timestamps: true, collection: 'usuarios' });

export const Usuario = mongoose.model('Usuario', schema);
