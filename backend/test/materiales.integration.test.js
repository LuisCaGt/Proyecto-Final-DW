import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Usuario } from '../src/models/Usuario.js';
import { Paciente } from '../src/models/Paciente.js';
import { Material } from '../src/models/Material.js';
import { AsignacionMaterial } from '../src/models/AsignacionMaterial.js';
import { signToken } from '../src/utils/security.js';

process.env.JWT_SECRET = 'materiales-test-secret-more-than-32-bytes';
const { app } = await import('../src/app.js');

test('materiales: catálogo, permisos por rol y asignaciones a pacientes (RF-09, RN-09, RN-10)', async () => {
  const mongo = await MongoMemoryServer.create({ binary: { version: '8.2.6' } });
  let server;
  try {
    await mongoose.connect(mongo.getUri('materiales_test'));
    await Promise.all([Usuario.init(), Paciente.init(), Material.init(), AsignacionMaterial.init()]);
    const [admin, recep, prof, otherProf] = await Usuario.create(['ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL', 'PROFESIONAL'].map((rol, i) => ({
      identificador: `MAT-TEST-${i}`, nombres: 'Prueba', apellidos: String(i), correo: `materiales${i}@sigca.test`, rol, passwordHash: 'unused-test',
    })));
    const [mine, inactive, foreign] = await Paciente.create([
      { identificador: 'PAC-MIO', nombres: 'Asignado', apellidos: 'Prueba', fechaNacimiento: '1990-01-01', sexo: 'OTRO', profesionales: [prof._id] },
      { identificador: 'PAC-INACTIVO', nombres: 'Inactivo', apellidos: 'Prueba', fechaNacimiento: '1990-01-01', sexo: 'OTRO', estado: 'INACTIVO', profesionales: [prof._id] },
      { identificador: 'PAC-AJENO', nombres: 'Ajeno', apellidos: 'Prueba', fechaNacimiento: '1990-01-01', sexo: 'OTRO', profesionales: [otherProf._id] },
    ]);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = async (path, user, method = 'GET', body) => {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${signToken(user._id)}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const data = (id, extra = {}) => ({ identificador: id, titulo: `Material ${id}`, descripcion: 'Recurso de apoyo de prueba.', tipo: 'VIDEO', enlace: 'https://example.com/recurso', ...extra });

    // RN-10: autenticación y roles.
    assert.equal((await call('/materiales')).status, 401);
    assert.equal((await call('/materiales', recep)).status, 403);
    assert.equal((await call('/materiales', prof, 'POST', data('X'))).status, 403);

    // Catálogo: registrar, validar, editar y desactivar.
    const created = await call('/materiales', admin, 'POST', data('M-1'));
    assert.equal(created.status, 201);
    assert.equal(String(created.body.registradoPor), String(admin._id));
    assert.ok(created.body.fechaRegistro);
    assert.equal((await call('/materiales', admin, 'POST', data('M-1'))).status, 409);
    const invalid = await call('/materiales', admin, 'POST', data('M-2', { enlace: 'javascript:alert(1)', tipo: 'LIBRO', estado: 'ACTIVO' }));
    assert.equal(invalid.status, 400);
    assert.ok(invalid.body.fields.enlace && invalid.body.fields.tipo && invalid.body.fields.estado);
    const edited = await call(`/materiales/${created.body._id}`, admin, 'PUT', data('M-1', { titulo: 'Título editado' }));
    assert.equal(edited.status, 200);
    assert.equal(edited.body.titulo, 'Título editado');
    const old = (await call('/materiales', admin, 'POST', data('M-OLD'))).body;
    assert.equal((await call(`/materiales/${old._id}/estado`, admin, 'PATCH', { estado: 'INACTIVO' })).body.estado, 'INACTIVO');

    // El profesional solo consulta materiales activos.
    const profList = await call('/materiales', prof);
    assert.equal(profList.status, 200);
    assert.deepEqual(profList.body.materiales.map(m => m.identificador), ['M-1']);
    assert.equal((await call(`/materiales/${old._id}`, prof)).status, 404);
    assert.equal((await call('/materiales?estado=INACTIVO', admin)).body.total, 1);

    // Asignaciones.
    const assign = (patient, user, material = created.body._id, extra = {}) => call(`/pacientes/${patient._id}/materiales`, user, 'POST', { material, ...extra });
    const first = await assign(mine, prof, created.body._id, { observaciones: 'Practicar en casa.' });
    assert.equal(first.status, 201);
    assert.equal(String(first.body.asignadoPor._id), String(prof._id));
    assert.ok(first.body.fechaAsignacion);
    assert.equal((await assign(mine, prof)).status, 409);                       // duplicado
    assert.equal((await assign(mine, admin, old._id)).status, 422);             // material inactivo
    assert.equal((await assign(inactive, admin)).status, 422);                  // RN-09 paciente inactivo
    assert.equal((await assign(foreign, prof)).status, 404);                    // paciente no autorizado
    assert.equal((await assign(mine, recep)).status, 403);                      // recepción no asigna
    assert.equal((await assign(mine, prof, 'abc')).status, 400);

    // Dos asignaciones simultáneas del mismo material: solo una se guarda.
    const other = (await call('/materiales', admin, 'POST', data('M-3'))).body;
    const race = await Promise.all([assign(foreign, admin, other._id), assign(foreign, admin, other._id)]);
    assert.deepEqual(race.map(r => r.status).sort(), [201, 409]);

    // Consulta por paciente y en la ficha; la desactivación conserva el historial.
    assert.equal((await call(`/pacientes/${mine._id}/materiales`, recep)).body.length, 1);
    assert.equal((await call(`/pacientes/${foreign._id}/materiales`, prof)).status, 404);
    assert.equal((await call(`/materiales/${created.body._id}/estado`, admin, 'PATCH', { estado: 'INACTIVO' })).status, 200);
    const history = await call(`/pacientes/${mine._id}/materiales`, prof);
    assert.equal(history.status, 200);
    assert.equal(history.body[0].material.estado, 'INACTIVO');
    const detail = await call(`/pacientes/${mine._id}`, admin);
    assert.equal(detail.body.materialesAsignados.length, 1);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  }
});
