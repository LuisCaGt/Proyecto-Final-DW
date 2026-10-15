import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';

try {
  await connectDatabase();
  const server = app.listen(process.env.PORT || 3000, () => console.log('API SIGCA lista'));
  async function shutdown() {
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch {
  console.error('No se pudo iniciar la API. Revisa MONGODB_URI y que MongoDB esté disponible.');
  process.exit(1);
}
