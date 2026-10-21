import { Router } from 'express';
import { createMessage, getMessage, listMessages, setMessageState } from '../controllers/contactoController.js';
import { requireAuth, authorizeRoles } from '../middleware/auth.js';
const adminOnly = [requireAuth, authorizeRoles('ADMINISTRADOR')];
export const contactoRouter = Router();
contactoRouter.post('/', createMessage);
contactoRouter.get('/', adminOnly, listMessages);
contactoRouter.get('/:id', adminOnly, getMessage);
contactoRouter.patch('/:id/estado', adminOnly, setMessageState);
