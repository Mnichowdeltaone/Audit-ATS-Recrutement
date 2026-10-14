import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  User,
  FileText,
  Target,
  Zap,
  Briefcase,
  Database,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Check,
  ShieldCheck,
  ExternalLink,
  Key,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { OnboardingStatus } from '../utils/onboardingState';
import { SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB } from '../utils/sampleData';

export type OnboardingTab =
  | 'dashboard'
  | 'calendar'
  | 'app'
  | 'tracker'
  | 'reports'
  | 'cv-assistant'
  | 'database'
  | 'history'
  | 'code'
  | 'guide'
  | 'settings';

interface InteractiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: OnboardingTab) => void;
  onLoadSampleData?: (sampleCv: string, sampleJob: string) => void;
  status: OnboardingStatus;
  initialStepIndex?: number;
  onOpenApiKeyTutorial?: () => void;
  apiKey?: string;
  hasServerKey?: boolean;
}

export default function InteractiveTourModal({
  isOpen,
  onClose,
  onNavigateToTab,
  onLoadSampleData,
  status,
  initialStepIndex = 0,
  onOpenApiKeyTutorial,
  apiKey = '',
  hasServerKey = false,
}: InteractiveTourModalProps) {
  const [step, setStep] = useState(initialStepIndex);
  const [lockWarning, setLockWarning] = useState<string | null>(null);

  // Synchroniser l'étape initiale à l'ouverture
  useEffect(() => {
    if (isOpen) {
      if (typeof initialStepIndex === 'number' && initialStepIndex >= 0) {
        setStep(Math.min(initialStepIndex, status.maxUnlockedStep));
      } else {
        setStep(Math.min(status.maxUnlockedStep, 5));
      }
      setLockWarning(null);
    }
  }, [isOpen, initialStepIndex, status.maxUnlockedStep]);

  if (!isOpen) return null;

  // Définition des 6 étapes séquentielles obligatoires
  const tourSteps = [
    {
      id: 0,
      stepNumber: 1,
      title: '1. Création de votre Profil Candidat 👤',
      tag: 'Étape Obligatoire 1/5',
      color: 'from-purple-700 via-indigo-700 to-blue-700',
      icon: User,
      isCompleted: status.isStep1Done,
      canAccessNext: status.isStep1Done,
      statusLabel: status.isStep1Done
        ? '✅ Profil Candidat créé et configuré avec succès !'
        : '⏳ À réaliser : Aucun profil candidat configuré.',
      desc: 'Pour démarrer efficacement, créez votre profil candidat avec vos coordonnées (nom, prénom, email, téléphone), vos métiers visés et vos compétences clés. Vos données restent 100% privées et stockées localement.',
      requirementText: 'Vous devez enregistrer au moins un profil candidat pour débloquer l’étape suivante.',
      primaryActionText: '👉 Configurer mon Profil Candidat',
      onPrimaryAction: () => {
        onClose();
        onNavigateToTab('settings');
      },
      secondaryActionText: undefined,
      onSecondaryAction: undefined,
    },
    {
      id: 1,
      stepNumber: 2,
      title: '2. Ajout ou Création d’un nouveau CV 📄',
      tag: 'Étape Obligatoire 2/5',
      color: 'from-blue-700 via-cyan-700 to-teal-700',
      icon: FileText,
      isCompleted: status.isStep2Done,
      canAccessNext: status.isStep2Done,
      statusLabel: status.isStep2Done
        ? `✅ CV enregistré et présent dans la base de données locale (${status.stepDetails.step2.count} CV trouvé) !`
        : '⏳ À réaliser : Aucun CV enregistré dans votre base de données.',
      desc: 'Vous pouvez soit importer un CV existant (PDF, Word DOCX ou Texte), soit concevoir un nouveau CV depuis une page blanche en 4 questions simples grâce à l’outil dédié « Création CV (Page Blanche) ».',
      requirementText: 'Garantie Base de Données : Tout CV créé par « Création CV (Page Blanche) » est automatiquement sauvegardé et persisté dans votre base locale (Mes CVs) !',
      databaseNotice: '🛡️ Vérification BDD : Les CV créés avec l’outil de création sont immédiatement enregistrés dans votre base locale (Mes CVs) et exploitables pour toutes vos analyses et candidatures.',
      primaryActionText: '✍️ Créer un CV (Page Blanche)',
      onPrimaryAction: () => {
        onClose();
        onNavigateToTab('cv-assistant');
      },
      secondaryActionText: '📁 Importer ou coller un CV existant',
      onSecondaryAction: () => {
        onClose();
        onNavigateToTab('app');
      },
    },
    {
      id: 2,
      stepNumber: 3,
      title: '3. Première Analyse d’Adéquation ATS 🎯',
      tag: 'Étape Obligatoire 3/5',
      color: 'from-emerald-700 via-teal-700 to-cyan-700',
      icon: Target,
      isCompleted: status.isStep3Done,
      canAccessNext: status.isStep3Done,
      statusLabel: status.isStep3Done
        ? `✅ Audit d’adéquation validé (${status.stepDetails.step3.count} analyse enregistrée en historique) !`
        : '⏳ À réaliser : Aucune analyse d’adéquation effectuée.',
      desc: 'Confrontez votre CV au descriptif d’une offre d’emploi ciblée. L’IA analyse la conformité aux filtres ATS (Applicant Tracking Systems), calcule un score précis sur 100, identifie les mots-clés manquants et anticipe 3 questions d’entretien.',
      requirementText: 'Lancez votre première analyse d’adéquation pour débloquer l’étape suivante.',
      primaryActionText: '🎯 Aller à l’Analyseur d’Adéquation',
      onPrimaryAction: () => {
        onClose();
        onNavigateToTab('app');
      },
      secondaryActionText: '🚀 Charger une offre d’exemple (Test 1 clic)',
      onSecondaryAction: () => {
        onLoadSampleData?.(SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB);
        confetti({ particleCount: 40, spread: 60 });
        onClose();
        onNavigateToTab('app');
      },
    },
    {
      id: 3,
      stepNumber: 4,
      title: '4. Assistant CV & Lettre de Motivation ✍️',
      tag: 'Étape Obligatoire 4/5',
      color: 'from-pink-700 via-rose-700 to-red-700',
      icon: Zap,
      isCompleted: status.isStep4Done,
      canAccessNext: status.isStep4Done,
      statusLabel: status.isStep4Done
        ? '✅ Outil d’aide à la rédaction ou lettre générée avec succès !'
        : '⏳ À réaliser : Découvrez l’Assistant CV et le générateur de lettres.',
      desc: 'Découvrez les outils d’aide à la rédaction : générez une lettre de motivation sur-mesure alignée sur les défis de l’entreprise, reformulez vos réalisations clés avec la méthode STAR (Situation, Tâche, Action, Résultat), ou affinez vos tournures.',
      requirementText: 'Ouvrez et testez l’Assistant CV pour débloquer l’étape suivante.',
      primaryActionText: '✍️ Ouvrir l’Assistant CV & Lettres',
      onPrimaryAction: () => {
        try {
          localStorage.setItem('cv_move_used_assistant', 'true');
        } catch {}
        onClose();
        onNavigateToTab('cv-assistant');
      },
      secondaryActionText: undefined,
      onSecondaryAction: undefined,
    },
    {
      id: 4,
      stepNumber: 5,
      title: '5. Suivi des Candidatures & Agenda 💼📅',
      tag: 'Étape Obligatoire 5/5',
      color: 'from-amber-600 via-orange-600 to-red-600',
      icon: Briefcase,
      isCompleted: status.isStep5Done,
      canAccessNext: status.isStep5Done,
      statusLabel: status.isStep5Done
        ? `✅ Démarche(s) suivie(s) (${status.stepDetails.step5.count} candidature / événement actif) !`
        : '⏳ À réaliser : Aucune candidature ou démarche dans votre suivi.',
      desc: 'Pilotez l’ensemble de vos démarches de recherche : organisez vos candidatures dans le tableau Kanban (À postuler, Postulé, Relance, Entretien, Offre) et consultez l’Agenda complet des démarches avec calcul automatique des relances à J+7.',
      requirementText: 'Ajoutez une candidature au Kanban ou planifiez une démarche pour finaliser le guide.',
      primaryActionText: '💼 Ouvrir le Suivi des Candidatures',
      onPrimaryAction: () => {
        onClose();
        onNavigateToTab('tracker');
      },
      secondaryActionText: '📅 Ouvrir l’Agenda des Démarches',
      onSecondaryAction: () => {
        onClose();
        onNavigateToTab('calendar');
      },
    },
    {
      id: 5,
      stepNumber: 6,
      title: 'Félicitations ! Cockpit 100% Opérationnel 🎉',
      tag: 'Validation Finale Réussie',
      color: 'from-emerald-600 via-teal-600 to-indigo-700',
      icon: Sparkles,
      isCompleted: true,
      canAccessNext: true,
      statusLabel: '🏆 Toutes les étapes fondamentales ont été validées avec succès !',
      desc: 'Bravo ! Votre profil est prêt, votre CV est sauvegardé en base de données locale, votre premier audit ATS a été exécuté, vous maîtrisez l’assistant rédactionnel et votre cockpit de suivi est en place. Vous avez toutes les clés en main pour réussir vos candidatures !',
      requirementText: 'Cliquez sur Terminer pour commencer à postuler. Le mode d’emploi reste consultable à tout moment.',
      primaryActionText: '🚀 Terminer et commencer à postuler !',
      onPrimaryAction: () => {
        try {
          localStorage.setItem('cv_move_onboarding_completed', 'true');
        } catch {}
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
        onClose();
        onNavigateToTab('dashboard');
      },
      secondaryActionText: '📖 Consulter le Mode d’emploi complet',
      onSecondaryAction: () => {
        try {
          localStorage.setItem('cv_move_onboarding_completed', 'true');
        } catch {}
        onClose();
        onNavigateToTab('guide');
      },
    },
  ];

  const current = tourSteps[step];
  const IconComp = current.icon;

  const handleAttemptNext = () => {
    // Vérification stricte : impossible de passer à l'étape suivante si l'étape actuelle n'est pas validée !
    if (!current.canAccessNext) {
      setLockWarning(
        `🔒 Action requise : Vous devez obligatoirement valider l'étape ${current.stepNumber} (« ${current.title} ») avant de pouvoir passer à l'étape suivante.`
      );
      return;
    }

    setLockWarning(null);
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      try {
        localStorage.setItem('cv_move_onboarding_completed', 'true');
      } catch {}
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      onClose();
    }
  };

  const handleStepClick = (targetIdx: number) => {
    // Si on veut aller vers une étape supérieure à la plus haute débloquée, bloquer !
    if (targetIdx > status.maxUnlockedStep) {
      const lockedStep = tourSteps[status.maxUnlockedStep];
      setLockWarning(
        `🔒 Étape verrouillée : Veuillez d'abord compléter l'étape ${lockedStep.stepNumber} (« ${lockedStep.title} »).`
      );
      return;
    }
    setLockWarning(null);
    setStep(targetIdx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col animate-scale-up max-h-[92vh]">
        {/* Header coloré */}
        <div className={`p-5 sm:p-6 bg-linear-to-r ${current.color} text-white flex items-start justify-between relative shrink-0`}>
          <div className="space-y-1.5 pr-8">
            <div className="flex items-center gap-2">
              <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-wider text-amber-200 border border-white/20">
                {current.tag}
              </span>
              {current.isCompleted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/80 rounded-full text-[10px] font-bold text-white">
                  <Check className="w-3 h-3" />
                  <span>Validé</span>
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-xl font-black leading-snug">
              {current.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
            title="Fermer le guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="p-5 sm:p-6 space-y-4 text-gray-700 overflow-y-auto">
          {/* Phase Initiale : Guide & Tutoriel Clé API Google Gemini */}
          {onOpenApiKeyTutorial && (
            <div className="p-3.5 bg-linear-to-r from-indigo-50 via-purple-50 to-amber-50/70 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5 shadow-2xs">
                  <Key className="w-4 h-4 text-amber-300" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-indigo-950 block text-xs">
                      Phase Initiale : Clé API Google Gemini
                    </span>
                    <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                      100% Gratuit
                    </span>
                    {apiKey?.trim() ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Clé active</span>
                      </span>
                    ) : hasServerKey ? (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Clé serveur active
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-indigo-900/80 leading-snug">
                    Obtenez votre clé en 2 min sans carte bancaire sur Google AI Studio. Suivez notre tutoriel guidé pas-à-pas !
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenApiKeyTutorial();
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs hover:scale-102"
                title="Ouvrir le tutoriel interactif pour obtenir une clé API gratuite"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Tutoriel Clé API ✨</span>
              </button>
            </div>
          )}

          {/* Badge de statut temps réel de l'étape */}
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
              current.isCompleted
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-2xs'
                : 'bg-amber-50/90 border-amber-200 text-amber-950 shadow-2xs'
            }`}
          >
            {current.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <span className="font-extrabold block text-xs">
                {current.statusLabel}
              </span>
              <p className="text-[11px] leading-relaxed opacity-90">
                {current.requirementText}
              </p>
            </div>
          </div>

          {/* Description de l'étape */}
          <p className="text-xs sm:text-sm leading-relaxed text-gray-700 font-normal">
            {current.desc}
          </p>

          {/* Mention expresse de vérification BDD (demandée par l'utilisateur pour Étape 2) */}
          {'databaseNotice' in current && current.databaseNotice && (
            <div className="p-3 bg-cyan-50/80 border border-cyan-200 rounded-2xl text-[11px] font-semibold text-cyan-950 flex items-start gap-2">
              <Database className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <span>{current.databaseNotice}</span>
            </div>
          )}

          {/* Message d'avertissement de blocage si tentative de saut */}
          {lockWarning && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-xs font-bold text-rose-900 flex items-center gap-2 animate-shake">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{lockWarning}</span>
            </div>
          )}

          {/* Actions contextuelles de l'étape */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            {current.primaryActionText && (
              <button
                type="button"
                onClick={current.onPrimaryAction}
                className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer hover:scale-102"
              >
                <span>{current.primaryActionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {current.secondaryActionText && (
              <button
                type="button"
                onClick={current.onSecondaryAction}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{current.secondaryActionText}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer avec barres d'étape, boutons et état de verrouillage */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          {/* Indicateurs des 6 étapes */}
          <div className="flex items-center gap-1.5">
            {tourSteps.map((s, idx) => {
              const isCurrent = idx === step;
              const isUnlocked = idx <= status.maxUnlockedStep;
              const isStepDone = s.isCompleted;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleStepClick(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'w-7 bg-purple-600'
                      : isStepDone
                      ? 'w-3 bg-emerald-500 hover:bg-emerald-600'
                      : isUnlocked
                      ? 'w-3 bg-amber-400 hover:bg-amber-500'
                      : 'w-2 bg-gray-300 cursor-not-allowed opacity-60'
                  }`}
                  title={
                    isCurrent
                      ? `Étape ${idx + 1} en cours`
                      : isStepDone
                      ? `Étape ${idx + 1} validée ✅`
                      : isUnlocked
                      ? `Étape ${idx + 1} débloquée ⏳`
                      : `Étape ${idx + 1} verrouillée 🔒`
                  }
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLockWarning(null);
                  setStep(step - 1);
                }}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
              >
                Précédent
              </button>
            )}

            {/* Bouton Suivant avec verrouillage conditionnel */}
            <button
              type="button"
              onClick={handleAttemptNext}
              disabled={!current.canAccessNext}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                current.canAccessNext
                  ? 'bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white hover:scale-102'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
              }`}
              title={
                current.canAccessNext
                  ? "Passer à l'étape suivante"
                  : "Étape suivante verrouillée : Complétez d'abord l'action de cette étape"
              }
            >
              {!current.canAccessNext && <Lock className="w-3.5 h-3.5 text-gray-400" />}
              <span>{step === tourSteps.length - 1 ? 'Terminer ! 🎉' : 'Suivant'}</span>
              {current.canAccessNext && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
