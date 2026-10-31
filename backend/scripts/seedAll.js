import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';
import { ContenidoInstitucional, initialContent } from '../src/models/ContenidoInstitucional.js';
import { Horario, initialHours } from '../src/models/Horario.js';
if (process.env.NODE_ENV === 'production') throw new Error('Los ejemplos no se cargan en producción.');
if (!process.env.MONGODB_URI || !process.env.DEMO_SEED_PASSWORD || process.env.DEMO_SEED_PASSWORD.length < 12) throw new Error('Configura MONGODB_URI y DEMO_SEED_PASSWORD antes de cargar ejemplos.');
for (const script of ['seedDemo.js','seedServicios.js','seedEditorial.js','seedContacto.js','seedSolicitudes.js','seedAgendaProvisional.js','seedCitas.js','seedCajasDemo.js','seedMateriales.js']) {
  execFileSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], { stdio: 'inherit', env: process.env });
}
try {
  await mongoose.connect(process.env.MONGODB_URI);
  await ContenidoInstitucional.findByIdAndUpdate('principal', { $setOnInsert: initialContent }, { upsert: true, runValidators: true, timestamps: false });
  await Horario.findByIdAndUpdate('atencion', { $setOnInsert: { dias: initialHours } }, { upsert: true, runValidators: true, timestamps: false });
  console.log('Datos de demostración completos. Los registros existentes se conservan.');
} finally { await mongoose.disconnect(); }
