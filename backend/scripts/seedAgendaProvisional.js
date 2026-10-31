// Compatibilidad con los ejemplos de citas existentes, usando modelos completos.
// El nombre del comando conserva compatibilidad con instalaciones anteriores.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Paciente } from '../src/models/Paciente.js';
import { Usuario } from '../src/models/Usuario.js';
import { Responsable } from '../src/models/Responsable.js';
import { ResponsablePaciente } from '../src/models/ResponsablePaciente.js';
import { hashPassword } from '../src/utils/security.js';

if (process.env.NODE_ENV === 'production') throw new Error('No se pueden cargar ejemplos en producción.');
if (!process.env.DEMO_SEED_PASSWORD || process.env.DEMO_SEED_PASSWORD.length < 12) throw new Error('Configura DEMO_SEED_PASSWORD (mínimo 12 caracteres).');

const profesionales = [
  ['Laura', 'Gómez', 'laura.gomez@sigca.test', 'ACTIVO'],
  ['Pedro', 'Sandoval', 'pedro.sandoval@sigca.test', 'ACTIVO'],
  ['Carmen', 'Ortiz', 'carmen.ortiz@sigca.test', 'ACTIVO'],
  ['Andrés', 'Paz', 'andres.paz@sigca.test', 'INACTIVO'], // para probar RN-03
];
// [nombres, apellidos, fechaNacimiento, estado, tieneResponsable]
const pacientes = [
  ['Ana Lucía', 'Méndez', '1995-04-12', 'ACTIVO', false],
  ['Diego', 'Castillo', '1988-11-03', 'ACTIVO', false],
  ['Sofía', 'Herrera', '2018-03-15', 'ACTIVO', true],   // menor con responsable
  ['Mateo', 'Ruiz', '2016-07-20', 'ACTIVO', false],     // menor sin responsable: RN-04
  ['Roberto', 'Juárez', '1979-01-28', 'INACTIVO', false], // inactivo: RN-14
];
try {
  await connectDatabase();
  for (const [nombres, apellidos, correo, estado] of profesionales) {
    await Usuario.updateOne({ correo }, { $setOnInsert: { identificador: `AGENDA-PRO-${profesionales.findIndex(p => p[2] === correo) + 1}`, nombres, apellidos, correo, rol: 'PROFESIONAL', estado, passwordHash: await hashPassword(process.env.DEMO_SEED_PASSWORD) } }, { upsert: true, runValidators: true });
  }
  for (const [nombres, apellidos, fecha, estado, responsable] of pacientes) {
    const paciente = await Paciente.findOneAndUpdate({ nombres, apellidos }, { $setOnInsert: {
      identificador: `AGENDA-PAC-${pacientes.findIndex(p => p[0] === nombres) + 1}`, sexo: 'PREFIERO_NO_DECIR',
      nombres, apellidos, fechaNacimiento: new Date(`${fecha}T00:00:00Z`), estado,
    } }, { upsert: true, returnDocument: 'after', runValidators: true });
    if (responsable) {
      const guardian = await Responsable.findOneAndUpdate({ identificador: 'AGENDA-RES-001' }, { $setOnInsert: { nombres: 'Responsable', apellidos: 'Ejemplo de agenda', telefono: '55550099', correo: 'tutor.agenda@sigca.test', fotografia: '/images/persona.svg', direccion: 'Dirección ficticia de demostración, Guatemala' } }, { upsert: true, returnDocument: 'after', runValidators: true });
      for (const [campo, valor] of Object.entries({ fotografia: '/images/persona.svg', correo: 'tutor.agenda@sigca.test', direccion: 'Dirección ficticia de demostración, Guatemala' })) {
        await Responsable.updateOne({ _id: guardian._id, $or: [{ [campo]: '' }, { [campo]: null }, { [campo]: { $exists: false } }] }, { $set: { [campo]: valor } }, { runValidators: true });
      }
      await ResponsablePaciente.updateOne({ paciente: paciente._id, responsable: guardian._id }, { $setOnInsert: { parentesco: 'Tutor' } }, { upsert: true, runValidators: true });
    }
  }
  console.log('Ejemplos de agenda cargados con usuarios, pacientes y responsables reales.');
} catch (error) {
  console.error(error.message || 'No se pudieron cargar los datos provisionales.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
