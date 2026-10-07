import { extractOfferMetadata } from './offerMetadataExtractor';
import { extractCompanyDossier } from './companyDossierExtractor';
import type { CompanyFinancialTechnicalDossier } from '../types';

export interface ParsedStrength {
  title: string;
  description: string;
  category?: string;
}

export interface ParsedWeakness {
  title: string;
  description: string;
  missingSkill?: string;
  severity?: 'critical' | 'moderate' | 'minor';
}

export interface ParsedStrategy {
  title: string;
  advice: string;
  keywordSuggestion?: string;
}

export interface ParsedInterviewQuestion {
  id: number;
  question: string;
  tip: string;
  difficulty: 'facile' | 'moyen' | 'difficile';
}

export interface SkillMatch {
  name: string;
  status: 'matched' | 'missing' | 'partial';
  importance: 'haute' | 'moyenne';
}

export interface ParsedAnalysis {
  globalScore: number;
  scoreLabel: string;
  targetCompany: string;
  targetRole: string;
  company: string | null;
  cabinet: string | null;
  isHorodatedOnly: boolean;
  suggestedTitle: string;
  horodatage: string;
  executiveSummary: string;
  strengths: ParsedStrength[];
  weaknesses: ParsedWeakness[];
  strategies: ParsedStrategy[];
  coverLetterHook: string;
  interviewQuestions: ParsedInterviewQuestion[];
  skillsBreakdown: SkillMatch[];
  axisScores: {
    axis: string;
    score: number;
    description: string;
  }[];
  kpis: {
    atsPassProbability: number;
    keywordMatchRate: number;
    recruiterReadTime: string;
    interviewChance: number;
    missingCriticalCount: number;
  };
  companyDossier: CompanyFinancialTechnicalDossier;
}

export function extractScore(text: string | null | undefined): number | null {
  if (!text) return null;
  // Format 1 : XX / 100 ou XX/100 ou XX sur 100
  const scoreMatch = text.match(/(\d{1,3})\s*(?:\/|\s*sur\s*)\s*100/i);
  if (scoreMatch && scoreMatch[1]) {
    const parsed = parseInt(scoreMatch[1], 10);
    return parsed >= 0 && parsed <= 100 ? parsed : null;
  }
  // Format 2 : score de XX % ou **XX%**
  const pctMatch = text.match(/(?:score|note|compatibilité|adéquation)[^0-9\n]{0,25}(\d{1,3})\s*%/i);
  if (pctMatch && pctMatch[1]) {
    const parsed = parseInt(pctMatch[1], 10);
    return parsed >= 0 && parsed <= 100 ? parsed : null;
  }
  return null;
}

export function parseAnalysisResult(
  rawText: string,
  cvText: string = '',
  jobText: string = ''
): ParsedAnalysis {
  // 1. Extraire le score global réaliste
  let extracted = extractScore(rawText);
  let globalScore: number;
  if (extracted !== null) {
    globalScore = extracted;
  } else {
    // Calcul heuristique objectif si aucun score explicite trouvé
    const cvWords = new Set((cvText || '').toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) || []);
    const jobWords = new Set((jobText || '').toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) || []);
    let matchCount = 0;
    jobWords.forEach((w) => {
      if (cvWords.has(w)) matchCount++;
    });
    const ratio = jobWords.size > 0 ? (matchCount / jobWords.size) : 0.5;
    globalScore = Math.max(30, Math.min(88, Math.round(ratio * 100)));
  }

  // Label selon le score
  let scoreLabel = 'Excellente adéquation (Fortes chances de présélection ATS)';
  if (globalScore < 50) {
    scoreLabel = 'Adéquation insuffisante (Risque élevé de rejet ATS)';
  } else if (globalScore < 70) {
    scoreLabel = 'Adéquation modérée (Optimisation des compétences requise)';
  } else if (globalScore < 85) {
    scoreLabel = 'Bonne adéquation (Quelques ajustements recommandés)';
  }

  // 2. Entreprise et rôle scrutés intelligemment
  const offerMeta = extractOfferMetadata(jobText, '', rawText);
  const targetCompany = offerMeta.company || offerMeta.cabinet || 'Entreprise';
  const targetRole = offerMeta.role || 'Poste Ciblé';

  // 3. Découpage des sections du texte
  const sections: { [key: string]: string } = {};
  const sectionRegex = /(?:^|\n)(?:#{1,4}\s*|\d+\.\s*)([^\n:]+):?\n([\s\S]*?)(?=(?:\n#{1,4}\s*|\n\d+\.\s*[^\n:]+:?|\n---|$))/gi;
  let match;
  while ((match = sectionRegex.exec(rawText)) !== null) {
    const heading = match[1].toLowerCase().trim();
    const body = match[2].trim();
    sections[heading] = body;
  }

  // 4. Synthèse globale / Executive Summary
  const firstLines = rawText.split('\n\n').filter((p) => p.trim() && !p.startsWith('#') && !p.startsWith('---'));
  let executiveSummary = firstLines[0] || 'Analyse d’adéquation réalisée avec succès.';
  if (executiveSummary.length < 30 && firstLines[1]) {
    executiveSummary = firstLines[1];
  }

  // 5. Points Forts
  const strengths: ParsedStrength[] = [];
  const strengthBlock =
    Object.keys(sections).find((k) => k.includes('fort') || k.includes('points forts')) || '';
  const rawStrengths = strengthBlock ? sections[strengthBlock] : rawText;

  const itemRegex = /(?:^|\n)(?:[-*•]|\d+\.)\s*(?:\*\*([^*]+)\*\*|([^\n:]+):?)\s*(?:[-:–]\s*)?([^\n]+(?:\n(?!(?:[-*•]|\d+\.))[^\n]+)*)/g;
  let itemMatch;
  if (strengthBlock && sections[strengthBlock]) {
    while ((itemMatch = itemRegex.exec(sections[strengthBlock])) !== null) {
      const title = (itemMatch[1] || itemMatch[2] || 'Point fort').trim();
      const desc = (itemMatch[3] || '').trim();
      if (title && desc) {
        strengths.push({ title, description: desc, category: 'Alignement validé' });
      }
    }
  }

  // Fallbacks si le parsing regex des items n'a rien trouvé
  if (strengths.length === 0) {
    strengths.push(
      {
        title: 'Compétences clés directement alignées',
        description: 'Votre maîtrise technique et opérationnelle couvre les missions principales exigées.',
        category: 'Technique',
      },
      {
        title: 'Expérience et autonomie avérées',
        description: 'Vos réalisations professionnelles passées prouvent votre capacité à être immédiatement opérationnel.',
        category: 'Expérience',
      },
      {
        title: 'Outils et logiciels maîtrisés',
        description: 'La stack d’outils citée dans votre profil correspond aux exigences du poste.',
        category: 'Outils',
      }
    );
  }

  // 6. Points Faibles / Manques
  const weaknesses: ParsedWeakness[] = [];
  const weaknessBlock =
    Object.keys(sections).find((k) => k.includes('faible') || k.includes('manque')) || '';
  if (weaknessBlock && sections[weaknessBlock]) {
    while ((itemMatch = itemRegex.exec(sections[weaknessBlock])) !== null) {
      const title = (itemMatch[1] || itemMatch[2] || 'Point d’amélioration').trim();
      const desc = (itemMatch[3] || '').trim();
      if (title && desc) {
        weaknesses.push({
          title,
          description: desc,
          severity: weaknesses.length === 0 ? 'critical' : 'moderate',
        });
      }
    }
  }

  if (weaknesses.length === 0) {
    weaknesses.push(
      {
        title: 'Mots-clés de l’offre non explicités',
        description: 'Certains termes ou intitulés de progiciels mentionnés dans l’offre doivent être ajoutés sous leur forme exacte.',
        severity: 'critical',
      },
      {
        title: 'Chiffres d’impacts et métriques STAR',
        description: 'Vos réalisations gagneraient à être davantage quantifiées en volume financier, pourcentage ou gain d’efficacité.',
        severity: 'moderate',
      }
    );
  }

  // 7. Stratégie de CV & Mots-clés
  const strategies: ParsedStrategy[] = [];
  const strategyBlock =
    Object.keys(sections).find((k) => k.includes('stratégie') || k.includes('conseil') || k.includes('mot')) || '';
  if (strategyBlock && sections[strategyBlock]) {
    while ((itemMatch = itemRegex.exec(sections[strategyBlock])) !== null) {
      const title = (itemMatch[1] || itemMatch[2] || 'Action recommandée').trim();
      const advice = (itemMatch[3] || '').trim();
      if (title && advice) {
        strategies.push({ title, advice });
      }
    }
  }

  if (strategies.length === 0) {
    strategies.push(
      {
        title: 'Harmonisation du titre de CV',
        advice: 'Adoptez l’intitulé exact de l’offre d’emploi en tête de CV pour garantir un matching ATS immédiat.',
      },
      {
        title: 'Injection des compétences cibles',
        advice: 'Intégrez les logiciels et protocoles cités dans l’annonce dans votre bloc de compétences clés.',
      }
    );
  }

  // 8. Lettre de motivation (Accroche)
  let coverLetterHook =
    '> "Passionné par les enjeux de votre secteur et fort de solides réalisations professionnelles, je souhaite mettre mon expertise au service de vos objectifs."';
  const letterBlock = Object.keys(sections).find((k) => k.includes('lettre'));
  if (letterBlock && sections[letterBlock]) {
    coverLetterHook = sections[letterBlock].replace(/^[>\s*]+/, '').trim();
  }

  // 9. Questions d’entretien
  const interviewQuestions: ParsedInterviewQuestion[] = [];
  const interviewBlock =
    Object.keys(sections).find((k) => k.includes('entretien') || k.includes('question') || k.includes('préparation')) || '';
  const rawInterview = interviewBlock ? sections[interviewBlock] : '';

  if (rawInterview) {
    const qMatches = rawInterview.split(/(?=(?:Question|\d+\.|\*\*Question))/i).filter((s) => s.trim().length > 10);
    qMatches.slice(0, 3).forEach((chunk, idx) => {
      const qTextMatch = chunk.match(/(?:Question\s*:\s*|^\d+\.\s*)["*]*([^\n"?]+[?])/i);
      const tipMatch = chunk.match(/(?:Piste de réponse\s*:|Conseil\s*:|Réponse\s*:)([\s\S]+)/i);

      const question = qTextMatch ? qTextMatch[1].trim() : `Question d'entretien n°${idx + 1}`;
      const tip = tipMatch
        ? tipMatch[1].replace(/^[*\s]+/, '').trim()
        : 'Appuyez-vous sur la méthode STAR (Situation, Tâche, Action, Résultat chiffré) pour structurer votre argumentaire.';

      interviewQuestions.push({
        id: idx + 1,
        question: question.replace(/^["*\s]+|["*\s]+$/g, ''),
        tip,
        difficulty: idx === 0 ? 'moyen' : idx === 1 ? 'difficile' : 'moyen',
      });
    });
  }

  if (interviewQuestions.length === 0) {
    interviewQuestions.push(
      {
        id: 1,
        question: 'Comment priorisez-vous vos missions face à des délais serrés et des urgences imprévues ?',
        tip: 'Donnez un exemple précis avec la méthode STAR en mettant en avant votre communication proactive et votre sang-froid.',
        difficulty: 'moyen',
      },
      {
        id: 2,
        question: 'Parlez-moi d’un défi technique complexe que vous avez surmonté récemment.',
        tip: 'Détaillez la démarche d’analyse, les tests comparatifs effectués et l’impact chiffré sur l’organisation.',
        difficulty: 'difficile',
      },
      {
        id: 3,
        question: 'Quel est votre niveau d’autonomie sur les logiciels spécifiques mentionnés dans notre offre ?',
        tip: 'Valorisez votre rapidité d’apprentissage et citez un progiciel connexe déjà maîtrisé.',
        difficulty: 'moyen',
      }
    );
  }

  // 10. Extraction dynamique des compétences et comparaison
  // Pool généraliste de compétences courantes + extraction depuis l'offre et l'analyse
  const basePool = [
    'Gestion de projet',
    'Agile / Scrum',
    'Management d’équipe',
    'Communication',
    'KPIs & Reporting',
    'Excel / Tableaux croisés',
    'Power BI / Data',
    'Anglais professionnel',
    'Résolution de problèmes',
    'Autonomie & Rigueur',
    'Cash pooling',
    'AGICAP',
    'Kyriba',
    'Pennylane',
    'Excel VBA',
    'SEPA',
    'EBICS TS',
    'Python',
    'Forecast',
    'Rapprochement bancaire',
    'Gestion de trésorerie',
    'Reporting financier',
    'Sage FRP Treasury',
    'Sage X3',
    'Audit financier',
    'Contrôle de gestion',
  ];

  // Extraire les compétences citées dans les points forts et faibles identifiés
  const dynamicFromAnalysis: string[] = [];
  weaknesses.forEach((w) => {
    if (w.title && w.title.length < 35) dynamicFromAnalysis.push(w.title);
  });
  strengths.forEach((s) => {
    if (s.title && s.title.length < 35) dynamicFromAnalysis.push(s.title);
  });

  const fullCv = (cvText + ' ' + rawText).toLowerCase();
  const fullJob = (jobText + ' ' + rawText).toLowerCase();

  const combinedPool = Array.from(new Set([...dynamicFromAnalysis, ...basePool]));
  const skillsBreakdown: SkillMatch[] = [];

  combinedPool.forEach((skill) => {
    const isJobReq = fullJob.includes(skill.toLowerCase());
    const isCvPresent = fullCv.includes(skill.toLowerCase());

    if (isJobReq || isCvPresent) {
      if (isCvPresent && isJobReq) {
        skillsBreakdown.push({ name: skill, status: 'matched', importance: 'haute' });
      } else if (isJobReq && !isCvPresent) {
        skillsBreakdown.push({ name: skill, status: 'missing', importance: 'haute' });
      } else if (isCvPresent && !isJobReq) {
        skillsBreakdown.push({ name: skill, status: 'partial', importance: 'moyenne' });
      }
    }
  });

  // Garantir au moins quelques éléments visuels cohérents
  if (skillsBreakdown.length < 4) {
    skillsBreakdown.push(
      { name: 'Compétences clés du poste', status: 'matched', importance: 'haute' },
      { name: 'Outils et progiciels requis', status: 'matched', importance: 'haute' },
      { name: 'Méthodologie opérationnelle', status: 'matched', importance: 'haute' },
      { name: 'Réalisations chiffrées STAR', status: 'partial', importance: 'moyenne' },
      { name: 'Mots-clés spécifiques ATS', status: 'missing', importance: 'haute' }
    );
  }

  // 11. Multi-Axis Scores (Graphique radar & barres)
  const base = globalScore;
  const axisScores = [
    {
      axis: 'Compétences Techniques & Métier',
      score: Math.min(100, Math.max(50, Math.round(base * 1.04))),
      description: 'Couverture des compétences, outils et savoir-faire clés exigés.',
    },
    {
      axis: 'Mots-Clés & Filtres ATS',
      score: Math.min(100, Math.max(40, Math.round(base * 0.96))),
      description: 'Reconnaissance lexicale par les algorithmes de tri ATS.',
    },
    {
      axis: 'Niveau d’Expérience & Séniorité',
      score: Math.min(100, Math.max(50, Math.round(base * 1.02))),
      description: 'Adéquation des années de pratique et périmètre de responsabilité.',
    },
    {
      axis: 'Réalisations Chiffrées (STAR)',
      score: Math.min(100, Math.max(40, Math.round(base * 0.92))),
      description: 'Présence d’indicateurs d’impact quantifiables (%, M€, délais).',
    },
    {
      axis: 'Cohérence du Titre & En-tête',
      score: Math.min(100, Math.max(50, Math.round(base * 0.98))),
      description: 'Alignement direct entre votre intitulé de profil et l’offre visée.',
    },
  ];

  // 12. KPIs calculés
  const kpis = {
    atsPassProbability: Math.min(99, Math.max(30, Math.round(globalScore * 0.95))),
    keywordMatchRate: Math.min(98, Math.max(40, Math.round(globalScore * 0.92))),
    recruiterReadTime: globalScore >= 80 ? '25 à 30 secondes' : '6 à 10 secondes',
    interviewChance: Math.min(95, Math.max(25, Math.round(globalScore * 0.88))),
    missingCriticalCount: skillsBreakdown.filter((s) => s.status === 'missing').length || 1,
  };

  // 13. Fiche Technique & Financière de l'Entreprise Recruteuse (Préparation Entretien)
  const companyDossier = extractCompanyDossier(
    rawText,
    jobText,
    targetCompany,
    targetRole
  );

  return {
    globalScore,
    scoreLabel,
    targetCompany,
    targetRole,
    company: offerMeta.company,
    cabinet: offerMeta.cabinet,
    isHorodatedOnly: offerMeta.isHorodatedOnly,
    suggestedTitle: offerMeta.suggestedTitle,
    horodatage: offerMeta.horodatage,
    executiveSummary,
    strengths,
    weaknesses,
    strategies,
    coverLetterHook,
    interviewQuestions,
    skillsBreakdown,
    axisScores,
    kpis,
    companyDossier,
  };
}
