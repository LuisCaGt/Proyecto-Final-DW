import { Router } from 'express';
import * as controller from '../controllers/solicitudesController.js';
import { requireAuth, authorizeRoles } from '../middleware/auth.js';

export const solicitudesRouter = Router();
solicitudesRouter.post('/', controller.create);
solicitudesRouter.use(requireAuth, authorizeRoles('ADMINISTRADOR', 'RECEPCIONISTA'));
solicitudesRouter.get('/', controller.list);
solicitudesRouter.get('/:id', controller.getOne);
solicitudesRouter.patch('/:id/rechazar', controller.reject);
solicitudesRouter.post('/:id/convertir', controller.convert);
