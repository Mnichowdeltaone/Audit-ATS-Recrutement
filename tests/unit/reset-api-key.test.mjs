import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { localDbClient } from '../../src/services/localDbClient.ts';

function browser(t, entries = {}) {
  const values = new Map(Object.entries(entries));
  const emitted = [];
  const names = ['localStorage', 'window', 'fetch', 'CustomEvent'];
  const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  const mocks = {
    localStorage: storage,
    window: { dispatchEvent: event => emitted.push(event.type) },
    CustomEvent: class { constructor(type) { this.type = type; } },
    fetch: async (url, options) => {
      assert.equal(url, '/api/db/reset');
      assert.equal(options.method, 'POST');
      return { ok: true, json: async () => ({ data: { cvs: [], applications: [], analyses: [] } }) };
    },
  };
  names.forEach(name => Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: mocks[name] }));
  t.after(() => names.forEach((name, i) => {
    if (previous[i]) Object.defineProperty(globalThis, name, previous[i]);
    else delete globalThis[name];
  }));
  return { storage, emitted };
}

test('AUTO-CLE-01 : remise a zero supprime les deux copies de la cle', async t => {
  const { storage, emitted } = browser(t, {
    cv_move_gemini_api_key: 'fake-test-key',
    gemini_api_key: 'fake-test-key',
    unrelated_preference: 'conserver',
  });
  await localDbClient.resetDatabase();
  assert.equal(storage.getItem('cv_move_gemini_api_key'), null);
  assert.equal(storage.getItem('gemini_api_key'), null);
  assert.equal(localDbClient.getSavedApiKey(), '');
  assert.equal(storage.getItem('unrelated_preference'), 'conserver');
  assert.ok(emitted.includes('cv_move_database_reset'));
});

test('AUTO-CLE-02 : ancienne cle seule ne revient pas au rechargement', async t => {
  browser(t, { gemini_api_key: 'fake-legacy-test-key' });
  await localDbClient.resetDatabase();
  assert.equal(localDbClient.getSavedApiKey(), '');
});

test('AUTO-CLE-03 : remise a zero efface aussi la cle en memoire', t => {
  const { storage } = browser(t, { cv_move_gemini_api_key: 'fake-test-key', gemini_api_key: 'fake-test-key' });
  const source = readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');
  const match = source.match(/const handleDatabaseReset = \(\) => \{([\s\S]*?)\n  \};/);
  assert.ok(match, 'Reset handler must exist');
  const calls = new Map();
  const context = { localDbClient, localStorage: storage };
  for (const name of new Set(match[1].match(/\bset[A-Z]\w+(?=\()/g))) {
    context[name] = value => calls.set(name, value);
  }
  vm.runInNewContext(`(function () { ${match[1]} })()`, context);
  assert.equal(calls.get('setApiKey'), '');
  assert.equal(calls.get('setShowApiKey'), false);
  assert.equal(localDbClient.getSavedApiKey(), '');
});
