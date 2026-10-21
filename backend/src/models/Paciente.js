import mongoose from 'mongoose';

const pacienteSchema = new mongoose.Schema({
  identificador: { type: String, required: true, trim: true, maxlength: 40, unique: true },
  fotografia: { type: String, trim: true, maxlength: 2048, default: '' },
  nombres: { type: String, required: true, trim: true, maxlength: 100 },
  apellidos: { type: String, required: true, trim: true, maxlength: 100 },
  fechaNacimiento: { type: Date, required: true },
  sexo: { type: String, enum: ['FEMENINO', 'MASCULINO', 'OTRO', 'PREFIERO_NO_DECIR'], required: true },
  telefono: { type: String, trim: true, maxlength: 30, default: '' },
  direccion: { type: String, trim: true, maxlength: 300, default: '' },
  fechaInicioProceso: { type: Date, default: null },
  observacionesAdministrativas: { type: String, trim: true, maxlength: 3000, default: '' },
  estado: { type: String, enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' },
  profesionales: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
}, { timestamps: true, collection: 'pacientes' });

pacienteSchema.index({ apellidos: 1, nombres: 1 });
pacienteSchema.index({ profesionales: 1, estado: 1 });

export const Paciente = mongoose.model('Paciente', pacienteSchema);