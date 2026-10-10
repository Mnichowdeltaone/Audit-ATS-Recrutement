import test from 'node:test';
import assert from 'node:assert/strict';
import { isDemoId, isDemoApplication, filterOutDemoApplications, DEMO_FICTITIOUS_APPLICATIONS } from '../../src/utils/demoData.ts';

test('AUTO-DEMO-01 : reconnaitre les identifiants demo et historiques', () => {
  for (const id of ['demo-app-1', 'app-sample-1', 'sample-cv-1', 'app-1', 'app-2', 'app-3', 'cv-default-1', 'cv-tech-2']) assert.equal(isDemoId(id), true, id);
});
test('AUTO-DEMO-02 : conserver les identifiants personnels', () => {
  for (const id of ['candidate-42', 'application-42', 'cv-42', '', undefined, null]) assert.equal(isDemoId(id), false, String(id));
});
test('AUTO-DEMO-03 : reconnaitre le marquage explicite', () => {
  assert.equal(isDemoApplication({ id: 'personal-42', isDemo: true }), true);
  assert.equal(isDemoApplication(null), false);
});
test('AUTO-DEMO-04 : filtrer sans modifier la collection source', () => {
  const real = { id: 'personal-42', company: 'Entreprise fictive' };
  const input = [...DEMO_FICTITIOUS_APPLICATIONS, real];
  const snapshot = structuredClone(input);
  assert.deepEqual(filterOutDemoApplications(input), [real]);
  assert.deepEqual(input, snapshot);
});
test('AUTO-DEMO-05 : traiter une collection invalide sans exception', () => {
  assert.deepEqual(filterOutDemoApplications(null), []);
});
