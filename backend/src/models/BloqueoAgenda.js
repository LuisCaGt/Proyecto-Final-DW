import mongoose from 'mongoose';

// Un documento por profesional mientras se valida y guarda una cita.
// Evita que dos solicitudes simultáneas creen citas traslapadas (RN-01).
const schema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId },
  hasta: { type: Date, required: true },
}, { collection: 'bloqueosAgenda', versionKey: false });

export const BloqueoAgenda = mongoose.model('BloqueoAgenda', schema);
