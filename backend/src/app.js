import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { contactoRouter } from './routes/contactoRoutes.js';
import { editorialRoutes } from './routes/editorialRoutes.js';
import { horariosRouter } from './routes/horariosRoutes.js';
import { contenidoRouter } from './routes/contenidoRoutes.js';
import { serviciosRouter, serviciosAdminRouter } from './routes/serviciosRoutes.js';
import { solicitudesRouter } from './routes/solicitudesRoutes.js';
import { citasRouter } from './routes/citasRoutes.js';

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

const publications = editorialRoutes(true);
const activities = editorialRoutes(false);
app.use('/api/publicaciones', publications.publicRouter);
app.use('/api/admin/publicaciones', publications.adminRouter);
app.use('/api/actividades', activities.publicRouter);
app.use('/api/admin/actividades', activities.adminRouter);

app.use('/api/contacto', contactoRouter);
app.use('/api/horarios', horariosRouter);
app.use('/api/contenido', contenidoRouter);
app.use('/api/servicios', serviciosRouter);
app.use('/api/admin/servicios', serviciosAdminRouter);
app.use('/api/solicitudes-cita', solicitudesRouter);
app.use('/api/citas', citasRouter);

app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));
app.use((error, req, res, next) => {
  const invalidJson = error.type === 'entity.parse.failed';
  const tooLarge = error.type === 'entity.too.large';
  const status = invalidJson ? 400 : tooLarge ? 413 : error.status || (error.name === 'ValidationError' ? 400 : 500);
  if (status === 500) console.error(error.message);
  res.status(status).json({ ...(error.fields ? { fields: error.fields } : {}), message: error.status ? error.message : invalidJson ? 'JSON inválido' : tooLarge ? 'Solicitud demasiado grande' : 'Error interno del servidor' });
});
