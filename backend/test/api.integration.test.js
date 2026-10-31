import 'dotenv/config';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { hashPassword, signToken } from '../src/utils/security.js';
import { Usuario } from '../src/models/Usuario.js';
import { Paciente } from '../src/models/Paciente.js';
import { Responsable } from '../src/models/Responsable.js';
import { ResponsablePaciente } from '../src/models/ResponsablePaciente.js';

const password = 'Pruebas-SIGCA-2026!';
const secret = 'sigca-integration-test-key-32-bytes-minimum';
const suffix = randomUUID().slice(0, 8);
const users = [];
let ownedPatient;
let unrelatedPatient;
let createdPatient;
let createdGuardian;
let server;
let baseUrl;

process.env.JWT_SECRET = secret;
const { app } = await import('../src/app.js');

async function call(path, { token, ...options } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  const uri = process.env.MONGODB_URI_TEST;
  if (!uri) throw new Error('Define MONGODB_URI_TEST para ejecutar las pruebas de API.');
  const databaseName = new URL(uri).pathname.slice(1);
  if (!databaseName.endsWith('_test')) throw new Error('MONGODB_URI_TEST debe apuntar a una base cuyo nombre termine en _test.');
  await mongoose.connect(uri);

  const roles = ['ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL'];
  for (const rol of roles) {
    const user = await Usuario.create({
      identificador: `TEST-${rol}-${suffix}`,
      nombres: 'Usuario',
      apellidos: 'Prueba',
      correo: `${rol.toLowerCase()}-${suffix}@sigca.test`,
      rol,
      estado: 'ACTIVO',
      especialidad: rol === 'PROFESIONAL' ? 'Pruebas' : '',
      passwordHash: await hashPassword(password),
    });
    users.push(user);
  }
  const inactive = await Usuario.create({
    identificador: `TEST-INACTIVO-${suffix}`,
    nombres: 'Cuenta',
    apellidos: 'Inactiva',
    correo: `inactiva-${suffix}@sigca.test`,
    rol: 'RECEPCIONISTA',
    estado: 'INACTIVO',
    passwordHash: await hashPassword(password),
  });
  users.push(inactive);

  ownedPatient = await Paciente.create({ identificador: `TEST-PAC-OWN-${suffix}`, nombres: 'Paciente', apellidos: 'Asignado', fechaNacimiento: new Date('2015-01-01T00:00:00.000Z'), sexo: 'FEMENINO', telefono: '5555', estado: 'ACTIVO', profesionales: [users[2]._id] });
  unrelatedPatient = await Paciente.create({ identificador: `TEST-PAC-OTHER-${suffix}`, nombres: 'Paciente', apellidos: 'No Asignado', fechaNacimiento: new Date('2015-01-01T00:00:00.000Z'), sexo: 'MASCULINO', estado: 'ACTIVO', profesionales: [] });

  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (ownedPatient?._id) await Paciente.deleteOne({ _id: ownedPatient._id });
  if (unrelatedPatient?._id) await Paciente.deleteOne({ _id: unrelatedPatient._id });
  if (createdPatient?._id) await ResponsablePaciente.deleteMany({ paciente: createdPatient._id });
  if (createdPatient?._id) await Paciente.deleteOne({ _id: createdPatient._id });
  if (createdGuardian?._id) await Responsable.deleteOne({ _id: createdGuardian._id });
  if (users.length) await Usuario.deleteMany({ _id: { $in: users.map(user => user._id) } });
  await mongoose.disconnect();
});

test('login autentica los tres roles desde la base de datos y no devuelve hashes', async () => {
  for (const user of users.slice(0, 3)) {
    const response = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo: user.correo, password, rol: 'ADMINISTRADOR' }) });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.rol, user.rol);
    assert.ok(response.body.token);
    assert.equal(JSON.stringify(response.body).includes('passwordHash'), false);
    assert.equal(JSON.stringify(response.body).includes(password), false);
  }
  const wrongPassword = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo: users[0].correo, password: 'contraseña-incorrecta' }) });
  assert.equal(wrongPassword.status, 401);
});

test('rechaza cuentas inactivas, tokens inválidos y tokens vencidos', async () => {
  const inactive = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo: users[3].correo, password }) });
  assert.equal(inactive.status, 401);
  assert.equal((await call('/api/auth/me', { token: 'invalid.token.value' })).status, 401);
  const expiredToken = signToken(String(users[0]._id), { secret, expiresInSeconds: -1 });
  assert.equal((await call('/api/auth/me', { token: expiredToken })).status, 401);

  const validAdmin = (await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo: users[0].correo, password }) })).body.token;
  await Usuario.updateOne({ _id: users[0]._id }, { $set: { estado: 'INACTIVO' } });
  assert.equal((await call('/api/auth/me', { token: validAdmin })).status, 401);
  await Usuario.updateOne({ _id: users[0]._id }, { $set: { estado: 'ACTIVO' } });
});

test('rutas privadas rechazan anónimos y roles insuficientes', async () => {
  const admin = (await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo: users[0].correo, password }) })).body.token;
  const receptionist = (await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo: users[1].correo, password }) })).body.token;
  const professional = (await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo: users[2].correo, password }) })).body.token;
  assert.equal((await call('/api/admin/servicios')).status, 401);
  assert.equal((await call('/api/usuarios', { token: receptionist })).status, 403);
  assert.equal((await call('/api/admin/servicios', { token: professional })).status, 403);
  assert.equal((await call('/api/servicios', { method: 'POST', token: receptionist, body: JSON.stringify({ rol: 'ADMINISTRADOR' }) })).status, 403);
  assert.equal((await call(`/api/usuarios/${users[0]._id}`, { method: 'PUT', token: admin, body: JSON.stringify({ rol: 'RECEPCIONISTA' }) })).status, 403);
  assert.equal((await call(`/api/usuarios/${users[0]._id}`, { method: 'PUT', token: admin, body: JSON.stringify({ password: 'Nueva-Clave-Segura!' }) })).status, 400);
  assert.equal((await call(`/api/usuarios/${users[0]._id}/estado`, { method: 'PATCH', token: admin, body: JSON.stringify({ estado: 'INACTIVO' }) })).status, 403);
  assert.equal((await call(`/api/usuarios/${users[1]._id}`, { method: 'PUT', token: admin, body: JSON.stringify({ correo: 123 }) })).status, 400);
  assert.equal((await call('/api/responsables', { method: 'POST', token: receptionist, body: JSON.stringify({ identificador: 'INVALID', nombres: 'Prueba', apellidos: 'Prueba', telefono: '55550000', correo: 123 }) })).status, 400);
});

test('profesional solo consulta pacientes asignados y recibe datos básicos', async () => {
  const professional = (await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo: users[2].correo, password }) })).body.token;
  const list = await call('/api/pacientes', { token: professional });
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map(patient => String(patient.id)), [String(ownedPatient._id)]);
  const detail = await call(`/api/pacientes/${ownedPatient._id}`, { token: professional });
  assert.equal(detail.status, 200);
  assert.equal('telefono' in detail.body, false);
  assert.equal('observacionesAdministrativas' in detail.body, false);
  assert.equal('responsables' in detail.body, false);
  assert.equal((await call(`/api/pacientes/${unrelatedPatient._id}`, { token: professional })).status, 404);
});

test('pacientes validan nacimiento y asociaciones preservan parentesco sin duplicarse', async () => {
  const admin = (await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo: users[0].correo, password }) })).body.token;
  const futureDate = await call('/api/pacientes', {
    method: 'POST',
    token: admin,
    body: JSON.stringify({ identificador: `TEST-FUT-${suffix}`, nombres: 'Futuro', apellidos: 'Inválido', fechaNacimiento: '2099-01-01', sexo: 'OTRO' }),
  });
  assert.equal(futureDate.status, 400);

  const patientResponse = await call('/api/pacientes', {
    method: 'POST',
    token: admin,
    body: JSON.stringify({ identificador: `TEST-PAC-NEW-${suffix}`, nombres: 'Menor', apellidos: 'Prueba', fechaNacimiento: '2018-06-15', sexo: 'FEMENINO', profesionales: [String(users[2]._id)] }),
  });
  assert.equal(patientResponse.status, 201);
  assert.equal(patientResponse.body.edad, new Date().getUTCFullYear() - 2018 - (new Date().getUTCMonth() < 5 || (new Date().getUTCMonth() === 5 && new Date().getUTCDate() < 15) ? 1 : 0));
  createdPatient = await Paciente.findById(patientResponse.body.id);

  const guardianResponse = await call('/api/responsables', {
    method: 'POST',
    token: admin,
    body: JSON.stringify({ identificador: `TEST-RES-${suffix}`, nombres: 'Responsable', apellidos: 'Prueba', telefono: '55550000', correo: `responsable-${suffix}@sigca.test`, fotografia: '/images/persona.svg', direccion: 'Dirección de prueba' }),
  });
  assert.equal(guardianResponse.status, 201);
  createdGuardian = await Responsable.findById(guardianResponse.body._id);

  const relation = { responsableId: String(createdGuardian._id), parentesco: 'Madre' };
  assert.equal((await call(`/api/pacientes/${createdPatient._id}/responsables`, { method: 'POST', token: admin, body: JSON.stringify(relation) })).status, 201);
  assert.equal((await call(`/api/pacientes/${createdPatient._id}/responsables`, { method: 'POST', token: admin, body: JSON.stringify({ ...relation, parentesco: 'Tía' }) })).status, 201);
  const patientDetail = await call(`/api/pacientes/${createdPatient._id}`, { token: admin });
  assert.equal(patientDetail.body.menorDeEdad, true);
  assert.equal(patientDetail.body.tieneResponsable, true);
  assert.equal(patientDetail.body.responsables[0].parentesco, 'Tía');
  assert.equal(await ResponsablePaciente.countDocuments({ paciente: createdPatient._id, responsable: createdGuardian._id }), 1);
});


test('responsables exigen fotografía, correo y dirección al registrar y editar (RF-04)', async () => {
  const token = signToken(String(users[0]._id), { secret });
  const valid = { identificador: `TEST-REQ-${suffix}`, nombres: 'Tutor', apellidos: 'Prueba', telefono: '55550000', fotografia: '/images/persona.svg', correo: 'tutor@sigca.test', direccion: 'Dirección de prueba' };
  for (const field of ['fotografia', 'correo', 'direccion']) {
    const missing = { ...valid }; delete missing[field];
    const response = await call('/api/responsables', { method: 'POST', token, body: JSON.stringify(missing) });
    assert.equal(response.status, 400);
    assert.ok(response.body.fields[field]);
    const update = await call(`/api/responsables/${createdGuardian._id}`, { method: 'PUT', token, body: JSON.stringify({ [field]: '' }) });
    assert.equal(update.status, 400);
  }
  assert.equal((await call(`/api/responsables/${createdGuardian._id}`, { method: 'PUT', token, body: JSON.stringify({ direccion: 'Dirección actualizada' }) })).status, 200);
});
