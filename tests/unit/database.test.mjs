import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let directory;
let db;
const previous = process.env.CV_MOVE_DATA_DIR;
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'cv-improvement-unit-'));
  await mkdir(path.join(directory, 'server'));
  // Copy only the module: a tracked personal seed database must never enter a test.
  const modulePath = path.join(directory, 'server', 'localDb.mts');
  await copyFile(new URL('../../server/localDb.ts', import.meta.url), modulePath);
  process.env.CV_MOVE_DATA_DIR = path.join(directory, 'runtime-data');
  db = await import(pathToFileURL(modulePath).href);
});
beforeEach(async () => { await db.resetDatabase(); });
after(async () => {
  if (previous === undefined) delete process.env.CV_MOVE_DATA_DIR;
  else process.env.CV_MOVE_DATA_DIR = previous;
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('AUTO-DB-01 : base vierge dans un dossier isole', async () => {
  const data = db.getDatabase();
  assert.equal(data.profile.firstName, '');
  for (const key of ['profiles', 'cvs', 'applications', 'analyses', 'suggestions', 'coverLetters']) assert.deepEqual(data[key], []);
  assert.ok((await readdir(path.join(directory, 'runtime-data'))).includes('local_database.json'));
});
test('AUTO-DB-02 : basculer le profil actif sans doublon', async () => {
  await db.saveProfileToDb({ id: 'qa-profile-1', firstName: 'Alice', isDefault: true });
  await db.saveProfileToDb({ id: 'qa-profile-2', firstName: 'Bob', isDefault: false });
  await db.setDefaultProfile('qa-profile-2');
  assert.equal((await db.getProfile()).id, 'qa-profile-2');
  assert.equal((await db.getProfiles()).filter(p => p.isDefault).length, 1);
});
test('AUTO-DB-03 : persister une modification de CV sans doublon', async () => {
  await db.saveCv({ id: 'qa-cv', title: 'CV fictif', content: 'Version 1' });
  await db.saveCv({ id: 'qa-cv', title: 'CV fictif', content: 'Version 2' });
  assert.equal((await db.getCvs()).length, 1);
  const disk = JSON.parse(await readFile(path.join(directory, 'runtime-data/local_database.json'), 'utf8'));
  assert.equal(disk.cvs[0].content, 'Version 2');
  assert.ok(!(await readdir(path.join(directory, 'runtime-data'))).includes('local_database.json.tmp'));
});
test('AUTO-DB-04 : reattribuer le CV par defaut apres suppression', async () => {
  await db.saveCv({ id: 'qa-cv-1', title: 'Premier' });
  await db.saveCv({ id: 'qa-cv-2', title: 'Second' });
  assert.equal(await db.deleteCv('qa-cv-1'), true);
  assert.equal((await db.getCvs())[0].isDefault, true);
  assert.equal(await db.deleteCv('absent'), false);
});
test('AUTO-DB-05 : export puis restauration et statistiques', async () => {
  await db.saveApplication({ id: 'qa-app', company: 'Atelier Test', role: 'Developpeur', status: 'applied' });
  const backup = structuredClone(db.getDatabase());
  await db.resetDatabase();
  await db.importDatabase(backup);
  assert.equal((await db.getApplications())[0].company, 'Atelier Test');
  assert.equal((await db.getDatabaseStats()).applicationsCount, 1);
});
test('AUTO-DB-06 : mise a jour partielle des preferences', async () => {
  const original = await db.getSettings();
  await db.updateSettings({ selectedModel: 'gemini-flash-latest' });
  assert.equal((await db.getSettings()).selectedModel, 'gemini-flash-latest');
  assert.equal((await db.getSettings()).backupFrequency, original.backupFrequency);
});
