import * as pagos from '../controllers/pagosController.js';
import { Router } from 'express';
import * as controller from '../controllers/citasController.js';
import { requireAuth, authorizeRoles } from '../middleware/auth.js';

const manage = authorizeRoles('ADMINISTRADOR', 'RECEPCIONISTA');
export const citasRouter = Router();
citasRouter.use(requireAuth, authorizeRoles('ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL'));
citasRouter.get('/opciones', controller.options);
citasRouter.get('/calendario', controller.calendar);
citasRouter.get('/', controller.list);
citasRouter.post('/', manage, controller.create);
citasRouter.get('/:id/saldo', manage, pagos.saldo);
citasRouter.get('/:id/pagos', manage, pagos.listarDeCita);
citasRouter.get('/:id', controller.getOne);
citasRouter.put('/:id', manage, controller.update);
citasRouter.patch('/:id/estado', manage, controller.changeState);
