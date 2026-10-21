import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const TOKEN_ALGORITHM = 'HS256';

function getSecret(secret = process.env.JWT_SECRET) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET debe contener al menos 32 bytes.');
  }
  return secret;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signature(input, secret) {
  return createHmac('sha256', getSecret(secret)).update(input).digest('base64url');
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false;
  const [algorithm, encodedSalt, encodedHash, extra] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !encodedSalt || !encodedHash || extra !== undefined) return false;
  try {
    const expected = Buffer.from(encodedHash, 'base64url');
    const actual = await scrypt(password, Buffer.from(encodedSalt, 'base64url'), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function signToken(userId, { secret, expiresInSeconds = 3600, now = Date.now() } = {}) {
  const issuedAt = Math.floor(now / 1000);
  const header = encode({ alg: TOKEN_ALGORITHM, typ: 'JWT' });
  const payload = encode({ sub: String(userId), iat: issuedAt, exp: issuedAt + expiresInSeconds });
  const input = `${header}.${payload}`;
  return `${input}.${signature(input, secret)}`;
}

export function verifyToken(token, { secret, now = Date.now() } = {}) {
  if (typeof token !== 'string') throw new Error('Token inválido.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token inválido.');

  const [headerPart, payloadPart, providedSignature] = parts;
  const expectedSignature = signature(`${headerPart}.${payloadPart}`, secret);
  const provided = Buffer.from(providedSignature, 'base64url');
  const expected = Buffer.from(expectedSignature, 'base64url');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new Error('Token inválido.');

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Token inválido.');
  }

  if (header.alg !== TOKEN_ALGORITHM || typeof payload.sub !== 'string' || !Number.isInteger(payload.exp)) throw new Error('Token inválido.');
  if (payload.exp <= Math.floor(now / 1000)) throw new Error('Token vencido.');
  return payload;
}

export function validateJwtSecret() {
  getSecret();
}