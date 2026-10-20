// PROVISIONAL — Datos mínimos de profesionales y pacientes para probar citas
// mientras se integran los módulos de usuarios y pacientes (compañero 2).
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Paciente } from '../src/models/Paciente.js';
import { Usuario } from '../src/models/Usuario.js';

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
    await Usuario.updateOne({ correo }, { $setOnInsert: { nombres, apellidos, correo, rol: 'PROFESIONAL', estado } }, { upsert: true, runValidators: true });
  }
  for (const [nombres, apellidos, fecha, estado, responsable] of pacientes) {
    await Paciente.updateOne({ nombres, apellidos }, { $setOnInsert: {
      nombres, apellidos, fechaNacimiento: new Date(`${fecha}T00:00:00Z`), estado,
      // Referencia simulada hasta que exista el módulo de responsables.
      responsables: responsable ? [new mongoose.Types.ObjectId()] : [],
    } }, { upsert: true, runValidators: true });
  }
  console.log('Profesionales y pacientes provisionales cargados.');
} catch (error) {
  console.error(error.message || 'No se pudieron cargar los datos provisionales.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
