import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../src/utils/security.js';

const secret = 'test-secret-for-security-unit-tests-32-bytes';

test('password hashes are salted and verify only the original password', async () => {
  const first = await hashPassword('ClaveSegura123!');
  const second = await hashPassword('ClaveSegura123!');
  assert.notEqual(first, second);
  assert.match(first, /^scrypt\$/);
  assert.equal(await verifyPassword('ClaveSegura123!', first), true);
  assert.equal(await verifyPassword('otra-clave', first), false);
});

test('JWT signatures validate and expired tokens are rejected', () => {
  const now = Date.UTC(2026, 0, 1);
  const token = signToken('usuario-1', { secret, now, expiresInSeconds: 60 });
  assert.equal(verifyToken(token, { secret, now }).sub, 'usuario-1');
  assert.throws(() => verifyToken(token, { secret: `${secret}-wrong`, now }), /Token inválido/);
  assert.throws(() => verifyToken(token, { secret, now: now + 60_000 }), /Token vencido/);
});

test('JWT requires a sufficiently strong secret', () => {
  assert.throws(() => signToken('usuario-1', { secret: 'too-short' }), /JWT_SECRET/);
});
