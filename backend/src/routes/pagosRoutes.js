import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/pagosController.js';

export const pagosRouter = Router();
pagosRouter.use(requireAuth);
pagosRouter.post('/', controller.registrar);
pagosRouter.get('/cita/:citaId', controller.listarDeCita);
pagosRouter.patch('/:id/anular', controller.anular);
