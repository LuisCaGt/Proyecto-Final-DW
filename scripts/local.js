import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const backend = resolve(root, 'backend');
const requireBackend = createRequire(resolve(backend, 'package.json'));
export async function configurar() {
  if (!existsSync(resolve(backend, '.env'))) throw new Error('Ejecuta primero npm run preparar.');
  const { config } = requireBackend('dotenv');
  const { parsed, error } = config({ path: resolve(backend, '.env'), quiet: true });
  if (error) throw error;
  // Los procesos usan exactamente la configuración local, sin cambiar archivos existentes.
  return { ...process.env, ...parsed };
}
export function ejecutar(file, args, cwd, env) {
  const child = spawn(file, args, { cwd, env, stdio: 'inherit', ...(process.platform === 'win32' && file === 'npm.cmd' ? { shell: true } : {}) });
  return new Promise((ok, fail) => {
    child.once('error', fail);
    child.once('exit', code => code === 0 ? ok() : fail(new Error(`El comando terminó con código ${code}.`)));
  });
}
export async function baseLocal(env) {
  const mongoose = requireBackend('mongoose');
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error('Falta MONGODB_URI en backend/.env.');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName) throw new Error('MongoDB debe usar replica set para pagos y caja.');
    await mongoose.disconnect();
    return async () => {};
  } catch (error) {
    const connected = mongoose.connection.readyState === 1;
    await mongoose.disconnect();
    if (connected) throw error;
  }
  if (!uri.startsWith('mongodb://')) throw new Error('No se pudo conectar a MongoDB. Revisa la conexión configurada.');
  const url = new URL(uri);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.username || url.password || !url.searchParams.get('replicaSet')) throw new Error('No se pudo conectar a MongoDB. Revisa MONGODB_URI.');
  const { MongoMemoryReplSet } = requireBackend('mongodb-memory-server');
  const { mkdir } = await import('node:fs/promises');
  const dbPath = resolve(backend, '.data/mongo');
  await mkdir(dbPath, { recursive: true });
  console.log('Iniciando MongoDB local. La primera vez descarga el servidor y puede tardar varios minutos.');
  const repl = await MongoMemoryReplSet.create({
    binary: { version: env.MONGOMS_VERSION || '8.2.6' },
    instanceOpts: [{ port: Number(url.port || 27017), dbPath, ip: '127.0.0.1' }],
    replSet: { count: 1, name: url.searchParams.get('replicaSet'), storageEngine: 'wiredTiger', ip: '127.0.0.1' },
  });
  return () => repl.stop({ doCleanup: false });
}
