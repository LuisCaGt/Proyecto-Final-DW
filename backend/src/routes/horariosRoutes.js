import { Router } from 'express';
import { getHours, updateHours } from '../controllers/horariosController.js';
import { developmentAdmin } from '../middleware/developmentAdmin.js';
export const horariosRouter = Router();
horariosRouter.get('/', getHours);
horariosRouter.put('/', developmentAdmin, updateHours);
