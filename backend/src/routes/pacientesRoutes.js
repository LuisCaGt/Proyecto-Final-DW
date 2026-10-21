import { Router } from 'express';
import * as controller from '../controllers/pacientesController.js';
import { listPatientGuardians } from '../controllers/responsablesController.js';
import { authorizeRoles, requireAuth } from '../middleware/auth.js';

const staff = [requireAuth, authorizeRoles('ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL')];
const managers = [requireAuth, authorizeRoles('ADMINISTRADOR', 'RECEPCIONISTA')];
export const pacientesRouter = Router();
pacientesRouter.get('/', ...staff, controller.listPatients);
pacientesRouter.post('/', ...managers, controller.createPatient);
pacientesRouter.get('/:id', ...staff, controller.getPatient);
pacientesRouter.put('/:id', ...managers, controller.updatePatient);
pacientesRouter.patch('/:id/estado', ...managers, controller.changePatientState);
pacientesRouter.get('/:id/responsables', ...managers, listPatientGuardians);
pacientesRouter.post('/:id/responsables', ...managers, controller.associateGuardian);