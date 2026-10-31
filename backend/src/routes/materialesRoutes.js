import { Router } from 'express';
import * as controller from '../controllers/materialesController.js';
import { authorizeRoles, requireAuth } from '../middleware/auth.js';

// Catálogo: el administrador lo gestiona; el profesional consulta los materiales activos.
export const materialesRouter = Router();
materialesRouter.use(requireAuth);
materialesRouter.get('/', authorizeRoles('ADMINISTRADOR', 'PROFESIONAL'), controller.list);
materialesRouter.post('/', authorizeRoles('ADMINISTRADOR'), controller.create);
materialesRouter.get('/:id', authorizeRoles('ADMINISTRADOR', 'PROFESIONAL'), controller.getOne);
materialesRouter.put('/:id', authorizeRoles('ADMINISTRADOR'), controller.update);
materialesRouter.patch('/:id/estado', authorizeRoles('ADMINISTRADOR'), controller.changeState);

// Asignaciones por paciente (se monta en /api/pacientes junto a las rutas de pacientes).
// Todo el personal consulta; asignan el administrador y el profesional autorizado.
export const materialesPacienteRouter = Router();
materialesPacienteRouter.get('/:id/materiales', requireAuth, authorizeRoles('ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL'), controller.listAssigned);
materialesPacienteRouter.post('/:id/materiales', requireAuth, authorizeRoles('ADMINISTRADOR', 'PROFESIONAL'), controller.assign);
