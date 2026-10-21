import { Usuario } from '../models/Usuario.js';
import { signToken, verifyPassword } from '../utils/security.js';

const publicUser = user => ({
  id: user._id,
  identificador: user.identificador,
  nombres: user.nombres,
  apellidos: user.apellidos,
  correo: user.correo,
  telefono: user.telefono,
  rol: user.rol,
  estado: user.estado,
  especialidad: user.especialidad,
});

export async function login(req, res) {
  const { correo, password } = req.body || {};
  if (typeof correo !== 'string' || typeof password !== 'string') return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
  if (correo.length > 254 || password.length > 128) return res.status(400).json({ message: 'Credenciales inválidas.' });
  const user = await Usuario.findOne({ correo: correo.trim().toLowerCase() }).select('+passwordHash');
  if (!user || user.estado !== 'ACTIVO' || !await verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
  }
  const token = signToken(user.id, { expiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS) || 3600 });
  res.json({ token, user: publicUser(user) });
}

export function currentUser(req, res) {
  res.json(publicUser(req.user));
}
