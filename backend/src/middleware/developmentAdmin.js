// Reemplazar por autenticación JWT y autorización ADMINISTRADOR al integrar usuarios.
// Bloqueado por defecto. El acceso temporal solo funciona en desarrollo y desde loopback.
export function developmentAdmin(req, res, next) {
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_ADMIN === 'true' && local) {
    return next();
  }
  return res.status(403).json({ message: 'Administración no habilitada. Se requiere autorización de administrador.' });
}
