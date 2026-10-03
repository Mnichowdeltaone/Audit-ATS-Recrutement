import { EvolutionStep, EvolutionStepType } from '../types';

export interface CvDiffSummary {
  addedKeywords: string[];
  linesAddedCount: number;
  linesRemovedCount: number;
  lengthDifference: number; // in characters
  titleChanged: boolean;
  newTitle?: string;
  addedLines: string[];
}

export function detectCvChanges(
  oldCv: string,
  newCv: string,
  targetKeywords: string[] = []
): CvDiffSummary {
  if (!oldCv || !newCv) {
    return {
      addedKeywords: [],
      linesAddedCount: 0,
      linesRemovedCount: 0,
      lengthDifference: (newCv?.length || 0) - (oldCv?.length || 0),
      titleChanged: false,
      addedLines: [],
    };
  }

  const oldLines = oldCv.split('\n').map((l) => l.trim()).filter(Boolean);
  const newLines = newCv.split('\n').map((l) => l.trim()).filter(Boolean);

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const addedLines = newLines.filter((l) => !oldSet.has(l) && l.length > 15);
  const removedLines = oldLines.filter((l) => !newSet.has(l));

  // Pool de mots-clés de base
  const basePool = [
    'AGICAP',
    'Kyriba',
    'Pennylane',
    'Cash pooling',
    'EBICS',
    'EBICS TS',
    'SEPA',
    'Excel VBA',
    'Python',
    'Power BI',
    'STAR',
    'KPIs',
    'Dashboard',
    'Agile',
    'Scrum',
    'Management',
    'Reporting',
  ];

  const combinedPool = Array.from(new Set([...targetKeywords, ...basePool]));

  const lowerOld = oldCv.toLowerCase();
  const lowerNew = newCv.toLowerCase();

  const addedKeywords = combinedPool.filter(
    (kw) => kw && kw.length > 2 && lowerNew.includes(kw.toLowerCase()) && !lowerOld.includes(kw.toLowerCase())
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
    addedLines: addedLines.slice(0, 6),
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
