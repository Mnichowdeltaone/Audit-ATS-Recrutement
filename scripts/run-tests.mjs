import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const suite = process.argv[2] || 'unit';
if (!['unit', 'integration'].includes(suite)) throw new Error('Suite attendue : unit ou integration.');
if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Les tests demandent Node.js 24 ou plus.');
if (suite === 'integration' && !existsSync(path.join(root, 'dist/server.js'))) {
  throw new Error('Compiler le serveur avec npm run build:server avant les tests API.');
}
const files = readdirSync(path.join(root, 'tests', suite)).filter(f => f.endsWith('.test.mjs')).sort();
if (!files.length) throw new Error('Aucun test trouve.');
const temp = path.join(root, '.qa-tmp');
mkdirSync(temp, { recursive: true });
const result = spawnSync(process.execPath, [
  '--import', pathToFileURL(path.join(root, 'tests/support/typescript-resolver.mjs')).href,
  '--test', ...files.map(f => path.join(root, 'tests', suite, f)),
], { cwd: root, stdio: 'inherit', env: { ...process.env, TMPDIR: temp, TEMP: temp, TMP: temp } });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
