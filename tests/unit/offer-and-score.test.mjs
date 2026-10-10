import test from 'node:test';
import assert from 'node:assert/strict';
import { extractOfferMetadata } from '../../src/utils/offerMetadataExtractor.ts';
import { extractScore, parseAnalysisResult } from '../../src/utils/analysisParser.ts';

test('AUTO-ATS-01 : lire les formats de score usuels', () => {
  for (const [input, score] of [['Score ATS : 82/100', 82], ['Note : 72 sur 100', 72], ['Compatibilit\u00e9 : 91 %', 91], ['Score : 0/100', 0], ['100/100', 100]]) assert.equal(extractScore(input), score);
});
test('AUTO-ATS-02 : refuser un score absent ou superieur a 100', () => {
  for (const input of [null, undefined, '', 'Aucun score', 'Score : 150/100', 'Score : 120 %']) assert.equal(extractScore(input), null);
});
test('AUTO-OFFRE-01 : offre vide avec titre horodate', () => {
  const result = extractOfferMetadata();
  assert.equal(result.company, null);
  assert.equal(result.role, null);
  assert.equal(result.isHorodatedOnly, true);
  assert.equal(result.confidenceScore, 0);
  assert.match(result.suggestedTitle, /^Analyse du /);
});
test('AUTO-OFFRE-02 : entreprise et poste explicitement indiques', () => {
  const result = extractOfferMetadata('Entreprise : Atelier Test\nPoste : Responsable finance (H/F)');
  assert.equal(result.company, 'Atelier Test');
  assert.equal(result.role, 'Responsable finance');
  assert.equal(result.isHorodatedOnly, false);
});
test('AUTO-OFFRE-03 : cabinet et client confidentiel', () => {
  const result = extractOfferMetadata('Michael Page recrute pour un client confidentiel.\nPoste : Responsable finance');
  assert.equal(result.cabinet, 'Michael Page');
  assert.equal(result.isConfidentiel, true);
  assert.equal(result.company, 'Client Confidentiel');
});
test('AUTO-OFFRE-04 : entreprise issue du lien WTTJ', () => {
  const result = extractOfferMetadata('', 'https://www.welcometothejungle.com/fr/companies/atelier-test/jobs/developpeur');
  assert.equal(result.company, 'Atelier test');
});
test('AUTO-OFFRE-05 : URL invalide et longueur maximale du titre', () => {
  assert.doesNotThrow(() => extractOfferMetadata('Texte quelconque', 'https://['));
  const result = extractOfferMetadata(`Entreprise : ${'A'.repeat(120)}\nPoste : Responsable finance`);
  assert.ok(result.suggestedTitle.length <= 80);
});
test('AUTO-ATS-03 : parser une analyse incomplete avec un score explicite', () => {
  const result = parseAnalysisResult('Score ATS : 82/100', 'Developpeur Python', 'Entreprise : Atelier Test\nPoste : Developpeur');
  assert.equal(result.globalScore, 82);
  assert.ok(Array.isArray(result.strengths));
  assert.ok(Array.isArray(result.weaknesses));
  assert.ok(result.companyDossier);
});
