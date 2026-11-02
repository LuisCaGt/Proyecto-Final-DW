import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { root, backend, ejecutar, configurar, baseLocal } from './local.js';
let detener;
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  for (const folder of ['backend', 'frontend']) await ejecutar(npm, ['ci'], resolve(root, folder), process.env);
  const path = resolve(backend, '.env');
  if (!existsSync(path)) {
    await writeFile(path, `PORT=3000\nMONGODB_URI=mongodb://127.0.0.1:27019/sigca?replicaSet=sigca-local\nFRONTEND_URL=http://127.0.0.1:5173\nJWT_SECRET=${randomBytes(48).toString('hex')}\nJWT_EXPIRES_IN_SECONDS=3600\nDEMO_SEED_PASSWORD=Sigca-Demo-2026!\n`, { flag: 'wx', mode: 0o600 });
    console.log('Configuración local creada.');
  } else console.log('Se conserva backend/.env y sus credenciales.');
  const env = await configurar();
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || !env.DEMO_SEED_PASSWORD || env.DEMO_SEED_PASSWORD.length < 12) throw new Error('Completa JWT_SECRET y DEMO_SEED_PASSWORD en backend/.env.');
  detener = await baseLocal(env);
  await ejecutar(process.execPath, ['scripts/seedAll.js'], backend, env);
  console.log('\nPreparación completa. Ejecuta npm start desde la carpeta principal.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (detener) await detener(); }
