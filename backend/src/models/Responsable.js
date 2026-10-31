import mongoose from 'mongoose';

const responsableSchema = new mongoose.Schema({
  identificador: { type: String, required: true, trim: true, maxlength: 40, unique: true },
  fotografia: { type: String, trim: true, maxlength: 2048, required: true },
  nombres: { type: String, required: true, trim: true, maxlength: 100 },
  apellidos: { type: String, required: true, trim: true, maxlength: 100 },
  telefono: { type: String, required: true, trim: true, maxlength: 30 },
  correo: { type: String, trim: true, lowercase: true, maxlength: 254, required: true },
  direccion: { type: String, trim: true, maxlength: 300, required: true },
}, { timestamps: true, collection: 'responsables' });

export const Responsable = mongoose.model('Responsable', responsableSchema);