import { Router } from 'express';
import * as controller from '../controllers/usuariosController.js';
import { authorizeRoles, requireAuth } from '../middleware/auth.js';

const adminOnly = [requireAuth, authorizeRoles('ADMINISTRADOR')];
export const usuariosRouter = Router();
export const profesionalesRouter = Router();

usuariosRouter.get('/', ...adminOnly, controller.listUsers);
usuariosRouter.post('/', ...adminOnly, controller.createUser);
usuariosRouter.put('/:id', ...adminOnly, controller.updateUser);
usuariosRouter.patch('/:id/estado', ...adminOnly, controller.changeUserState);
usuariosRouter.post('/:id/restablecer-password', ...adminOnly, controller.resetPassword);
profesionalesRouter.get('/activos', requireAuth, authorizeRoles('ADMINISTRADOR', 'RECEPCIONISTA'), controller.listActiveProfessionals);