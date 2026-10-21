import { Router } from 'express';
import { editorialController } from '../controllers/editorialController.js';
import { requireAuth, authorizeRoles } from '../middleware/auth.js';
const adminOnly = [requireAuth, authorizeRoles('ADMINISTRADOR')];

export function editorialRoutes(publication) {
  const controller = editorialController(publication);
  const publicRouter = Router(), adminRouter = Router();
  publicRouter.get('/', controller.listPublic);
  publicRouter.get('/:id', controller.getPublic);
  publicRouter.post('/', adminOnly, controller.create);
  publicRouter.put('/:id', adminOnly, controller.update);
  publicRouter.patch('/:id/estado', adminOnly, controller.changeState);
  adminRouter.get('/', adminOnly, controller.listAdmin);
  return { publicRouter, adminRouter };
}
