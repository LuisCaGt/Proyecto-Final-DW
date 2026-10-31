import mongoose from 'mongoose';

// Material asignado a un paciente, con trazabilidad de quién y cuándo lo asignó.
const asignacionSchema = new mongoose.Schema({
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
  paciente: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
  asignadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fechaAsignacion: { type: Date, default: Date.now, immutable: true },
  observaciones: { type: String, trim: true, maxlength: 1000, default: '' },
}, { timestamps: true, collection: 'asignacionesMateriales' });

// Evita asignar dos veces el mismo material al mismo paciente, aunque lleguen dos solicitudes a la vez.
asignacionSchema.index({ material: 1, paciente: 1 }, { unique: true });
asignacionSchema.index({ paciente: 1, fechaAsignacion: -1 });

export const AsignacionMaterial = mongoose.model('AsignacionMaterial', asignacionSchema);
