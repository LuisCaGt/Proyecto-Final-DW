import { Router } from 'express';
import { getHours, updateHours } from '../controllers/horariosController.js';
import { requireAuth, authorizeRoles } from '../middleware/auth.js';
const adminOnly = [requireAuth, authorizeRoles('ADMINISTRADOR')];
export const horariosRouter = Router();
horariosRouter.get('/', getHours);
horariosRouter.put('/', adminOnly, updateHours);
