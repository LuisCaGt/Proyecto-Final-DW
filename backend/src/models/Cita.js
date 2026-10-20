import mongoose from 'mongoose';
import { validDate, validTime } from '../utils/fechas.js';

export const ESTADOS_CITA = ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'];
// RN-13: solo estos estados ocupan la agenda del profesional.
export const ESTADOS_QUE_BLOQUEAN = ['PENDIENTE', 'CONFIRMADA'];
// Cambios de estado permitidos. COMPLETADA y CANCELADA son finales:
// RN-05 (CANCELADA no pasa a COMPLETADA) y RN-06 (COMPLETADA no se reprograma).
export const TRANSICIONES = {
  PENDIENTE: ['CONFIRMADA', 'CANCELADA'],
  CONFIRMADA: ['COMPLETADA', 'CANCELADA'],
  COMPLETADA: [],
  CANCELADA: [],
};
export const ESTADOS_REPROGRAMABLES = ['PENDIENTE', 'CONFIRMADA'];

const schema = new mongoose.Schema({
  paciente: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
  servicio: { type: mongoose.Schema.Types.ObjectId, ref: 'Servicio', required: true },
  profesional: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  // Fecha y horas en hora de Guatemala, tal como se muestran.
  fecha: { type: String, required: true, validate: validDate },
  horaInicio: { type: String, required: true, validate: validTime },
  horaFin: { type: String, required: true, validate: validTime },
  // Los mismos instantes en Date (UTC) para buscar traslapes y ordenar.
  inicio: { type: Date, required: true },
  fin: { type: Date, required: true },
  // Copiados del servicio al programar: si el servicio cambia después, la cita conserva estos valores.
  duracionMinutos: { type: Number, required: true, min: 1, validate: Number.isInteger },
  precioCentavos: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  estado: { type: String, enum: ESTADOS_CITA, default: 'PENDIENTE' },
  observaciones: { type: String, trim: true, maxlength: 2000, default: '' },
  motivoCancelacion: { type: String, trim: true, maxlength: 500, default: null },
  solicitud: { type: mongoose.Schema.Types.ObjectId, ref: 'SolicitudCita', default: null },
}, { timestamps: true, collection: 'citas' }); // createdAt = fecha de creación

schema.index({ profesional: 1, inicio: 1, fin: 1 });
schema.index({ paciente: 1, inicio: -1 });
schema.index({ fecha: 1, estado: 1 });

export const Cita = mongoose.model('Cita', schema);
