import mongoose from 'mongoose';

export const initialHours = Array.from({ length: 7 }, (_, dia) => ({
  dia, abierto: dia !== 0,
  inicio: dia === 0 ? null : '08:00',
  fin: dia === 0 ? null : dia === 6 ? '12:00' : '17:00',
}));
export const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const daySchema = new mongoose.Schema({
  dia: { type: Number, required: true, min: 0, max: 6, validate: Number.isInteger },
  abierto: { type: Boolean, required: true },
  inicio: { type: String, default: null },
  fin: { type: String, default: null },
}, { _id: false });
const schema = new mongoose.Schema({
  _id: { type: String, default: 'atencion', enum: ['atencion'] },
  zonaHoraria: { type: String, enum: ['America/Guatemala'], default: 'America/Guatemala' },
  dias: { type: [daySchema], required: true, validate: {
    validator: days => days.length === 7 && new Set(days.map(day => day.dia)).size === 7 && days.every(day => day.abierto ? validTime(day.inicio) && validTime(day.fin) && day.inicio < day.fin : day.inicio === null && day.fin === null),
    message: 'Configura los siete días con horarios válidos.',
  } },
}, { timestamps: true, collection: 'horarios' });
export const Horario = mongoose.model('Horario', schema);
