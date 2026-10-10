import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';

const main = fs.readFileSync(new URL('../../main.cjs', import.meta.url), 'utf8');
const start = main.indexOf('async function resetAfterInstallation(');
const end = main.indexOf('\nfunction startServer()', start);
assert.ok(start >= 0 && end > start);
const reset = vm.runInNewContext(`(${main.slice(start, end).trim()})`, { fs, path });
const first = '{12345678-1234-1234-1234-123456789abc}';
const second = '{22345678-1234-1234-1234-123456789abc}';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-install-reset-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const resourcesPath = path.join(root, 'resources');
  const userDataPath = path.join(root, 'user');
  const data = path.join(userDataPath, 'data');
  fs.mkdirSync(resourcesPath, { recursive: true });
  fs.mkdirSync(data, { recursive: true });
  const database = path.join(data, 'local_database.json');
  fs.writeFileSync(database, '{"cvs":[{"id":"fake-personal-cv"}]}');
  let clearCount = 0;
  const options = { resourcesPath, userDataPath, clearBrowserStorage: async () => { clearCount++; } };
  return { options, database, marker: path.join(resourcesPath, 'installation-reset.id'), get clearCount() { return clearCount; } };
}
test('AUTO-INSTALL-01 : sans installation nouvelle les donnees restent intactes', async t => {
  const f = fixture(t);
  assert.equal(await reset(f.options), false);
  assert.equal(fs.existsSync(f.database), true);
  assert.equal(f.clearCount, 0);
});
test('AUTO-INSTALL-02 : installation efface base et stockage navigateur une seule fois', async t => {
  const f = fixture(t);
  fs.writeFileSync(f.marker, first);
  assert.equal(await reset(f.options), true);
  assert.equal(fs.existsSync(f.database), false);
  assert.equal(f.clearCount, 1);
  fs.mkdirSync(path.dirname(f.database), { recursive: true });
  fs.writeFileSync(f.database, '{"cvs":[{"id":"nouveau-cv"}]}');
  assert.equal(await reset(f.options), false);
  assert.equal(fs.existsSync(f.database), true);
  assert.equal(f.clearCount, 1);
});
test('AUTO-INSTALL-03 : reinstallation declenche une nouvelle remise a zero', async t => {
  const f = fixture(t);
  fs.writeFileSync(f.marker, first);
  await reset(f.options);
  fs.mkdirSync(path.dirname(f.database), { recursive: true });
  fs.writeFileSync(f.database, '{}');
  fs.writeFileSync(f.marker, second);
  assert.equal(await reset(f.options), true);
  assert.equal(fs.existsSync(f.database), false);
  assert.equal(f.clearCount, 2);
});
test('AUTO-INSTALL-04 : echec du nettoyage ne valide pas la remise a zero', async t => {
  const f = fixture(t);
  fs.writeFileSync(f.marker, first);
  await assert.rejects(reset({ ...f.options, clearBrowserStorage: async () => { throw new Error('Nettoyage impossible'); } }), /Nettoyage impossible/);
  assert.equal(fs.existsSync(f.database), true);
  assert.equal(fs.existsSync(path.join(f.options.userDataPath, 'installation-reset-receipt.json')), false);
  assert.equal(await reset(f.options), true);
});
