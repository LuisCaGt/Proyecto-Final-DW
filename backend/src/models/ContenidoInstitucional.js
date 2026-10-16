import mongoose from 'mongoose';
import { isImageUrl } from './Servicio.js';

export const initialContent = {
  nombreCentro: 'Centro Armonía',
  logo: '/images/logo.svg',
  tituloInicio: 'Un espacio para conectar atención y bienestar.',
  descripcionInicio: 'Atención psicológica y estimulación auditiva verbal para acompañar el bienestar y el desarrollo de cada persona.',
  mision: 'Acompañar a las personas y sus familias con atención cercana, respetuosa y orientada a sus necesidades.',
  vision: 'Ser un centro de referencia por la calidad humana y el compromiso con el desarrollo y bienestar de nuestra comunidad.',
};

const schema = new mongoose.Schema({
  _id: { type: String, default: 'principal', enum: ['principal'] },
  nombreCentro: { type: String, required: true, trim: true, maxlength: 100 },
  logo: { type: String, required: true, trim: true, maxlength: 2048, validate: isImageUrl },
  tituloInicio: { type: String, required: true, trim: true, maxlength: 180 },
  descripcionInicio: { type: String, required: true, trim: true, maxlength: 1500 },
  mision: { type: String, required: true, trim: true, maxlength: 3000 },
  vision: { type: String, required: true, trim: true, maxlength: 3000 },
}, { timestamps: true, collection: 'contenidoInstitucional' });

export const ContenidoInstitucional = mongoose.model('ContenidoInstitucional', schema);
