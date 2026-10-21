import { Router } from 'express';
import * as controller from '../controllers/serviciosController.js';
import { requireAuth, authorizeRoles } from '../middleware/auth.js';
const adminOnly = [requireAuth, authorizeRoles('ADMINISTRADOR')];

export const serviciosRouter = Router();
export const serviciosAdminRouter = Router();
serviciosRouter.get('/', controller.listPublic);
serviciosRouter.get('/:id', controller.getPublic);
serviciosRouter.post('/', adminOnly, controller.create);
serviciosRouter.put('/:id', adminOnly, controller.update);
serviciosRouter.patch('/:id/estado', adminOnly, controller.changeState);
serviciosAdminRouter.get('/', adminOnly, controller.listAdmin);
