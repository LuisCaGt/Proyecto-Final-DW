// Materiales de apoyo ficticios y algunas asignaciones a pacientes de demostración (RF-09).
// Requiere: npm run seed:demo (usuarios y pacientes PAC-001..PAC-010).
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { Material } from '../src/models/Material.js';
import { AsignacionMaterial } from '../src/models/AsignacionMaterial.js';
import { Paciente } from '../src/models/Paciente.js';
import { Usuario } from '../src/models/Usuario.js';

if (process.env.NODE_ENV === 'production') throw new Error('Los datos demo no se pueden cargar en producción.');

// [identificador, título, descripción, tipo, enlace, estado]
const materiales = [
  ['MAT-001', 'Guía de rutinas en casa', 'Recomendaciones para organizar rutinas diarias que favorecen la atención y la calma.', 'DOCUMENTO', 'https://example.com/materiales/guia-rutinas.pdf', 'ACTIVO'],
  ['MAT-002', 'Ejercicios de respiración', 'Video corto con ejercicios guiados de respiración para manejar la ansiedad.', 'VIDEO', 'https://example.com/materiales/respiracion', 'ACTIVO'],
  ['MAT-003', 'Discriminación de sonidos', 'Audios para practicar la identificación de sonidos cotidianos.', 'AUDIO', 'https://example.com/materiales/sonidos', 'ACTIVO'],
  ['MAT-004', 'Fichas de vocabulario', 'Ejercicios imprimibles de vocabulario por categorías para trabajar en casa.', 'EJERCICIO', 'https://example.com/materiales/vocabulario', 'ACTIVO'],
  ['MAT-005', 'Orientación para familias', 'Enlace a recursos de apoyo para madres, padres y responsables.', 'ENLACE', 'https://example.com/materiales/familias', 'ACTIVO'],
  ['MAT-006', 'Cuaderno de lectura 2019', 'Versión anterior del cuaderno de lectura; se conserva por historial.', 'DOCUMENTO', 'https://example.com/materiales/lectura-2019.pdf', 'INACTIVO'],
];
// [paciente, material, correo de quien asigna, observaciones]
const asignaciones = [
  ['PAC-001', 'MAT-001', 'profesional1@sigca.test', 'Revisar con la familia antes de la próxima sesión.'],
  ['PAC-001', 'MAT-003', 'profesional1@sigca.test', ''],
  ['PAC-002', 'MAT-004', 'profesional2@sigca.test', 'Practicar 10 minutos diarios.'],
  ['PAC-004', 'MAT-002', 'admin@sigca.test', ''],
  ['PAC-010', 'MAT-006', 'admin@sigca.test', 'Asignación histórica: el paciente y el material ya están inactivos.'],
];

try {
  await connectDatabase();
  const admin = await Usuario.findOne({ correo: 'admin@sigca.test' }).select('_id');
  const ids = {};
  for (const [identificador, titulo, descripcion, tipo, enlace, estado] of materiales) {
    const material = await Material.findOneAndUpdate(
      { identificador },
      { $setOnInsert: { identificador, titulo, descripcion, tipo, enlace, estado, registradoPor: admin?._id || null } },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );
    ids[identificador] = material._id;
  }
  let creadas = 0;
  for (const [pacienteId, materialId, correo, observaciones] of asignaciones) {
    const [paciente, usuario] = await Promise.all([
      Paciente.findOne({ identificador: pacienteId }).select('_id'),
      Usuario.findOne({ correo }).select('_id'),
    ]);
    if (!paciente || !usuario) throw new Error('Faltan pacientes o usuarios de demostración. Ejecuta npm run seed:demo.');
    // Datos históricos de demostración: se insertan directamente, sin las validaciones de la API.
    const result = await AsignacionMaterial.updateOne(
      { material: ids[materialId], paciente: paciente._id },
      { $setOnInsert: { asignadoPor: usuario._id, observaciones } },
      { upsert: true, runValidators: true },
    );
    creadas += result.upsertedCount;
  }
  console.log(`Materiales demo: ${materiales.length} en catálogo (1 inactivo), ${creadas} asignaciones nuevas.`);
} catch (error) {
  console.error(error.message || 'No se pudieron cargar los materiales.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
