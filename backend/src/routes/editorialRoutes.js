import { Router } from 'express';
import { editorialController } from '../controllers/editorialController.js';
import { developmentAdmin } from '../middleware/developmentAdmin.js';

export function editorialRoutes(publication) {
  const controller = editorialController(publication);
  const publicRouter = Router(), adminRouter = Router();
  publicRouter.get('/', controller.listPublic);
  publicRouter.get('/:id', controller.getPublic);
  publicRouter.post('/', developmentAdmin, controller.create);
  publicRouter.put('/:id', developmentAdmin, controller.update);
  publicRouter.patch('/:id/estado', developmentAdmin, controller.changeState);
  adminRouter.get('/', developmentAdmin, controller.listAdmin);
  return { publicRouter, adminRouter };
}
