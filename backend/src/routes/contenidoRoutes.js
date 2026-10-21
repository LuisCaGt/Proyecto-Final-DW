import { updateContact } from '../controllers/contactoController.js';
import { Router } from 'express';
import { getContent, updateContent, updateCarousel } from '../controllers/contenidoController.js';
import { requireAuth, authorizeRoles } from '../middleware/auth.js';
const adminOnly = [requireAuth, authorizeRoles('ADMINISTRADOR')];

export const contenidoRouter = Router();
contenidoRouter.get('/', getContent);
contenidoRouter.put('/:id', adminOnly, updateContent);
contenidoRouter.put('/:id/carrusel', adminOnly, updateCarousel);
contenidoRouter.put('/:id/contacto', adminOnly, updateContact);
