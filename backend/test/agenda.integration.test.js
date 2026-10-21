import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Usuario } from '../src/models/Usuario.js';
import { Paciente } from '../src/models/Paciente.js';
import { Responsable } from '../src/models/Responsable.js';
import { ResponsablePaciente } from '../src/models/ResponsablePaciente.js';
import { Servicio } from '../src/models/Servicio.js';
import { Cita } from '../src/models/Cita.js';
import { SolicitudCita } from '../src/models/SolicitudCita.js';
import { hashPassword, signToken } from '../src/utils/security.js';
import { todayInGuatemala, ageAt } from '../src/utils/fechas.js';
import { calculateAge } from '../src/controllers/pacientesController.js';
import { migratePeople } from '../scripts/migratePeople.js';

process.env.JWT_SECRET = 'agenda-test-secret-with-at-least-32-bytes';
const { app } = await import('../src/app.js');
let server, base, databaseName, staff, patients, guardian, service, day, cita;
const password = 'Solo-Pruebas-2026!';
const token = user => signToken(user._id);
async function call(path, user, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
const appointment = (patient, professional, time = '09:00') => ({ paciente: String(patient._id), profesional: String(professional._id), servicio: String(service._id), fecha: day, horaInicio: time });

before(async () => {
  const uri = process.env.MONGODB_URI_TEST;
  if (!uri || !new URL(uri).pathname.endsWith('_test')) throw new Error('Configura una base de pruebas terminada en _test.');
  const parsed = new URL(uri);
  databaseName = `sigca_agenda_${randomUUID().slice(0, 8)}_test`;
  parsed.pathname = '/' + databaseName;
  await mongoose.connect(parsed.toString(), { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Usuario.init(), Paciente.init(), ResponsablePaciente.init(), Cita.init()]);
  const hash = await hashPassword(password);
  staff = await Usuario.create(['ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL', 'PROFESIONAL'].map((rol, i) => ({ identificador: `TEST-USR-${i}`, nombres: 'Prueba', apellidos: `Usuario ${i}`, correo: `usuario${i}@sigca.test`, rol, passwordHash: hash })));
  patients = await Paciente.create([
    { identificador: 'ADULTO', nombres: 'Adulto', apellidos: 'Prueba', fechaNacimiento: '1990-01-01', sexo: 'OTRO' },
    { identificador: 'MENOR', nombres: 'Menor', apellidos: 'Prueba', fechaNacimiento: `${Number(todayInGuatemala().slice(0,4))-8}-01-01`, sexo: 'OTRO' },
    { identificador: 'INACTIVO', nombres: 'Inactivo', apellidos: 'Prueba', fechaNacimiento: '1990-01-01', sexo: 'OTRO', estado: 'INACTIVO' },
  ]);
  guardian = await Responsable.create({ identificador: 'RESP', nombres: 'Tutor', apellidos: 'Prueba', telefono: '55550000' });
  service = await Servicio.create({ nombre: 'Servicio prueba', descripcion: 'Prueba de integración', duracionMinutos: 30, precioCentavos: 10000, imagen: '/images/servicio.svg' });
  const future = new Date(`${todayInGuatemala()}T12:00:00Z`);
  future.setUTCDate(future.getUTCDate()+7);
  while ([0,6].includes(future.getUTCDay())) future.setUTCDate(future.getUTCDate()+1);
  day = future.toISOString().slice(0,10);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === databaseName && /^sigca_agenda_[a-f0-9]{8}_test$/.test(databaseName)) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('agenda exige sesión y roles; solicitudes públicas siguen disponibles', async () => {
  for (const route of ['/citas', '/citas/opciones', '/citas/calendario', '/solicitudes-cita']) assert.equal((await call(route)).status, 401);
  for (const route of ['/solicitudes-cita', '/responsables', '/usuarios', '/contacto']) assert.equal((await call(route, staff[2])).status, 403);
  assert.equal((await call('/citas', staff[2], 'POST', appointment(patients[0],staff[2]))).status, 403);
  assert.equal((await call('/solicitudes-cita', null, 'POST', { nombreSolicitante: 'Solicitante de prueba', correo: 'solicitante@sigca.test', telefono: '55550000', servicio: String(service._id), fechaPreferida: day })).status, 201);
  assert.equal((await call('/solicitudes-cita',staff[1])).status, 200);
});

test('agenda rechaza menores sin responsable real, pacientes y profesionales inactivos', async () => {
  const data=appointment(patients[1],staff[2]);
  assert.equal((await call('/citas',staff[1],'POST',data)).status,422);
  // Una referencia huérfana no permite programar.
  await ResponsablePaciente.create({ paciente: patients[1]._id, responsable: new mongoose.Types.ObjectId(), parentesco: 'Tutor' });
  assert.equal((await call('/citas',staff[1],'POST',data)).status,422);
  await ResponsablePaciente.create({ paciente: patients[1]._id, responsable: guardian._id, parentesco: 'Tutor' });
  const response=await call('/citas',staff[1],'POST',data);
  assert.equal(response.status,201,JSON.stringify(response.body)); cita=response.body;
  assert.equal((await call('/citas',staff[0],'POST',appointment(patients[2],staff[2],'10:00'))).status,422);
  await Usuario.updateOne({_id:staff[3]._id},{$set:{estado:'INACTIVO'}});
  assert.equal((await call('/citas',staff[0],'POST',appointment(patients[0],staff[3],'10:00'))).status,422);
  await Usuario.updateOne({_id:staff[3]._id},{$set:{estado:'ACTIVO'}});
});

test('profesional solo ve sus citas, calendario y pacientes vinculados, sin importes', async () => {
  const other=await call('/citas',staff[0],'POST',appointment(patients[0],staff[3]));
  assert.equal(other.status,201);
  const list=await call('/citas',staff[2]);
  assert.equal(list.body.total,1); assert.equal(list.body.citas[0]._id,cita._id);
  assert.equal('precioCentavos' in list.body.citas[0],false);
  assert.equal((await call(`/citas?profesional=${staff[3]._id}`,staff[2])).status,403);
  assert.equal((await call(`/citas/${other.body._id}`,staff[2])).status,404);
  const calendar=await call(`/citas/calendario?desde=${day}&hasta=${day}`,staff[2]);
  assert.deepEqual(calendar.body.map(c=>c._id),[cita._id]);
  assert.equal('precioCentavos' in calendar.body[0],false);
  assert.equal((await call(`/citas/calendario?desde=${day}&hasta=${day}&profesional=${staff[3]._id}`,staff[2])).status,403);
  const options=await call('/citas/opciones',staff[2]);
  assert.deepEqual(options.body.profesionales.map(p=>p._id),[String(staff[2]._id)]);
  assert.deepEqual(options.body.pacientes.map(p=>p._id),[String(patients[1]._id)]);
  assert.equal('precioCentavos' in options.body.servicios[0],false);
  const detail=await call(`/pacientes/${patients[1]._id}`,staff[2]);
  assert.equal(detail.status,200); assert.equal('observacionesAdministrativas' in detail.body,false);
  assert.equal((await call(`/pacientes/${patients[0]._id}`,staff[2])).status,404);
  assert.equal((await call(`/citas/${cita._id}`,staff[2],'PUT',{profesional:String(staff[2]._id),fecha:day,horaInicio:'11:00'})).status,403);
  assert.equal((await call(`/citas/${cita._id}/estado`,staff[2],'PATCH',{estado:'CONFIRMADA'})).status,403);
});

test('reprogramación valida responsable y baja lógica conserva historial', async () => {
  await ResponsablePaciente.deleteMany({paciente:patients[1]._id});
  assert.equal((await call(`/citas/${cita._id}`,staff[1],'PUT',{profesional:String(staff[2]._id),fecha:day,horaInicio:'11:00'})).status,422);
  await ResponsablePaciente.create({paciente:patients[1]._id,responsable:guardian._id,parentesco:'Tutor'});
  const update=await call(`/citas/${cita._id}`,staff[1],'PUT',{profesional:String(staff[2]._id),fecha:day,horaInicio:'11:00'});
  assert.equal(update.status,200,JSON.stringify(update.body));
  assert.equal((await call(`/pacientes/${patients[1]._id}/estado`,staff[1],'PATCH',{estado:'INACTIVO'})).status,200);
  const detail=await call(`/pacientes/${patients[1]._id}`,staff[1]);
  assert.equal(detail.body.citas.length,1); assert.equal(detail.body.citas[0]._id,cita._id);
  assert.equal(detail.body.responsables.length,1);
  assert.equal((await call('/citas',staff[1],'POST',appointment(patients[1],staff[2],'12:00'))).status,422);
});

test('conversión de solicitud aplica reglas de responsables y estados', async () => {
  const request=await SolicitudCita.findOne({estado:'PENDIENTE'});
  const blocked=await call(`/solicitudes-cita/${request._id}/convertir`,staff[1],'POST',appointment(patients[1],staff[2],'12:00'));
  assert.equal(blocked.status,422,JSON.stringify(blocked.body));
  assert.equal((await SolicitudCita.findById(request._id)).estado,'PENDIENTE');
  const result=await call(`/solicitudes-cita/${request._id}/convertir`,staff[1],'POST',appointment(patients[0],staff[2],'12:00'));
  assert.equal(result.status,201,JSON.stringify(result.body));
  assert.equal((await SolicitudCita.findById(request._id)).estado,'ATENDIDA');
});

test('migración conserva identificadores Mongo e historial y no acepta referencias ficticias', async () => {
  const db=mongoose.connection.db, patientId=new mongoose.Types.ObjectId(), userId=new mongoose.Types.ObjectId();
  await db.collection('usuarios').insertOne({_id:userId,nombres:'Anterior',apellidos:'Usuario',correo:'anterior@sigca.test',rol:'PROFESIONAL',estado:'ACTIVO'});
  await db.collection('pacientes').insertOne({_id:patientId,nombres:'Anterior',apellidos:'Paciente',fechaNacimiento:new Date('2018-01-01'),estado:'ACTIVO',responsables:[guardian._id,new mongoose.Types.ObjectId()]});
  const first=await migratePeople(db);
  assert.equal(first.users,1); assert.equal(first.patients,1); assert.equal(first.links,1); assert.equal(first.unresolved,1);
  assert.equal((await Paciente.findById(patientId)).identificador,`LEG-PAC-${patientId}`);
  assert.equal(await Cita.countDocuments({_id:cita._id}),1);
  const second=await migratePeople(db);
  assert.equal(second.users,0); assert.equal(second.patients,0); assert.equal(second.links,0);
});

test('edad respeta el cumpleaños y la fecha local de Guatemala', () => {
  assert.equal(calculateAge('2008-10-21',new Date('2026-10-21T05:59:00Z')),17);
  assert.equal(calculateAge('2008-10-21',new Date('2026-10-21T06:00:00Z')),18);
  assert.equal(ageAt('2008-02-29','2026-02-28'),17);
});
