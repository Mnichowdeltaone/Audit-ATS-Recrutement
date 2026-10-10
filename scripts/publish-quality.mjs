import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'quality-manifest.json'), 'utf8'));
const repository = manifest.repository;
function run(binary, args, cwd = root) {
  const executable = process.platform === 'win32' && ['git', 'gh'].includes(binary) ? `${binary}.exe` : binary;
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} ${args.slice(0, 3).join(' ')} : ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}
if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24 ou plus est requis.');
const info = JSON.parse(run('gh', ['api', `repos/${repository}`]));
if (!info.permissions?.push) throw new Error('Le compte GitHub CLI ne peut pas publier dans ce depot.');
const remote = run('git', ['remote', 'get-url', 'origin']);
if (!remote.replace(/\.git$/, '').endsWith(repository)) throw new Error(`Depot origin inattendu : ${remote}`);
const stateFile = path.join(root, '.qa-tmp', 'quality-publication.json');
if (existsSync(stateFile)) {
  const previous = JSON.parse(readFileSync(stateFile, 'utf8'));
  console.log(`Publication deja preparee : ${previous.pullRequest}`);
  console.log('Verifier cette PR avant de creer une nouvelle publication.');
  process.exit(0);
}
run('git', ['fetch', 'origin']);
const head = run('git', ['rev-parse', 'origin/main']);
if (head !== manifest.baseline) throw new Error('origin/main a change depuis la preparation. Reviser les tests et le referentiel avant publication.');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const branch = `quality/tests-project-${stamp}`;
const worktree = path.join(root, '.qa-tmp', `publication-${stamp}`);
mkdirSync(path.dirname(worktree), { recursive: true });
run('git', ['worktree', 'add', '-b', branch, worktree, 'origin/main']);
console.log(`Worktree de publication : ${worktree}`);
for (const relative of manifest.files) {
  const source = path.join(root, relative);
  const target = path.join(worktree, relative);
  if (!existsSync(source)) throw new Error(`Fichier du pack absent : ${relative}`);
  if (existsSync(target) && !readFileSync(target).equals(readFileSync(source))) throw new Error(`Fichier existant different : ${relative}. Aucune publication effectuee.`);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(source, target);
}
run(process.execPath, ['configure-quality.cjs'], worktree);
const tests = run(process.execPath, ['scripts/run-tests.mjs', 'unit'], worktree);
console.log(tests);
run('git', ['add', '--', ...manifest.files, 'package.json', '.gitignore'], worktree);
run('git', ['commit', '-m', 'test: add quality reference and GitHub project tooling'], worktree);
run('git', ['push', '--set-upstream', 'origin', branch], worktree);
const bodyFile = path.join(root, '.qa-tmp', `pr-${stamp}.md`);
writeFileSync(bodyFile, "Le depot ne disposait pas de referentiel de recette ni de suivi de validation. Cette PR ajoute 19 tests unitaires, 7 tests API sur base temporaire, une CI Windows/Linux et 36 scenarios manuels.\n\nElle ajoute egalement des templates de tickets/PR et un backlog de 9 tickets avec un script pour creer le projet GitHub et ses 3 jalons.\n\nValidation : 19 tests unitaires passes sur la branche de publication. Tests API, CI et recette Windows restent a executer. Les fichiers de production ne sont pas modifies ; seules les commandes npm et les exclusions temporaires sont ajoutees a la configuration.\n", 'utf8');
const pullRequest = run('gh', ['pr', 'create', '--repo', repository, '--base', 'main', '--head', branch, '--title', 'Referentiel de tests et pilotage CV Improvement', '--body-file', bodyFile], worktree);
writeFileSync(stateFile, `${JSON.stringify({ branch, worktree, pullRequest }, null, 2)}\n`);
console.log(`PR creee : ${pullRequest}`);
console.log('Aucune fusion automatique. La branche locale de travail et ses personnalisations restent intactes.');
