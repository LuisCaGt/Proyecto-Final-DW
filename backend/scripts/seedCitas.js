// 15 citas de demostración: pasadas (historial, completadas, canceladas, una confirmada para completar)
// y futuras (pendientes y confirmadas). Una de ellas proviene de una solicitud ATENDIDA (RF-06).
// Se insertan directamente porque las pasadas no podrían programarse con RN-11, pero respetan el horario
// de atención y se omiten si chocan con una cita activa existente (RN-01).
// Requiere: npm run seed:servicios y npm run seed:agenda-provisional
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Cita } from '../src/models/Cita.js';
import { Paciente } from '../src/models/Paciente.js';
import { Servicio } from '../src/models/Servicio.js';
import { SolicitudCita } from '../src/models/SolicitudCita.js';
import { Usuario } from '../src/models/Usuario.js';
import { buscarTraslape } from '../src/services/agendaService.js';
import { addMinutes, todayInGuatemala, toDate } from '../src/utils/fechas.js';

// Día hábil (lunes a viernes) a n días hábiles de hoy; negativo = pasado.
function weekday(n) {
  const d = new Date(`${todayInGuatemala()}T12:00:00Z`), step = Math.sign(n);
  let left = Math.abs(n);
  while (left > 0) { d.setUTCDate(d.getUTCDate() + step); const day = d.getUTCDay(); if (day !== 0 && day !== 6) left--; }
  return d.toISOString().slice(0, 10);
}
// [paciente, servicio, correo del profesional, días hábiles (negativo = pasado), hora, estado, observaciones, desdeSolicitud]
const citas = [
  ['Ana Lucía Méndez', 'Atención psicológica', 'laura.gomez@sigca.test', -1, '09:00', 'CONFIRMADA', 'Lista para marcar como completada.'],
  ['Diego Castillo', 'Evaluación inicial', 'pedro.sandoval@sigca.test', -2, '10:00', 'COMPLETADA', ''],
  ['Ana Lucía Méndez', 'Orientación para padres', 'carmen.ortiz@sigca.test', -3, '14:00', 'CANCELADA', ''],
  ['Sofía Herrera', 'Estimulación auditiva verbal', 'carmen.ortiz@sigca.test', -4, '10:00', 'COMPLETADA', 'Asistió con su responsable.'],
  ['Roberto Juárez', 'Atención psicológica', 'laura.gomez@sigca.test', -5, '08:00', 'COMPLETADA', 'Última cita antes de desactivar al paciente.'],
  ['Diego Castillo', 'Atención psicológica', 'laura.gomez@sigca.test', -6, '11:00', 'COMPLETADA', ''],
  ['Sofía Herrera', 'Estimulación auditiva verbal', 'carmen.ortiz@sigca.test', -7, '10:00', 'CANCELADA', ''],
  ['Ana Lucía Méndez', 'Atención psicológica', 'laura.gomez@sigca.test', 3, '08:00', 'CONFIRMADA', ''],
  ['Diego Castillo', 'Taller de habilidades sociales', 'pedro.sandoval@sigca.test', 3, '10:00', 'PENDIENTE', ''],
  ['Sofía Herrera', 'Estimulación auditiva verbal', 'carmen.ortiz@sigca.test', 4, '09:00', 'CONFIRMADA', ''],
  ['Ana Lucía Méndez', 'Orientación para padres', 'carmen.ortiz@sigca.test', 5, '14:00', 'PENDIENTE', ''],
  ['Diego Castillo', 'Evaluación inicial', 'laura.gomez@sigca.test', 6, '13:00', 'PENDIENTE', 'Programada desde solicitud del portal.', true],
  ['Sofía Herrera', 'Orientación para padres', 'pedro.sandoval@sigca.test', 8, '15:00', 'PENDIENTE', ''],
  ['Ana Lucía Méndez', 'Atención psicológica', 'laura.gomez@sigca.test', 10, '08:00', 'PENDIENTE', ''],
  ['Diego Castillo', 'Atención psicológica', 'pedro.sandoval@sigca.test', 10, '09:00', 'CONFIRMADA', ''],
];
const fullName = { $concat: ['$nombres', ' ', '$apellidos'] };
let creadas = 0, omitidas = 0;
try {
  await connectDatabase();
  for (const [pacienteNombre, servicioNombre, correo, dias, horaInicio, estado, observaciones, desdeSolicitud] of citas) {
    const paciente = await Paciente.findOne({ $expr: { $eq: [fullName, pacienteNombre] } }).select('_id');
    const servicio = await Servicio.findOne({ nombre: servicioNombre }).lean();
    const profesional = await Usuario.findOne({ correo }).select('_id');
    if (!paciente || !servicio || !profesional) throw new Error('Faltan datos base. Ejecuta seed:servicios y seed:agenda-provisional.');
    const fecha = weekday(dias), { hora: horaFin } = addMinutes(horaInicio, servicio.duracionMinutos);
    const inicio = toDate(fecha, horaInicio), fin = toDate(fecha, horaFin);
    if (await Cita.exists({ paciente: paciente._id, fecha, horaInicio })) continue; // ya cargada antes
    if (['PENDIENTE', 'CONFIRMADA'].includes(estado) && await buscarTraslape({ profesional: profesional._id, inicio, fin })) { omitidas++; continue; }

    const datos = {
      paciente: paciente._id, servicio: servicio._id, profesional: profesional._id, fecha, horaInicio, horaFin, inicio, fin,
      duracionMinutos: servicio.duracionMinutos, precioCentavos: servicio.precioCentavos, estado, observaciones,
      ...(estado === 'CANCELADA' ? { motivoCancelacion: 'El paciente no pudo asistir.' } : {}),
    };
    if (desdeSolicitud) {
      // Solicitud del portal ya convertida: queda ATENDIDA y ambas guardan la referencia mutua.
      const solicitud = await SolicitudCita.create({
        nombreSolicitante: pacienteNombre, correo: 'diego.castillo@example.com', telefono: '5555-1006',
        servicio: servicio._id, fechaPreferida: fecha, mensaje: 'Quisiera una evaluación para iniciar el proceso.',
        estado: 'ATENDIDA', atendidaEn: new Date(),
      });
      const cita = await Cita.create({ ...datos, solicitud: solicitud._id });
      await SolicitudCita.updateOne({ _id: solicitud._id }, { $set: { cita: cita._id } });
    } else await Cita.create(datos);
    creadas++;
  }
  console.log(`Citas de ejemplo: ${creadas} creadas${omitidas ? `, ${omitidas} omitidas por chocar con citas existentes` : ''}.`);
} catch (error) {
  console.error(error.message || 'No se pudieron cargar las citas.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
