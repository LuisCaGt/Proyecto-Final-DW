import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Paciente } from '../src/models/Paciente.js';
import { Responsable } from '../src/models/Responsable.js';
import { ResponsablePaciente } from '../src/models/ResponsablePaciente.js';
import { Usuario } from '../src/models/Usuario.js';
import { hashPassword } from '../src/utils/security.js';

if (process.env.NODE_ENV === 'production') throw new Error('Los datos demo no se pueden cargar en producción.');
if (!process.env.DEMO_SEED_PASSWORD || process.env.DEMO_SEED_PASSWORD.length < 12) throw new Error('Configura DEMO_SEED_PASSWORD con al menos 12 caracteres en backend/.env.');

const staff = [
  { identificador: 'ADM-001', nombres: 'Alicia', apellidos: 'Administración Demo', correo: 'admin@sigca.test', rol: 'ADMINISTRADOR', especialidad: '' },
  { identificador: 'REC-001', nombres: 'Rosa', apellidos: 'Recepción Demo', correo: 'recepcion1@sigca.test', rol: 'RECEPCIONISTA', especialidad: '' },
  { identificador: 'REC-002', nombres: 'Raúl', apellidos: 'Recepción Demo', correo: 'recepcion2@sigca.test', rol: 'RECEPCIONISTA', especialidad: '' },
  { identificador: 'PRO-001', nombres: 'Paula', apellidos: 'Profesional Demo', correo: 'profesional1@sigca.test', rol: 'PROFESIONAL', especialidad: 'Psicología' },
  { identificador: 'PRO-002', nombres: 'Pablo', apellidos: 'Profesional Demo', correo: 'profesional2@sigca.test', rol: 'PROFESIONAL', especialidad: 'Terapia de lenguaje' },
  { identificador: 'PRO-003', nombres: 'Patricia', apellidos: 'Profesional Demo', correo: 'profesional3@sigca.test', rol: 'PROFESIONAL', especialidad: 'Estimulación auditiva verbal' },
];

const patientSeed = [
  ['PAC-001', 'Andrea', 'Paciente Demo', '2014-05-12', 'FEMENINO', 0, 'ACTIVO'],
  ['PAC-002', 'Benjamín', 'Paciente Demo', '2012-09-22', 'MASCULINO', 1, 'ACTIVO'],
  ['PAC-003', 'Camila', 'Paciente Demo', '2010-02-18', 'FEMENINO', 2, 'ACTIVO'],
  ['PAC-004', 'Daniel', 'Paciente Demo', '2004-11-02', 'MASCULINO', 0, 'ACTIVO'],
  ['PAC-005', 'Elena', 'Paciente Demo', '2001-07-30', 'FEMENINO', 1, 'ACTIVO'],
  ['PAC-006', 'Felipe', 'Paciente Demo', '2018-01-08', 'MASCULINO', 2, 'ACTIVO'],
  ['PAC-007', 'Gabriela', 'Paciente Demo', '1998-12-16', 'FEMENINO', 0, 'ACTIVO'],
  ['PAC-008', 'Hugo', 'Paciente Demo', '2016-03-05', 'MASCULINO', 1, 'ACTIVO'],
  ['PAC-009', 'Isabel', 'Paciente Demo', '2015-08-11', 'FEMENINO', 2, 'ACTIVO'],
  ['PAC-010', 'Javier', 'Paciente Demo', '1995-04-21', 'MASCULINO', 0, 'INACTIVO'],
];

const guardianSeed = [
  ['RES-001', 'María', 'Responsable Demo', '5550-0001', 'madre@sigca.test'],
  ['RES-002', 'José', 'Responsable Demo', '5550-0002', 'padre@sigca.test'],
  ['RES-003', 'Lucía', 'Responsable Demo', '5550-0003', 'tutora@sigca.test'],
  ['RES-004', 'Carlos', 'Responsable Demo', '5550-0004', 'responsable4@sigca.test'],
  ['RES-005', 'Sofía', 'Responsable Demo', '5550-0005', 'responsable5@sigca.test'],
];

await connectDatabase();
try {
  const users = await Promise.all(staff.map(async data => Usuario.findOneAndUpdate(
    { identificador: data.identificador },
    { $setOnInsert: { ...data, estado: 'ACTIVO', telefono: '', passwordHash: await hashPassword(process.env.DEMO_SEED_PASSWORD) } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  )));
  const professionals = users.filter(user => user.rol === 'PROFESIONAL');
  const patients = await Promise.all(patientSeed.map(([identificador, nombres, apellidos, fechaNacimiento, sexo, professionalIndex, estado], index) => Paciente.findOneAndUpdate(
    { identificador },
    { $setOnInsert: {
      nombres, apellidos, fechaNacimiento: new Date(`${fechaNacimiento}T00:00:00.000Z`), sexo, estado,
      fotografia: '/images/persona.svg', telefono: '', direccion: '', fechaInicioProceso: null, observacionesAdministrativas: '',
      profesionales: [professionals[professionalIndex]._id],
    } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  )));
  const guardians = await Promise.all(guardianSeed.map(([identificador, nombres, apellidos, telefono, correo]) => Responsable.findOneAndUpdate(
    { identificador },
    { $setOnInsert: { nombres, apellidos, telefono, correo, fotografia: '/images/persona.svg', direccion: 'Dirección ficticia de demostración, Guatemala' } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  )));

  // Completa únicamente campos vacíos de estos ejemplos; conserva los valores editados.
  for (const [identificador, nombres, apellidos, telefono, correo] of guardianSeed) {
    for (const [campo, valor] of Object.entries({ fotografia: '/images/persona.svg', correo, direccion: 'Dirección ficticia de demostración, Guatemala' })) {
      await Responsable.updateOne({ identificador, nombres, apellidos, $or: [{ [campo]: '' }, { [campo]: null }, { [campo]: { $exists: false } }] }, { $set: { [campo]: valor } }, { runValidators: true });
    }
  }

  for (const [patientIndex, guardianIndex, parentesco] of [[0, 0, 'Madre'], [2, 1, 'Padre'], [3, 2, 'Tutora'], [5, 3, 'Madre'], [7, 0, 'Madre'], [8, 4, 'Padre']]) {
    await ResponsablePaciente.updateOne(
      { paciente: patients[patientIndex]._id, responsable: guardians[guardianIndex]._id },
      { $setOnInsert: { parentesco } },
      { upsert: true, runValidators: true },
    );
  }

  console.log('Datos demo cargados: 1 administrador, 2 recepcionistas, 3 profesionales, 10 pacientes y 5 responsables.');
  console.log('Cuentas de acceso ficticias: admin@sigca.test, recepcion1@sigca.test, recepcion2@sigca.test, profesional1@sigca.test, profesional2@sigca.test, profesional3@sigca.test.');
} finally {
  await mongoose.disconnect();
}