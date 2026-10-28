import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/cajasController.js';

export const cajasRouter = Router();
cajasRouter.use(requireAuth);
cajasRouter.post('/abrir', controller.abrir);
cajasRouter.get('/actual', controller.actual);
cajasRouter.get('/', controller.listar);
cajasRouter.get('/:id/movimientos', controller.movimientos);
cajasRouter.get('/:id', controller.detalle);
cajasRouter.post('/:id/cerrar', controller.cerrar);
