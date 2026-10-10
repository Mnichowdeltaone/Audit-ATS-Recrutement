import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the actual metric calculations used by the report, without a browser.
const source = readFileSync(new URL('../../src/components/JobSearchAnalyticsReport.tsx', import.meta.url), 'utf8');
function calculate(name, analyses = [], applications = []) {
  const start = source.indexOf(`const ${name} = useMemo(() => {`);
  assert.notEqual(start, -1, 'Metric calculation must exist');
  const bodyStart = source.indexOf('{', start) + 1;
  const end = source.indexOf('}, [', bodyStart);
  return vm.runInNewContext(`(function () { ${source.slice(bodyStart, end)} })()`, {
    analyses, filteredApps: applications,
  });
}
test('AUTO-RAPPORT-01 : base vide, scores et progression a zero', () => {
  const metrics = calculate('metrics');
  const audits = calculate('auditMetrics');
  assert.equal(metrics.total, 0);
  assert.equal(metrics.avgAppScore ?? metrics.avgAuditScore ?? 0, 0);
  assert.equal(metrics.avgScoreGain, 0);
  assert.equal(audits.avgV1Score, 0);
  assert.equal(audits.avgVLastScore, 0);
  assert.equal(audits.avgProgression, 0);
});
test('AUTO-RAPPORT-02 : score mesure de zero conserve', () => {
  const analyses = [{ score: 0 }];
  const metrics = calculate('metrics', analyses, [{ score: 0, status: 'applied', company: 'Test' }]);
  assert.equal(metrics.avgAppScore, 0);
  assert.equal(metrics.avgAuditScore, 0);
  assert.equal(calculate('auditMetrics', analyses).avgVLastScore, 0);
});
test('AUTO-RAPPORT-03 : progression mesuree depuis zero', () => {
  const analyses = [{ score: 20, evolutionSteps: [{ score: 0 }, { score: 20 }] }];
  assert.equal(calculate('metrics', analyses).avgScoreGain, 20);
  const audits = calculate('auditMetrics', analyses);
  assert.equal(audits.avgV1Score, 0);
  assert.equal(audits.avgVLastScore, 20);
  assert.equal(audits.avgProgression, 20);
});
test('AUTO-RAPPORT-04 : un audit seul ne cree pas de gain fictif', () => {
  const analyses = [{ score: 80 }];
  assert.equal(calculate('metrics', analyses).avgScoreGain, 0);
  const audits = calculate('auditMetrics', analyses);
  assert.equal(audits.avgV1Score, 80);
  assert.equal(audits.avgVLastScore, 80);
  assert.equal(audits.avgProgression, 0);
});
test('AUTO-RAPPORT-05 : baisse reelle du score conservee', () => {
  const analyses = [{ score: 60, evolutionSteps: [{ score: 80 }, { score: 60 }] }];
  assert.equal(calculate('metrics', analyses).avgScoreGain, -20);
  assert.equal(calculate('auditMetrics', analyses).avgProgression, -20);
});
