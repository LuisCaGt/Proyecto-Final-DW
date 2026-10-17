import { Router } from 'express';
import { createMessage, getMessage, listMessages, setMessageState } from '../controllers/contactoController.js';
import { developmentAdmin } from '../middleware/developmentAdmin.js';
export const contactoRouter = Router();
contactoRouter.post('/', createMessage);
contactoRouter.get('/', developmentAdmin, listMessages);
contactoRouter.get('/:id', developmentAdmin, getMessage);
contactoRouter.patch('/:id/estado', developmentAdmin, setMessageState);
