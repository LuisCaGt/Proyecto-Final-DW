import mongoose from 'mongoose';
import { Usuario } from '../models/Usuario.js';
import { verifyToken } from '../utils/security.js';

export async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token, extra] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token || extra) return res.status(401).json({ message: 'Autenticación requerida.' });

  try {
    const payload = verifyToken(token);
    if (!mongoose.isObjectIdOrHexString(payload.sub)) return res.status(401).json({ message: 'Token inválido.' });
    const user = await Usuario.findById(payload.sub).select('-passwordHash').lean();
    if (!user || user.estado !== 'ACTIVO') return res.status(401).json({ message: 'La sesión no es válida o el usuario está inactivo.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'La sesión es inválida o ha vencido.' });
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Autenticación requerida.' });
    if (!roles.includes(req.user.rol)) return res.status(403).json({ message: 'No tienes permisos para esta operación.' });
    next();
  };
}