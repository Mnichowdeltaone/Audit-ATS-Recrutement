import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Play,
  User,
  FileText,
  Briefcase,
  Target,
  Award,
  Zap,
  Sliders,
  Check,
  Compass,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB } from '../utils/sampleData';

interface InteractiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: 'app' | 'tracker' | 'cv-assistant' | 'database' | 'history' | 'code' | 'guide' | 'settings') => void;
  onLoadSampleData?: (sampleCv: string, sampleJob: string) => void;
}

export default function InteractiveTourModal({
  isOpen,
  onClose,
  onNavigateToTab,
  onLoadSampleData,
}: InteractiveTourModalProps) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: 'Bienvenue dans votre cockpit Recrutement ! 👋',
      tag: 'Découverte Express',
      color: 'from-purple-600 via-indigo-600 to-blue-600',
      icon: Sparkles,
      desc: 'Votre application tout-en-un pour optimiser vos CVs, maximiser votre score de passage ATS, générer des lettres percutantes et piloter vos candidatures avec style.',
      highlight: 'Découvrez en 5 étapes rapides les fonctionnalités magiques qui font la différence.',
      actionText: '🚀 Charger la démo en 1 clic',
      onAction: () => {
        onLoadSampleData?.(SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB);
        confetti({ particleCount: 50, spread: 70 });
        onClose();
        onNavigateToTab('app');
      },
    },
    {
      title: '1. Multi-Profils & Remplissage Instantané 👤',
      tag: 'Gain de temps énorme',
      color: 'from-indigo-600 to-blue-600',
      icon: User,
      desc: 'Vous pouvez créer plusieurs profils pour cibler différents métiers. Le bouton « ⚡ Remplir le profil avec ce CV » lit votre document et met à jour instantanément toutes vos coordonnées et compétences !',
      highlight: 'Plus jamais de ressaisie manuelle de vos coordonnées ou de vos logiciels.',
      actionText: 'Accéder aux Profils Candidat',
      onAction: () => {
        onClose();
        onNavigateToTab('settings');
      },
    },
    {
      title: '2. Audit d’Adéquation & Filtres ATS 🎯',
      tag: 'Le cœur de l’IA',
      color: 'from-emerald-600 to-teal-600',
      icon: Target,
      desc: 'Déposez votre CV et le descriptif d’une offre. L’IA génère un score sur 100, liste vos points forts, identifie les mots-clés manquants et anticipe 3 questions d’entretien.',
      highlight: 'Visez un score supérieur à 70/100 pour passer les filtres recruteurs.',
      actionText: 'Aller à l’Analyseur de CV',
      onAction: () => {
        onClose();
        onNavigateToTab('app');
      },
    },
    {
      title: '3. Générateur Assisté CV & Lettre ✍️',
      tag: 'Sur-mesure en 30s',
      color: 'from-pink-600 to-rose-600',
      icon: FileText,
      desc: 'Rédigez des lettres de motivation ciblées et percutantes adaptées aux défis de l’entreprise, et reformulez vos réalisations clés avec la méthode STAR.',
      highlight: 'Fini l’angoisse de la page blanche avec des propositions concrètes et adaptées.',
      actionText: 'Ouvrir le Générateur',
      onAction: () => {
        onClose();
        onNavigateToTab('cv-assistant');
      },
    },
    {
      title: '4. Suivi des Candidatures & Kanban 💼',
      tag: 'Zéro oubli de relance',
      color: 'from-amber-500 to-orange-600',
      icon: Briefcase,
      desc: 'Organisez vos démarches en colonnes Kanban fluides. Les dates de relances automatiques à J+7 vous évitent de laisser passer de belles opportunités.',
      highlight: 'Toutes vos données restent 100% privées et sauvegardées localement.',
      actionText: 'Voir le Tableau Kanban',
      onAction: () => {
        onClose();
        onNavigateToTab('tracker');
      },
    },
  ];

  const handleNext = () => {
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const current = tourSteps[step];
  const IconComp = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-scale-up">
        {/* Header coloré */}
        <div className={`p-6 bg-linear-to-r ${current.color} text-white flex items-start justify-between relative`}>
          <div className="space-y-1.5 pr-8">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
              {current.tag} • Étape {step + 1}/{tourSteps.length}
            </span>
            <h3 className="text-lg sm:text-xl font-black leading-snug">
              {current.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-5 text-gray-700">
          <p className="text-xs sm:text-sm leading-relaxed font-normal">
            {current.desc}
          </p>

          <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl text-xs font-semibold text-purple-900 flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{current.highlight}</span>
          </div>

          {/* Action contextuelle optionnelle */}
          {current.actionText && current.onAction && (
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={current.onAction}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:scale-102"
              >
                <span>{current.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer avec barres d'étape et boutons de navigation */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {tourSteps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === step ? 'w-7 bg-purple-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                title={`Aller à l'étape ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
              >
                Précédent
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
            >
              <span>{step === tourSteps.length - 1 ? 'C’est parti ! 🎉' : 'Suivant'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
