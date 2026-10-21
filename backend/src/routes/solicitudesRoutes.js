import { Router } from 'express';
import * as controller from '../controllers/solicitudesController.js';
import { developmentAdmin } from '../middleware/developmentAdmin.js';

// TODO integración compañero 2: reemplazar developmentAdmin por autenticación JWT + roles ADMINISTRADOR y RECEPCIONISTA.
export const solicitudesRouter = Router();
solicitudesRouter.post('/', controller.create);
solicitudesRouter.get('/', developmentAdmin, controller.list);
solicitudesRouter.get('/:id', developmentAdmin, controller.getOne);
solicitudesRouter.patch('/:id/rechazar', developmentAdmin, controller.reject);
solicitudesRouter.post('/:id/convertir', developmentAdmin, controller.convert);
