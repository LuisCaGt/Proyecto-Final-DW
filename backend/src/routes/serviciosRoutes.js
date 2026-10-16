import { Router } from 'express';
import * as controller from '../controllers/serviciosController.js';
import { developmentAdmin } from '../middleware/developmentAdmin.js';

export const serviciosRouter = Router();
export const serviciosAdminRouter = Router();
serviciosRouter.get('/', controller.listPublic);
serviciosRouter.get('/:id', controller.getPublic);
serviciosRouter.post('/', developmentAdmin, controller.create);
serviciosRouter.put('/:id', developmentAdmin, controller.update);
serviciosRouter.patch('/:id/estado', developmentAdmin, controller.changeState);
serviciosAdminRouter.get('/', developmentAdmin, controller.listAdmin);
