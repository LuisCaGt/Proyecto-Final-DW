import { Router } from 'express';
import * as controller from '../controllers/responsablesController.js';
import { authorizeRoles, requireAuth } from '../middleware/auth.js';

const managers = [requireAuth, authorizeRoles('ADMINISTRADOR', 'RECEPCIONISTA')];
export const responsablesRouter = Router();
responsablesRouter.get('/', ...managers, controller.listGuardians);
responsablesRouter.post('/', ...managers, controller.createGuardian);
responsablesRouter.get('/:id', ...managers, controller.getGuardian);
responsablesRouter.put('/:id', ...managers, controller.updateGuardian);