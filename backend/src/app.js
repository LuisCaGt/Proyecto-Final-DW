import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

export const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? 'connected' : 'disconnected',
  });
});

app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));
app.use((error, req, res, next) => {
  const invalidJson = error.type === 'entity.parse.failed';
  const tooLarge = error.type === 'entity.too.large';
  const status = invalidJson ? 400 : tooLarge ? 413 : 500;
  if (status === 500) console.error(error.message);
  res.status(status).json({ message: invalidJson ? 'JSON inválido' : tooLarge ? 'Solicitud demasiado grande' : 'Error interno del servidor' });
});
