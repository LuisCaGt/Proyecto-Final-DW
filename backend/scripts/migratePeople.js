// Completa registros provisionales sin cambiar sus _id ni eliminar historial.
import 'dotenv/config';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../src/utils/security.js';

export async function migratePeople(db) {
  let users = 0, patients = 0, links = 0, unresolved = 0;
  for await (const user of db.collection('usuarios').find({})) {
    const changes = {};
    if (!user.identificador) changes.identificador = `LEG-USR-${user._id}`;
    // No clave compartida: un administrador deberá restablecer estas cuentas.
    if (!user.passwordHash) changes.passwordHash = await hashPassword(randomBytes(32).toString('base64url'));
    if (Object.keys(changes).length) { await db.collection('usuarios').updateOne({ _id: user._id }, { $set: changes }); users++; }
  }
  for await (const patient of db.collection('pacientes').find({})) {
    const changes = {};
    if (!patient.identificador) changes.identificador = `LEG-PAC-${patient._id}`;
    if (!patient.sexo) changes.sexo = 'PREFIERO_NO_DECIR';
    if (!Array.isArray(patient.profesionales)) changes.profesionales = [];
    if (Object.keys(changes).length) { await db.collection('pacientes').updateOne({ _id: patient._id }, { $set: changes }); patients++; }
    for (const responsable of patient.responsables || []) {
      if (!await db.collection('responsables').findOne({ _id: responsable })) { unresolved++; continue; }
      const result = await db.collection('responsablesPacientes').updateOne(
        { paciente: patient._id, responsable }, { $setOnInsert: { parentesco: 'No registrado' } }, { upsert: true },
      );
      links += result.upsertedCount;
    }
  }
  return { users, patients, links, unresolved };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  if (!process.env.MONGODB_URI) throw new Error('Configura MONGODB_URI.');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
    console.log(await migratePeople(mongoose.connection.db));
    console.log('Los responsables inexistentes no autorizan citas. Revisa parentescos migrados y restablece las claves de cuentas antiguas desde Administración.');
  } finally { await mongoose.disconnect(); }
}
