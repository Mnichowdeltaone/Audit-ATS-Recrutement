import { UserProfile, SavedCv, ApplicationItem, AnalysisHistoryItem } from '../types';

export interface OnboardingStatus {
  isStep1Done: boolean; // Profil Candidat configuré
  isStep2Done: boolean; // CV enregistré en BDD
  isStep3Done: boolean; // Première analyse ATS effectuée
  isStep4Done: boolean; // Assistant CV / Lettre / Optimisation exploré
  isStep5Done: boolean; // Candidature suivie ou démarche planifiée
  allDone: boolean;
  maxUnlockedStep: number; // 0, 1, 2, 3, 4, 5
  stepDetails: {
    step1: { completed: boolean; label: string; count: number };
    step2: { completed: boolean; label: string; count: number };
    step3: { completed: boolean; label: string; count: number };
    step4: { completed: boolean; label: string; count: number };
    step5: { completed: boolean; label: string; count: number };
  };
}

export function isProfileFilled(p: UserProfile | null | undefined): boolean {
  if (!p) return false;
  const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
  const hasRealName = Boolean(fullName && fullName.toLowerCase() !== 'profil 1' && fullName.toLowerCase() !== 'nouveau profil');
  const hasContact = Boolean((p.email && p.email.trim()) || (p.phone && p.phone.trim()) || (p.location && p.location.trim()));
  const hasTitle = Boolean((p.currentTitle && p.currentTitle.trim()) || (p.targetRoles && p.targetRoles.length > 0));
  const hasSkills = Boolean(p.skills && p.skills.length > 0);
  return hasRealName || hasContact || hasTitle || hasSkills;
}

export function calculateOnboardingStatus(params: {
  userProfile: UserProfile | null;
  userProfiles: UserProfile[];
  savedCvs: SavedCv[];
  cvText: string;
  history: AnalysisHistoryItem[];
  analysisResult: unknown | null;
  applications: ApplicationItem[];
  coverLettersCount?: number;
  calendarEventsCount?: number;
}): OnboardingStatus {
  const {
    userProfile,
    userProfiles,
    savedCvs,
    cvText,
    history,
    analysisResult,
    applications,
    coverLettersCount = 0,
    calendarEventsCount = 0,
  } = params;

  // 1. Profil Candidat créé & renseigné
  const validProfilesCount = (userProfiles || []).filter(isProfileFilled).length;
  const isStep1Done = isProfileFilled(userProfile) || validProfilesCount > 0;

  // 2. CV enregistré en BDD locale (vérification stricte de la présence en BDD ou texte réel)
  const realCvsCount = (savedCvs || []).filter((c) => {
    if (!c || !c.rawText) return false;
    const txt = c.rawText.trim();
    return txt.length > 50 && !c.id.startsWith('demo-');
  }).length;
  const hasActiveCvText = Boolean(cvText && cvText.trim().length > 60);
  const isStep2Done = isStep1Done && (realCvsCount > 0 || hasActiveCvText);

  // 3. Première Analyse ATS effectuée
  const realAnalysesCount = (history || []).length;
  const isStep3Done = isStep2Done && (realAnalysesCount > 0 || analysisResult !== null);

  // 4. Outil Assistant CV & Lettres ou Optimisation
  const hasLetter = coverLettersCount > 0 || (history || []).some((h) => Boolean(h.coverLetterContent));
  const hasEvolution = (history || []).some((h) => h.evolutionSteps && h.evolutionSteps.length > 1);
  const hasUsedAssistant = typeof localStorage !== 'undefined' && localStorage.getItem('cv_move_used_assistant') === 'true';
  const isStep4Done = isStep3Done && (hasLetter || hasEvolution || hasUsedAssistant);

  // 5. Suivi des Candidatures ou Agenda
  const realAppsCount = (applications || []).filter((a) => !a.id.startsWith('demo-')).length;
  const isStep5Done = isStep4Done && (realAppsCount > 0 || calendarEventsCount > 0);

  const allDone = isStep1Done && isStep2Done && isStep3Done && isStep4Done && isStep5Done;

  // Calcul de la plus haute étape débloquée (index 0 à 5)
  let maxUnlockedStep = 0;
  if (isStep1Done) maxUnlockedStep = 1;
  if (isStep2Done) maxUnlockedStep = 2;
  if (isStep3Done) maxUnlockedStep = 3;
  if (isStep4Done) maxUnlockedStep = 4;
  if (isStep5Done) maxUnlockedStep = 5;

  return {
    isStep1Done,
    isStep2Done,
    isStep3Done,
    isStep4Done,
    isStep5Done,
    allDone,
    maxUnlockedStep,
    stepDetails: {
      step1: {
        completed: isStep1Done,
        label: isStep1Done ? 'Profil configuré' : 'Aucun profil renseigné',
        count: Math.max(validProfilesCount, isStep1Done ? 1 : 0),
      },
      step2: {
        completed: isStep2Done,
        label: isStep2Done ? `${realCvsCount} CV en base locale` : 'Aucun CV en base',
        count: realCvsCount,
      },
      step3: {
        completed: isStep3Done,
        label: isStep3Done ? `${realAnalysesCount} analyse(s) réalisée(s)` : 'Aucune analyse effectuée',
        count: realAnalysesCount,
      },
      step4: {
        completed: isStep4Done,
        label: isStep4Done ? 'Optimisation/Lettre utilisée' : 'À découvrir',
        count: hasLetter ? 1 : 0,
      },
      step5: {
        completed: isStep5Done,
        label: isStep5Done ? `${realAppsCount} candidature(s) suivie(s)` : 'Aucune candidature',
        count: realAppsCount,
      },
    },
  };
}
