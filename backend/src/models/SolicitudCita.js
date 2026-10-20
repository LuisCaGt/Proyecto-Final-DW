import mongoose from 'mongoose';
import { validEmail, validPhone } from './MensajeContacto.js';
import { validDate } from '../utils/fechas.js';

export const ESTADOS_SOLICITUD = ['PENDIENTE', 'ATENDIDA', 'RECHAZADA'];

const schema = new mongoose.Schema({
  nombreSolicitante: { type: String, required: true, trim: true, maxlength: 120 },
  correo: { type: String, required: true, trim: true, lowercase: true, validate: validEmail },
  telefono: { type: String, required: true, trim: true, validate: validPhone },
  servicio: { type: mongoose.Schema.Types.ObjectId, ref: 'Servicio', required: true },
  fechaPreferida: { type: String, required: true, validate: validDate },
  mensaje: { type: String, trim: true, maxlength: 2000, default: '' },
  estado: { type: String, enum: ESTADOS_SOLICITUD, default: 'PENDIENTE' },
  // Se completa al convertir la solicitud en cita (paso 2). Una solicitud ATENDIDA siempre conserva su cita.
  cita: { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', default: null },
  motivoRechazo: { type: String, trim: true, maxlength: 500, default: null },
  atendidaEn: { type: Date, default: null },
}, { timestamps: true, collection: 'solicitudesCita' });
schema.index({ estado: 1, createdAt: -1 });

export const SolicitudCita = mongoose.model('SolicitudCita', schema);
