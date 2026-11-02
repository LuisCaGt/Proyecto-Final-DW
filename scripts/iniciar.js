import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { root, backend, configurar, baseLocal } from './local.js';
const children = []; let detener; let cerrando = false;
async function libre(port) {
  await new Promise((ok, fail) => {
    const server = createServer();
    server.once('error', () => fail(new Error(`El puerto ${port} está ocupado. Cierra la ejecución anterior antes de iniciar SIGCA.`)));
    server.listen(port, '127.0.0.1', () => server.close(ok));
  });
}
async function cerrar(code = 0) {
  if (cerrando) return;
  cerrando = true;
  await Promise.all(children.map(child => child.exitCode !== null ? Promise.resolve() : new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); })));
  if (detener) await detener();
  process.exitCode = code;
}
process.once('SIGINT', () => cerrar()); process.once('SIGTERM', () => cerrar());
try {
  const env = await configurar();
  const url = new URL(env.FRONTEND_URL || 'http://127.0.0.1:5173');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('El inicio local requiere FRONTEND_URL con http://127.0.0.1 o http://localhost.');
  await libre(Number(env.PORT || 3000)); await libre(Number(url.port || 80));
  detener = await baseLocal(env);
  for (const [cwd, args] of [[backend, ['src/server.js']], [resolve(root, 'frontend'), ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', url.port || '80']]]) {
    const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit' }); children.push(child);
    child.once('error', error => { console.error(error.message); cerrar(1); });
    child.once('exit', code => { if (!cerrando) cerrar(code || 1); });
  }
  console.log(`\nSIGCA: ${url.origin}\nMantén esta terminal abierta. Para detener todo, presiona Ctrl+C.\n`);
} catch (error) { console.error(error.message); await cerrar(1); }
