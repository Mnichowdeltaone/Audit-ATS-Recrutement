import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  FileText,
  Target,
  Zap,
  Briefcase,
  X,
  Key,
} from 'lucide-react';
import { OnboardingStatus } from '../utils/onboardingState';

interface OnboardingCompanionProps {
  status: OnboardingStatus;
  currentStepIndex: number;
  onOpenTour: (stepToOpen?: number) => void;
  onNavigateToTab: (tab: 'dashboard' | 'calendar' | 'app' | 'tracker' | 'reports' | 'cv-assistant' | 'database' | 'history' | 'code' | 'guide' | 'settings') => void;
  onDismiss?: () => void;
  onOpenApiKeyTutorial?: () => void;
}

const STEP_INFO = [
  {
    stepNum: 1,
    title: 'Créer mon Profil Candidat',
    tab: 'settings' as const,
    icon: User,
    pendingHint: 'Renseignez vos coordonnées ou compétences dans l’onglet Profil et sauvegardez.',
    doneHint: 'Profil candidat configuré avec succès !',
  },
  {
    stepNum: 2,
    title: 'Ajouter ou Créer un CV (en BDD)',
    tab: 'cv-assistant' as const,
    icon: FileText,
    pendingHint: 'Créez un CV via « Création CV (Page Blanche) » ou importez un fichier CV.',
    doneHint: 'CV enregistré et présent dans votre base locale !',
  },
  {
    stepNum: 3,
    title: 'Première Analyse d’Adéquation ATS',
    tab: 'app' as const,
    icon: Target,
    pendingHint: 'Analysez votre CV face à une offre d’emploi pour obtenir votre score ATS.',
    doneHint: 'Audit ATS réalisé avec succès !',
  },
  {
    stepNum: 4,
    title: 'Assistant CV & Lettre de Motivation',
    tab: 'cv-assistant' as const,
    icon: Zap,
    pendingHint: 'Découvrez les reformulations STAR ou générez une lettre de motivation ciblée.',
    doneHint: 'Outil d’aide à la rédaction exploré !',
  },
  {
    stepNum: 5,
    title: 'Suivi des Candidatures & Agenda',
    tab: 'tracker' as const,
    icon: Briefcase,
    pendingHint: 'Ajoutez une candidature au Kanban ou planifiez une démarche dans l’Agenda.',
    doneHint: 'Tableau de pilotage & démarches en place !',
  },
];

export default function OnboardingCompanion({
  status,
  currentStepIndex,
  onOpenTour,
  onNavigateToTab,
  onDismiss,
  onOpenApiKeyTutorial,
}: OnboardingCompanionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Déterminer l'étape active du parcours
  const activeStepIdx = Math.min(status.maxUnlockedStep, 4);
  const activeStep = STEP_INFO[activeStepIdx];
  const isCurrentStepDone =
    activeStepIdx === 0
      ? status.isStep1Done
      : activeStepIdx === 1
      ? status.isStep2Done
      : activeStepIdx === 2
      ? status.isStep3Done
      : activeStepIdx === 3
      ? status.isStep4Done
      : status.isStep5Done;

  const IconComp = activeStep?.icon || Compass;

  return (
    <aside aria-label="Mode d'emploi interactif" className="fixed bottom-4 right-4 z-40 max-w-sm w-full sm:w-96 select-none animate-slide-up">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-purple-300 shadow-2xl overflow-hidden transition-all duration-300">
        {/* Header coloré */}
        <div className="bg-linear-to-r from-purple-700 via-indigo-600 to-blue-600 p-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Compass className="w-4 h-4 text-amber-300 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200 block">
                Mode d&apos;Emploi Interactif
              </span>
              <h4 className="text-xs font-black leading-tight flex items-center gap-1.5">
                <span>Étape {activeStepIdx + 1}/5 : {activeStep.title}</span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition-colors cursor-pointer"
              title={isCollapsed ? 'Déplier' : 'Réduire'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Masquer le compagnon"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Corps si non replié */}
        {!isCollapsed && (
          <div className="p-3.5 space-y-3 text-xs bg-slate-50/70">
            {/* Statut de l'étape */}
            {isCurrentStepDone ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-2 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-[11px] text-emerald-950">
                    ✨ Étape {activeStepIdx + 1} validée avec succès !
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    {activeStep.doneHint}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 flex items-start gap-2 shadow-2xs">
                <IconComp className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-[11px] text-amber-950">
                    ⏳ Action requise pour débloquer la suite :
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    {activeStep.pendingHint}
                  </p>
                </div>
              </div>
            )}

            {/* Jauge des 5 étapes */}
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                <span>Progression : {status.maxUnlockedStep}/5 étapes</span>
                <span className="text-purple-700 font-extrabold">{Math.round((status.maxUnlockedStep / 5) * 100)}%</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((num, idx) => {
                  const isDone =
                    idx === 0
                      ? status.isStep1Done
                      : idx === 1
                      ? status.isStep2Done
                      : idx === 2
                      ? status.isStep3Done
                      : idx === 3
                      ? status.isStep4Done
                      : status.isStep5Done;
                  const isCurrent = idx === activeStepIdx;
                  return (
                    <div
                      key={num}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isDone
                          ? 'bg-emerald-500'
                          : isCurrent
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-slate-200'
                      }`}
                      title={`Étape ${num}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Raccourci Tutoriel Clé API dans la phase initiale */}
            {onOpenApiKeyTutorial && (
              <button
                type="button"
                onClick={onOpenApiKeyTutorial}
                className="w-full py-1.5 px-2.5 bg-linear-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-900 border border-indigo-200/80 rounded-xl text-[10px] font-bold flex items-center justify-between transition-colors cursor-pointer"
                title="Tutoriel guidé : Obtenir gratuitement une clé API Gemini sans carte bancaire"
              >
                <div className="flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-indigo-600" />
                  <span>Phase initiale : Tutoriel Clé API</span>
                </div>
                <span className="text-[9px] font-extrabold bg-amber-200/70 text-amber-950 px-1.5 py-0.2 rounded-full">
                  Gratuit ✨
                </span>
              </button>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => onOpenTour(activeStepIdx)}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Ouvrir le mode d'emploi détaillé"
              >
                <Compass className="w-3.5 h-3.5 text-purple-700" />
                <span>Guide complet</span>
              </button>

              {isCurrentStepDone ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeStepIdx < 4) {
                      onOpenTour(activeStepIdx + 1);
                    } else {
                      onOpenTour(5); // Étape finale
                    }
                  }}
                  className="px-3 py-1.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 hover:scale-102"
                >
                  <span>Étape suivante</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateToTab(activeStep.tab)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 hover:scale-102"
                >
                  <span>Aller à l&apos;action 👉</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
