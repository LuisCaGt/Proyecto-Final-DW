import mongoose from 'mongoose';
import { validEmail, validPhone } from './MensajeContacto.js';
import { isImageUrl } from './Servicio.js';

export const initialSlides = [
  ['bienestar', 'Bienestar emocional', 'Ilustración de una planta que representa crecimiento y bienestar.'],
  ['escucha', 'Escucha y comunicación', 'Ilustración de ondas de sonido y diálogo.'],
  ['familia', 'Acompañamiento familiar', 'Ilustración de una familia reunida.'],
  ['desarrollo', 'Desarrollo en cada etapa', 'Ilustración de bloques y formas para el aprendizaje.'],
  ['atencion', 'Atención cercana', 'Ilustración de dos personas en un espacio de conversación.'],
].map(([file, titulo, textoAlternativo]) => ({ imagen: `/images/carrusel-${file}.svg`, titulo, textoAlternativo }));

export const initialContact = {
  correo: 'contacto@example.com',
  telefono: '+502 0000 0000',
  direccion: 'Dirección de demostración, Guatemala.',
  texto: 'Escríbenos para solicitar información sobre los servicios y actividades del centro. Los datos de contacto iniciales son ficticios y pueden cambiarse desde administración.',
};
export const initialContent = {
  contacto: initialContact,
  carrusel: initialSlides,
  nombreCentro: 'Centro Armonía',
  logo: '/images/logo.svg',
  tituloInicio: 'Un espacio para conectar atención y bienestar.',
  descripcionInicio: 'Atención psicológica y estimulación auditiva verbal para acompañar el bienestar y el desarrollo de cada persona.',
  mision: 'Acompañar a las personas y sus familias con atención cercana, respetuosa y orientada a sus necesidades.',
  vision: 'Ser un centro de referencia por la calidad humana y el compromiso con el desarrollo y bienestar de nuestra comunidad.',
};

const slideSchema = new mongoose.Schema({
  imagen: { type: String, required: true, maxlength: 2048, validate: isImageUrl },
  titulo: { type: String, required: true, maxlength: 100 },
  textoAlternativo: { type: String, required: true, maxlength: 180 },
}, { _id: false });
const contactSchema = new mongoose.Schema({
  correo: { type: String, required: true, maxlength: 254, validate: validEmail },
  telefono: { type: String, required: true, maxlength: 30, validate: validPhone },
  direccion: { type: String, required: true, maxlength: 300 },
  texto: { type: String, required: true, maxlength: 1000 },
}, { _id: false });
const schema = new mongoose.Schema({
  _id: { type: String, default: 'principal', enum: ['principal'] },
  contacto: { type: contactSchema, default: () => ({ ...initialContact }) },
  carrusel: { type: [slideSchema], default: () => initialSlides.map(slide => ({ ...slide })), validate: { validator: slides => slides.length >= 5 && slides.length <= 10, message: 'Incluye de cinco a diez imágenes.' } },
  nombreCentro: { type: String, required: true, trim: true, maxlength: 100 },
  logo: { type: String, required: true, trim: true, maxlength: 2048, validate: isImageUrl },
  tituloInicio: { type: String, required: true, trim: true, maxlength: 180 },
  descripcionInicio: { type: String, required: true, trim: true, maxlength: 1500 },
  mision: { type: String, required: true, trim: true, maxlength: 3000 },
  vision: { type: String, required: true, trim: true, maxlength: 3000 },
}, { timestamps: true, collection: 'contenidoInstitucional' });

export const ContenidoInstitucional = mongoose.model('ContenidoInstitucional', schema);
