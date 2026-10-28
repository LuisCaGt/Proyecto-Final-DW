// Servidor de desarrollo persistente. Producción debe usar MongoDB Atlas o un replica set administrado.
import 'dotenv/config';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
const dbPath = resolve(process.env.SIGCA_DB_PATH || '.data/mongo');
await mkdir(dbPath, { recursive: true });
const repl = await MongoMemoryReplSet.create({
  binary: { version: process.env.MONGOMS_VERSION || '8.2.6' },
  instanceOpts: [{ port: 27017, dbPath, ip: '127.0.0.1' }],
  replSet: { count: 1, name: 'sigca-local', storageEngine: 'wiredTiger', ip: '127.0.0.1' },
});
console.log('MongoDB local disponible: mongodb://127.0.0.1:27017/sigca?replicaSet=sigca-local');
console.log('Datos persistidos en ' + dbPath);
async function stop() { await repl.stop({ doCleanup: false }); process.exit(); }
process.once('SIGINT', stop); process.once('SIGTERM', stop);
