import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(readFileSync(path.join(root, 'docs/project/backlog.json'), 'utf8'));
const [owner] = plan.repository.split('/');
const apply = process.argv.includes('--apply');
if (!apply) {
  console.log(`PREVISUALISATION : ${plan.repository}`);
  console.log(`Projet : ${plan.projectTitle}`);
  console.log(`${plan.labels.length} labels, ${plan.milestones.length} jalons, ${plan.issues.length} tickets.`);
  for (const issue of plan.issues) console.log(`${issue.id} [${issue.priority}] ${issue.title}`);
  console.log('Aucune modification GitHub. Relancer avec --apply pour creer les elements.');
  process.exit(0);
}
function gh(args, input) {
  const result = spawnSync(process.platform === 'win32' ? 'gh.exe' : 'gh', args, {
    cwd: root, encoding: 'utf8', ...(input === undefined ? {} : { input: JSON.stringify(input) }),
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw new Error(`GitHub CLI indisponible : ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${args.slice(0, 3).join(' ')} : ${result.stderr.trim()}`);
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}
function api(method, endpoint, input) {
  return gh(['api', '--method', method, endpoint, ...(input === undefined ? [] : ['--input', '-'])], input);
}
function list(endpoint) { return gh(['api', '--paginate', '--slurp', endpoint]).flat(); }
const repo = api('GET', `repos/${plan.repository}`);
if (!repo.permissions?.push) throw new Error('Le compte GitHub CLI ne dispose pas des droits ecriture sur ce depot. Utiliser le compte proprietaire.');
const login = api('GET', 'user').login;
if (login !== owner) throw new Error(`Le projet personnel doit etre cree depuis ${owner}, compte actuel : ${login}.`);
// Check project access before creating any issues or labels.
const projects = gh(['project', 'list', '--owner', owner, '--limit', '1000', '--format', 'json']).projects;
let project = projects.find(p => p.title === plan.projectTitle);
if (!project) project = gh(['project', 'create', '--owner', owner, '--title', plan.projectTitle, '--format', 'json']);
gh(['project', 'link', String(project.number), '--owner', owner, '--repo', plan.repository]);
let fields = gh(['project', 'field-list', String(project.number), '--owner', owner, '--limit', '100', '--format', 'json']).fields;
let priority = fields.find(f => f.name === 'Priorite');
if (!priority) {
  gh(['project', 'field-create', String(project.number), '--owner', owner, '--name', 'Priorite', '--data-type', 'SINGLE_SELECT', '--single-select-options', 'P0,P1,P2', '--format', 'json']);
  fields = gh(['project', 'field-list', String(project.number), '--owner', owner, '--limit', '100', '--format', 'json']).fields;
  priority = fields.find(f => f.name === 'Priorite');
}
if (!priority || !['P0', 'P1', 'P2'].every(name => priority.options?.some(o => o.name === name))) {
  throw new Error('Le champ Priorite du projet ne propose pas P0, P1 et P2. Corriger ce champ puis relancer.');
}
const status = fields.find(f => f.name === 'Status');
const todo = status?.options?.find(o => ['Todo', 'To do', 'A faire', '\u00c0 faire'].includes(o.name));
const labels = list(`repos/${plan.repository}/labels?per_page=100`);
for (const label of plan.labels) if (!labels.some(l => l.name === label.name)) api('POST', `repos/${plan.repository}/labels`, label);
const milestones = list(`repos/${plan.repository}/milestones?state=all&per_page=100`);
for (const milestone of plan.milestones) if (!milestones.some(m => m.title === milestone.title)) milestones.push(api('POST', `repos/${plan.repository}/milestones`, milestone));
const issues = list(`repos/${plan.repository}/issues?state=all&per_page=100`).filter(i => !i.pull_request);
const items = gh(['project', 'item-list', String(project.number), '--owner', owner, '--limit', '1000', '--format', 'json']).items;
const index = { baseline: plan.baseline, project: { number: project.number, url: project.url }, issues: [] };
for (const ticket of plan.issues) {
  const marker = `<!-- ${ticket.id} -->`;
  let issue = issues.find(i => i.body?.includes(marker));
  if (!issue) {
    const body = `${marker}\n## Contexte\n${ticket.evidence}\n\n## Criteres d'acceptation\n${ticket.acceptance.map(a => `- [ ] ${a}`).join('\n')}\n\n## Tests associes\n${ticket.tests.map(t => `- ${t}`).join('\n')}\n\nReferentiel : docs/quality/REFERENTIEL.md\nPriorite : ${ticket.priority}\nBase analysee : ${plan.baseline}`;
    issue = api('POST', `repos/${plan.repository}/issues`, { title: `[${ticket.id}] ${ticket.title}`, body, labels: ticket.labels, milestone: milestones.find(m => m.title === ticket.milestone).number });
    issues.push(issue);
  }
  if (!items.some(i => i.content?.url === issue.html_url)) {
    const item = gh(['project', 'item-add', String(project.number), '--owner', owner, '--url', issue.html_url, '--format', 'json']);
    gh(['project', 'item-edit', '--id', item.id, '--project-id', project.id, '--field-id', priority.id, '--single-select-option-id', priority.options.find(o => o.name === ticket.priority).id]);
    if (todo) gh(['project', 'item-edit', '--id', item.id, '--project-id', project.id, '--field-id', status.id, '--single-select-option-id', todo.id]);
    items.push({ content: { url: issue.html_url } });
  }
  index.issues.push({ id: ticket.id, number: issue.number, url: issue.html_url });
  console.log(`${ticket.id} : ${issue.html_url}`);
}
writeFileSync(path.join(root, 'docs/project/github-index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(`Projet : ${project.url}`);
console.log('Les elements existants ont ete conserves. Choisir une vue Board groupee par Status dans GitHub.');
