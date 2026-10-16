import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Servicio } from '../src/models/Servicio.js';

const services = [
  ['Atención psicológica', 'Acompañamiento psicológico individual para favorecer el bienestar emocional.', 60, 25000],
  ['Estimulación auditiva verbal', 'Actividades de apoyo para el desarrollo de la escucha y la comunicación verbal.', 45, 20000],
  ['Orientación para padres', 'Un espacio de orientación para acompañar el desarrollo y bienestar de la familia.', 60, 22500],
  ['Evaluación inicial', 'Entrevista inicial para conocer las necesidades y orientar el proceso de atención.', 90, 35000],
  ['Taller de habilidades sociales', 'Actividades guiadas para fortalecer la comunicación y la interacción con otras personas.', 60, 15000],
];
try {
  await connectDatabase();
  for (const [nombre, descripcion, duracionMinutos, precioCentavos] of services) {
    await Servicio.updateOne({ nombre }, { $setOnInsert: { nombre, descripcion, duracionMinutos, precioCentavos, imagen: '/images/servicio.svg', estado: 'ACTIVO' } }, { upsert: true, runValidators: true });
  }
  console.log('Servicios ficticios cargados. Los servicios existentes conservan sus cambios.');
} catch {
  console.error('No se pudieron cargar los servicios. Revisa la conexión a MongoDB.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
