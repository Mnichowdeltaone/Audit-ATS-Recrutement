import { EvolutionStep, EvolutionStepType } from '../types';

export interface CvDiffSummary {
  addedKeywords: string[];
  linesAddedCount: number;
  linesRemovedCount: number;
  lengthDifference: number; // in characters
  titleChanged: boolean;
  newTitle?: string;
}

export function detectCvChanges(oldCv: string, newCv: string): CvDiffSummary {
  if (!oldCv || !newCv) {
    return {
      addedKeywords: [],
      linesAddedCount: 0,
      linesRemovedCount: 0,
      lengthDifference: (newCv?.length || 0) - (oldCv?.length || 0),
      titleChanged: false,
    };
  }

  const oldLines = oldCv.split('\n').map((l) => l.trim()).filter(Boolean);
  const newLines = newCv.split('\n').map((l) => l.trim()).filter(Boolean);

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const addedLines = newLines.filter((l) => !oldSet.has(l));
  const removedLines = oldLines.filter((l) => !newSet.has(l));

  // Outils et mots-clés courants
  const keywordsPool = [
    'AGICAP',
    'Kyriba',
    'Pennylane',
    'Cash pooling',
    'EBICS',
    'EBICS TS',
    'EBICS T',
    'SEPA',
    'Excel VBA',
    'VBA',
    'Python',
    'Forecast 13 semaines',
    'Lettrage bancaire',
    'Rapprochement bancaire',
    'Gestion de trésorerie',
    'Power BI',
    'Sage FRP Treasury',
    'Sage X3',
    'SAP',
    'STAR',
    'KPIs',
    'Dashboard',
  ];

  const lowerOld = oldCv.toLowerCase();
  const lowerNew = newCv.toLowerCase();

  const addedKeywords = keywordsPool.filter(
    (kw) => lowerNew.includes(kw.toLowerCase()) && !lowerOld.includes(kw.toLowerCase())
  );

  // Vérifier si la première ligne non-vide (souvent titre ou contact) a changé
  const oldTitleLine = oldLines.find((l) => l.length > 5 && !l.includes('@')) || '';
  const newTitleLine = newLines.find((l) => l.length > 5 && !l.includes('@')) || '';
  const titleChanged = oldTitleLine !== newTitleLine && newTitleLine.length > 0;

  return {
    addedKeywords,
    linesAddedCount: addedLines.length,
    linesRemovedCount: removedLines.length,
    lengthDifference: newCv.length - oldCv.length,
    titleChanged,
    newTitle: titleChanged ? newTitleLine : undefined,
  };
}

export function buildEvolutionStep(params: {
  version: number;
  type: EvolutionStepType;
  title: string;
  cvText: string;
  score: number | null;
  previousScore?: number | null;
  analysisResult?: string;
  customChanges?: string[];
  summaryNote?: string;
}): EvolutionStep {
  const scoreDelta =
    params.score !== null && params.previousScore !== null && params.previousScore !== undefined
      ? params.score - params.previousScore
      : undefined;

  let changesApplied = params.customChanges || [];
  if (changesApplied.length === 0) {
    if (params.type === 'initial_analysis') {
      changesApplied = ['Audit initial de conformité ATS', 'Détection des compétences et mots-clés'];
    } else if (params.type === 'recommendations_applied') {
      changesApplied = ['Intégration des mots-clés recommandés', 'Optimisation de la structure'];
    } else if (params.type === 're_analysis') {
      changesApplied = ['Nouvelle analyse avec prise en compte des ajustements'];
    }
  }

  return {
    id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    version: params.version,
    type: params.type,
    title: params.title,
    timestamp: new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    score: params.score,
    scoreDelta,
    cvText: params.cvText,
    analysisResult: params.analysisResult,
    changesApplied,
    summaryNote: params.summaryNote,
  };
}
