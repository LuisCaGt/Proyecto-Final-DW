import { Router } from 'express';
import * as controller from '../controllers/citasController.js';
import { developmentAdmin } from '../middleware/developmentAdmin.js';

// TODO integración compañero 2: reemplazar developmentAdmin por JWT + roles
// (ADMINISTRADOR y RECEPCIONISTA programan; PROFESIONAL solo consulta sus citas).
export const citasRouter = Router();
citasRouter.use(developmentAdmin);
citasRouter.get('/opciones', controller.options);
citasRouter.get('/', controller.list);
citasRouter.post('/', controller.create);
citasRouter.get('/:id', controller.getOne);
citasRouter.put('/:id', controller.update);
citasRouter.patch('/:id/estado', controller.changeState);
