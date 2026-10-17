import { Router } from 'express';
import { getContent, updateContent, updateCarousel } from '../controllers/contenidoController.js';
import { developmentAdmin } from '../middleware/developmentAdmin.js';

export const contenidoRouter = Router();
contenidoRouter.get('/', getContent);
contenidoRouter.put('/:id', developmentAdmin, updateContent);
contenidoRouter.put('/:id/carrusel', developmentAdmin, updateCarousel);
