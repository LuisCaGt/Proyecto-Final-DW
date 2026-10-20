import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Servicio } from '../src/models/Servicio.js';
import { SolicitudCita } from '../src/models/SolicitudCita.js';
import { todayInGuatemala } from '../src/utils/fechas.js';

// Requiere ejecutar antes: npm run seed:servicios
const addDays = days => { const d = new Date(`${todayInGuatemala()}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const requests = [
  ['María López', 'maria.lopez@example.com', '5555-1001', 'Atención psicológica', 3, 'Prefiero horario de la mañana.', 'PENDIENTE'],
  ['Carlos Pérez', 'carlos.perez@example.com', '5555-1002', 'Estimulación auditiva verbal', 5, 'Es para mi hijo de 6 años.', 'PENDIENTE'],
  ['Ana García', 'ana.garcia@example.com', '5555-1003', 'Evaluación inicial', 7, '', 'PENDIENTE'],
  ['Jorge Ramírez', 'jorge.ramirez@example.com', '5555-1004', 'Orientación para padres', 2, 'Quisiera información sobre el proceso.', 'RECHAZADA'],
  ['Lucía Morales', 'lucia.morales@example.com', '5555-1005', 'Taller de habilidades sociales', 10, 'Disponible por la tarde.', 'PENDIENTE'],
];
try {
  await connectDatabase();
  for (const [nombreSolicitante, correo, telefono, servicioNombre, dias, mensaje, estado] of requests) {
    const servicio = await Servicio.findOne({ nombre: servicioNombre }).select('_id');
    if (!servicio) throw new Error(`Falta el servicio ${servicioNombre}. Ejecuta npm run seed:servicios.`);
    await SolicitudCita.updateOne({ correo }, { $setOnInsert: {
      nombreSolicitante, correo, telefono, servicio: servicio._id, fechaPreferida: addDays(dias), mensaje, estado,
      ...(estado === 'RECHAZADA' ? { motivoRechazo: 'Sin disponibilidad en la fecha solicitada.', atendidaEn: new Date() } : {}),
    } }, { upsert: true, runValidators: true });
  }
  console.log('Solicitudes ficticias cargadas.');
} catch (error) {
  console.error(error.message || 'No se pudieron cargar las solicitudes.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
