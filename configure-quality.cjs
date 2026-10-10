const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const file = path.join(root, 'package.json');
const original = fs.readFileSync(file, 'utf8');
const config = JSON.parse(original);
if (!fs.existsSync(path.join(root, 'src/utils/demoData.ts'))) throw new Error('Executer depuis le depot CV Improvement mis a jour.');
const additions = {
  test: 'node scripts/run-tests.mjs unit',
  'test:unit': 'node scripts/run-tests.mjs unit',
  'test:api': 'npm run build:server && node scripts/run-tests.mjs integration',
  'test:quality': 'npm run test:unit && npm run test:api',
  'project:plan': 'node scripts/bootstrap-github-project.mjs',
  'project:apply': 'node scripts/bootstrap-github-project.mjs --apply',
};
config.scripts ||= {};
for (const [key, value] of Object.entries(additions)) {
  if (config.scripts[key] && config.scripts[key] !== value) throw new Error(`Script ${key} deja defini : integration manuelle necessaire.`);
}
Object.assign(config.scripts, additions);
fs.copyFileSync(file, `${file}.quality-${Date.now()}.bak`, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
const ignoreFile = path.join(root, '.gitignore');
let ignore = fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile, 'utf8') : '';
for (const pattern of ['/.qa-tmp/', '/qa-reports/', 'package.json.quality-*.bak']) {
  if (!ignore.split(/\r?\n/).includes(pattern)) ignore += `\n${pattern}\n`;
}
fs.writeFileSync(ignoreFile, ignore, 'utf8');
console.log('Tests et suivi de projet configures. Aucun changement des dependances, du logo ou du serveur.');
