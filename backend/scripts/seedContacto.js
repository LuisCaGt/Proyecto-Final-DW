import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { ContenidoInstitucional, initialContent, initialContact } from '../src/models/ContenidoInstitucional.js';
import { MensajeContacto } from '../src/models/MensajeContacto.js';

const messages = [
  { nombre: 'Visitante de ejemplo', correo: 'visitante@example.com', telefono: '+502 0000 0000', asunto: 'Información de servicios — ejemplo', mensaje: 'Mensaje ficticio de demostración para consultar información sobre los servicios del centro.', estado: 'NUEVO' },
  { nombre: 'Familia de ejemplo', correo: 'familia@example.com', telefono: '+502 0000 0001', asunto: 'Información de actividades — ejemplo', mensaje: 'Mensaje ficticio de demostración para consultar información sobre actividades corporativas.', estado: 'LEIDO' },
];
try {
  await connectDatabase();
  await ContenidoInstitucional.updateOne({ _id: 'principal', contacto: { $exists: false } }, { $set: { contacto: initialContact } }, { timestamps: false });
  await ContenidoInstitucional.findByIdAndUpdate('principal', { $setOnInsert: initialContent }, { upsert: true, returnDocument: 'after', runValidators: true, timestamps: false });
  for (const item of messages) await MensajeContacto.updateOne({ correo: item.correo, asunto: item.asunto }, { $setOnInsert: item }, { upsert: true, runValidators: true });
  console.log('Contacto y mensajes ficticios cargados sin reemplazar datos existentes.');
} catch { console.error('No se pudieron cargar los datos. Revisa MongoDB.'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
