// Citas de ejemplo con fechas pasadas para probar "completar" e historial.
// Se insertan directamente (sin las validaciones de programación) porque representan citas ya ocurridas.
// Requiere: npm run seed:servicios y npm run seed:agenda-provisional
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Cita } from '../src/models/Cita.js';
import { Paciente } from '../src/models/Paciente.js';
import { Servicio } from '../src/models/Servicio.js';
import { Usuario } from '../src/models/Usuario.js';
import { addMinutes, todayInGuatemala, toDate } from '../src/utils/fechas.js';

// Día hábil (lunes a viernes) n días hábiles antes de hoy.
function pastWeekday(n) {
  const d = new Date(`${todayInGuatemala()}T12:00:00Z`);
  while (n > 0) { d.setUTCDate(d.getUTCDate() - 1); const day = d.getUTCDay(); if (day !== 0 && day !== 6) n--; }
  return d.toISOString().slice(0, 10);
}
// [paciente, servicio, correo profesional, días hábiles atrás, hora, estado, observaciones]
const citas = [
  ['Ana Lucía Méndez', 'Atención psicológica', 'laura.gomez@sigca.test', 1, '09:00', 'CONFIRMADA', 'Lista para marcar como completada.'],
  ['Diego Castillo', 'Evaluación inicial', 'pedro.sandoval@sigca.test', 2, '10:00', 'COMPLETADA', ''],
  ['Ana Lucía Méndez', 'Orientación para padres', 'carmen.ortiz@sigca.test', 3, '14:00', 'CANCELADA', ''],
  ['Roberto Juárez', 'Atención psicológica', 'laura.gomez@sigca.test', 5, '08:00', 'COMPLETADA', 'Última cita antes de desactivar al paciente.'],
];
try {
  await connectDatabase();
  for (const [pacienteNombre, servicioNombre, correo, dias, horaInicio, estado, observaciones] of citas) {
    const paciente = await Paciente.findOne({ $expr: { $eq: [{ $concat: ['$nombres', ' ', '$apellidos'] }, pacienteNombre] } }).select('_id');
    const servicio = await Servicio.findOne({ nombre: servicioNombre }).lean();
    const profesional = await Usuario.findOne({ correo }).select('_id');
    if (!paciente || !servicio || !profesional) throw new Error('Faltan datos base. Ejecuta seed:servicios y seed:agenda-provisional.');
    const fecha = pastWeekday(dias), { hora: horaFin } = addMinutes(horaInicio, servicio.duracionMinutos);
    await Cita.updateOne({ paciente: paciente._id, fecha, horaInicio }, { $setOnInsert: {
      paciente: paciente._id, servicio: servicio._id, profesional: profesional._id, fecha, horaInicio, horaFin,
      inicio: toDate(fecha, horaInicio), fin: toDate(fecha, horaFin),
      duracionMinutos: servicio.duracionMinutos, precioCentavos: servicio.precioCentavos, estado, observaciones,
      ...(estado === 'CANCELADA' ? { motivoCancelacion: 'El paciente no pudo asistir.' } : {}),
    } }, { upsert: true, runValidators: true });
  }
  console.log('Citas de ejemplo cargadas.');
} catch (error) {
  console.error(error.message || 'No se pudieron cargar las citas.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
