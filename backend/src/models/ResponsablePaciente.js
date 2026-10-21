import mongoose from 'mongoose';

const responsablePacienteSchema = new mongoose.Schema({
  responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'Responsable', required: true },
  paciente: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
  parentesco: { type: String, required: true, trim: true, maxlength: 80 },
}, { timestamps: true, collection: 'responsablesPacientes' });

responsablePacienteSchema.index({ responsable: 1, paciente: 1 }, { unique: true });
responsablePacienteSchema.index({ paciente: 1 });

export const ResponsablePaciente = mongoose.model('ResponsablePaciente', responsablePacienteSchema);