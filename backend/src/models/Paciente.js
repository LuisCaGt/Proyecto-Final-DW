// PROVISIONAL — Compañero 2 reemplaza este archivo con el modelo completo de RF-03.
// El módulo de citas solo usa: nombres, apellidos, fechaNacimiento, estado y responsables.
// Si cambian esos nombres, ajustar únicamente services/dependenciasCitas.js.
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  nombres: { type: String, required: true, trim: true, maxlength: 120 },
  apellidos: { type: String, required: true, trim: true, maxlength: 120 },
  fechaNacimiento: { type: Date, required: true },
  estado: { type: String, enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' },
  responsables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Responsable' }],
}, { timestamps: true, collection: 'pacientes' });

export const Paciente = mongoose.model('Paciente', schema);
