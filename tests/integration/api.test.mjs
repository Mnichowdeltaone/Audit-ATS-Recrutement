import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';

let child;
let directory;
let base;
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'cv-improvement-api-'));
  const server = path.join(directory, 'server.mjs');
  await copyFile(new URL('../../dist/server.js', import.meta.url), server);
  const reservation = net.createServer();
  await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, [server], {
    env: { ...process.env, NODE_ENV: 'production', PORT: String(port), GEMINI_API_KEY: '', GOOGLE_API_KEY: '', CV_MOVE_DATA_DIR: path.join(directory, 'data') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', data => { log = `${log}${data}`.slice(-6000); });
  child.stderr.on('data', data => { log = `${log}${data}`.slice(-6000); });
  let spawnError;
  child.on('error', error => { spawnError = error; });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error(`Serveur arrete (${child.exitCode}) : ${log}`);
    try {
      const response = await fetch(`${base}/api/key-status`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch { /* Startup is asynchronous. */ }
    await pause(100);
  }
  throw new Error(`Serveur non disponible apres 15 secondes : ${log}`);
});
async function request(route, method = 'GET', body) {
  const response = await fetch(`${base}${route}`, {
    method,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(5000),
  });
  return { response, body: await response.json() };
}
beforeEach(async () => {
  const result = await request('/api/db/reset', 'POST');
  assert.equal(result.response.status, 200);
});
after(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const done = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    const killer = setTimeout(() => child.kill('SIGKILL'), 3000);
    try { await done; } finally { clearTimeout(killer); }
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('AUTO-API-01 : statut sans cle serveur', async () => {
  const result = await request('/api/key-status');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.hasServerKey, false);
});
test('AUTO-API-02 : preflight JSON depuis Electron', async () => {
  const response = await fetch(`${base}/api/test-key`, { method: 'OPTIONS', headers: { Origin: 'null', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('access-control-allow-methods'), /POST/);
  assert.match(response.headers.get('access-control-allow-headers'), /Content-Type/i);
});
test('AUTO-API-03 : validation analyse avant tout appel Gemini', async () => {
  assert.equal((await request('/api/analyze', 'POST', {})).response.status, 400);
  assert.equal((await request('/api/analyze', 'POST', { cvText: 'CV fictif' })).response.status, 400);
  assert.equal((await request('/api/analyze', 'POST', { cvText: 'CV fictif', jobText: 'Offre fictive' })).response.status, 401);
});
test('AUTO-API-04 : cle absente et assistance vide', async () => {
  assert.equal((await request('/api/test-key', 'POST', {})).response.status, 400);
  assert.equal((await request('/api/assist-cv', 'POST', { action: 'optimize_cv', input: '' })).response.status, 400);
});
test('AUTO-API-05 : profil actif et erreur de profil absent', async () => {
  const saved = await request('/api/db/profiles', 'POST', { id: 'qa-profile', firstName: 'Alice', isDefault: true });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.body.profile.id, 'qa-profile');
  assert.equal((await request('/api/db/profile')).body.firstName, 'Alice');
  assert.equal((await request('/api/db/profiles/absent/set-default', 'POST')).response.status, 404);
});
test('AUTO-API-06 : cycle CV creation lecture suppression', async () => {
  assert.deepEqual((await request('/api/db/cvs')).body, []);
  assert.equal((await request('/api/db/cvs', 'POST', { id: 'qa-cv', title: 'CV fictif', content: 'Donnees synthetiques' })).response.status, 200);
  assert.equal((await request('/api/db/cvs')).body.length, 1);
  assert.equal((await request('/api/db/cvs/qa-cv', 'DELETE')).body.success, true);
  assert.deepEqual((await request('/api/db/cvs')).body, []);
});
test('AUTO-API-07 : export et restauration dans la base de test', async () => {
  await request('/api/db/cvs', 'POST', { id: 'qa-export', title: 'Sauvegarde fictive' });
  const backup = await request('/api/db/export');
  assert.match(backup.response.headers.get('content-disposition'), /attachment/);
  await request('/api/db/reset', 'POST');
  assert.equal((await request('/api/db/import', 'POST', backup.body)).response.status, 200);
  assert.equal((await request('/api/db/cvs')).body[0].id, 'qa-export');
});
