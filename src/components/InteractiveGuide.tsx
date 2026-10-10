import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Zap,
  User,
  FileText,
  Briefcase,
  Layers,
  ArrowRight,
  Lightbulb,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Target,
  Trophy,
  Play,
  RotateCcw,
  Star,
  Flame,
  Award,
  Compass,
  Check,
  Search,
  Sliders,
  Send,
  HelpCircle as QuestionIcon,
  Smile,
  PartyPopper,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB } from '../utils/sampleData';

interface InteractiveGuideProps {
  onNavigateToTab: (tab: 'app' | 'tracker' | 'cv-assistant' | 'database' | 'history' | 'code' | 'guide' | 'settings') => void;
  onLoadSampleData?: (sampleCv: string, sampleJob: string) => void;
  userProfilesCount?: number;
  onOpenTour?: () => void;
}

// Questions du Mini-Quiz Recruteur
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "⏱️ Combien de temps passe un recruteur humain sur un CV lors de son tout premier tri ?",
    options: [
      { text: "6 à 10 secondes", correct: true, feedback: "Exact ! Le recruteur balaye en quelques secondes votre titre, vos 3 dernières expériences et vos outils clés." },
      { text: "Environ 2 minutes", correct: false, feedback: "Trop long ! Devant des centaines de CVs, le premier balayage ne dure que 6 à 10 secondes." },
      { text: "Plus de 5 minutes", correct: false, feedback: "Non, une lecture attentive n'intervient que pour les quelques dossiers retenus après le premier filtre." },
    ],
  },
  {
    id: 2,
    question: "🤖 Pourquoi les robots ATS (Applicant Tracking Systems) rejettent-ils souvent les CVs complexes ?",
    options: [
      { text: "Ils ne reconnaissent pas les polices avec empattement", correct: false, feedback: "Les polices sont généralement lues sans souci." },
      { text: "Les colonnes multiples et tableaux invisibles déstructurent l'ordre de lecture des robots", correct: true, feedback: "Bravissimo ! Deux colonnes peuvent mélanger vos dates avec les compétences de la colonne d'en face." },
      { text: "Les robots ATS n'aiment que les fichiers texte .txt", correct: false, feedback: "Les ATS lisent très bien les PDF et Word, à condition que le texte soit linéaire et propre." },
    ],
  },
  {
    id: 3,
    question: "📅 Quand est le meilleur moment pour relancer une candidature sans réponse ?",
    options: [
      { text: "Dès le lendemain matin à 8h", correct: false, feedback: "Trop tôt ! Vous risquez de paraître impatient ou inopportun." },
      { text: "À J+7 ou J+10, idéalement le mardi ou jeudi matin", correct: true, feedback: "Parfait ! Ce délai laisse le temps à l'équipe RH de traiter le flux, tout en démontrant une motivation proactive et courtoise." },
      { text: "Il ne faut jamais relancer", correct: false, feedback: "Faux ! Plus de 35% des entretiens sont décrochés suite à une relance bien formulée." },
    ],
  },
];

export default function InteractiveGuide({
  onNavigateToTab,
  onLoadSampleData,
  userProfilesCount = 1,
  onOpenTour,
}: InteractiveGuideProps) {
  const [activeStep, setActiveStep] = useState<number>(0);

  // Checklist interactive avec persistance locale
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('cv_move_interactive_checklist');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
    };
  });

  // Astuces par catégorie
  const [activeTipCategory, setActiveTipCategory] = useState<'ats' | 'recruteur' | 'lettre' | 'relance'>('ats');

  // Mini-Quiz Interactif
  const [quizAnswers, setQuizAnswers] = useState<{ [questionId: number]: number | null }>({
    1: null,
    2: null,
    3: null,
  });

  // Simulateur ATS interactif en direct
  const [simJob, setSimJob] = useState('Trésorier Opérationnel & SI');
  const [simSelectedKeywords, setSimSelectedKeywords] = useState<string[]>([
    'Cash pooling',
    'AGICAP',
    'Excel VBA',
    'SEPA',
  ]);
  const availableKeywords = [
    'Cash pooling',
    'AGICAP',
    'Excel VBA',
    'SEPA',
    'EBICS T/TS',
    'Kyriba',
    'Pennylane',
    'Python',
    'Forecast 13 semaines',
    'Lettrage bancaire',
    'Power BI',
    'Sage FRP Treasury',
  ];

  // Calcul du score du simulateur
  const simScore = Math.min(100, Math.round((simSelectedKeywords.length / 6) * 100));

  // Sauvegarder la checklist
  useEffect(() => {
    try {
      localStorage.setItem('cv_move_interactive_checklist', JSON.stringify(checklist));
    } catch {}
  }, [checklist]);

  // Écouteur global pour la réinitialisation de la BDD
  useEffect(() => {
    const handleReset = () => {
      setChecklist({
        step1: false,
        step2: false,
        step3: false,
        step4: false,
        step5: false,
      });
      setQuizAnswers({ 1: null, 2: null, 3: null });
      localStorage.removeItem('cv_move_interactive_checklist');
    };
    window.addEventListener('cv_move_database_reset', handleReset);
    return () => window.removeEventListener('cv_move_database_reset', handleReset);
  }, []);

  const toggleChecklistItem = (key: string) => {
    const nextVal = !checklist[key];
    const updated = { ...checklist, [key]: nextVal };
    setChecklist(updated);

    if (nextVal) {
      const totalChecked = Object.values(updated).filter(Boolean).length;
      if (totalChecked === 5) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      } else {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      }
    }
  };

  const handleSelectQuizOption = (qId: number, optionIdx: number) => {
    setQuizAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
    const question = QUIZ_QUESTIONS.find((q) => q.id === qId);
    if (question && question.options[optionIdx]?.correct) {
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
    }
  };

  const toggleSimKeyword = (kw: string) => {
    if (simSelectedKeywords.includes(kw)) {
      setSimSelectedKeywords(simSelectedKeywords.filter((k) => k !== kw));
    } else {
      setSimSelectedKeywords([...simSelectedKeywords, kw]);
    }
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 5) * 100);

  // Étapes interactives du guide
  const steps = [
    {
      id: 0,
      title: '1. Profils Candidats & Remplissage Instantané',
      badge: 'Multi-Profils 👤',
      color: 'from-purple-600 to-indigo-600',
      icon: User,
      summary: 'Gérez plusieurs profils ciblés et remplissez-les automatiquement avec votre CV.',
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Vous ciblez des postes différents (ex: <em>Trésorier Opérationnel</em> et <em>Consultant SI Trésorerie</em>) ? L&apos;application vous permet de créer autant de profils que vous le souhaitez !
          </p>
          <div className="p-4 bg-linear-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl space-y-2">
            <h4 className="font-bold text-purple-950 flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin-slow" />
              <span>La fonction magique : « ⚡ Remplir le profil avec ce CV »</span>
            </h4>
            <p className="text-gray-700">
              Dès que vous avez un CV ouvert dans l&apos;analyseur, cliquez sur <strong>« ⚡ Remplir le profil avec ce CV »</strong> :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
                <span className="font-bold text-purple-900 block mb-0.5">📇 Coordonnées</span>
                <span className="text-[11px] text-gray-600">Nom, Prénom, Email, Téléphone et Ville extraits net.</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
                <span className="font-bold text-purple-900 block mb-0.5">🎯 Titre & Synthèse</span>
                <span className="text-[11px] text-gray-600">Titre pro actuel et bio percutante de 3 lignes.</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-purple-100 shadow-2xs">
                <span className="font-bold text-purple-900 block mb-0.5">🏷️ Compétences</span>
                <span className="text-[11px] text-gray-600">Outils clés (ERP, TMS) et savoir-faire catégorisés.</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigateToTab('settings')}
              className="px-3.5 py-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-102"
            >
              <span>Accéder à mes Profils</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      title: '2. Déposer votre CV (PDF, DOCX ou Texte)',
      badge: 'Import Simple 📄',
      color: 'from-rose-500 to-red-600',
      icon: FileText,
      summary: 'Glissez votre document ou collez votre texte en un clin d’œil.',
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            L&apos;application accepte les fichiers <strong>PDF, DOCX (Word) et TXT</strong> jusqu&apos;à 15 Mo. Le texte est extrait proprement directement sur votre machine sans passer par des serveurs tiers indiscrets.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl">
              <div className="font-bold text-rose-950 mb-1 flex items-center gap-1.5">
                <span>📁 Glisser-déposer en 1 clic</span>
              </div>
              <p className="text-[11px] text-gray-600">
                Glissez votre document dans le cadre d&apos;upload en haut de l&apos;analyseur : il est extrait instantanément.
              </p>
            </div>
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl">
              <div className="font-bold text-rose-950 mb-1 flex items-center gap-1.5">
                <span>✍️ Copier-coller libre</span>
              </div>
              <p className="text-[11px] text-gray-600">
                Vous pouvez éditer ou affiner directement le texte dans la zone de saisie pour tester différentes variantes.
              </p>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-emerald-950 font-medium flex items-center gap-2">
              <span className="text-base">🚀</span>
              <span><strong>Envie d&apos;essayer tout de suite ?</strong> Chargez le CV exemple de Trésorier !</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onLoadSampleData?.(SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB);
                confetti({ particleCount: 40, spread: 60 });
                onNavigateToTab('app');
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-all hover:scale-102"
            >
              Tester l&apos;exemple complet
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: '3. Récupérer l\'Offre d\'Emploi Ciblée',
      badge: 'Offre Web & Copier 🎯',
      color: 'from-blue-600 to-cyan-600',
      icon: Briefcase,
      summary: 'Importez via lien web (Indeed, WTTJ, etc.) ou collez le descriptif.',
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Vous avez trouvé une offre qui vous plaît sur le web ? Deux solutions ultra rapides s&apos;offrent à vous :
          </p>
          <div className="space-y-2.5">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
              <span className="font-bold text-blue-950 flex items-center gap-1.5">
                <span>🌐 Option 1 : Par lien URL direct</span>
              </span>
              <p className="text-[11px] text-gray-600">
                Collez l&apos;adresse de l&apos;offre et cliquez sur <em>« Extraire l&apos;Offre »</em>. L&apos;application récupère automatiquement les missions et compétences clés.
              </p>
            </div>
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <span>📋 Option 2 : En 2 secondes avec le bouton Presse-Papier</span>
              </span>
              <p className="text-[11px] text-gray-600">
                Sur LinkedIn ou Indeed, copiez simplement le texte de l&apos;annonce (Ctrl+C), puis cliquez sur <strong>« 📋 Coller presse-papier »</strong> au-dessus de la Zone 2 !
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: '4. Lancer l\'Audit d\'Adéquation ATS',
      badge: 'Intelligence IA 🧠',
      color: 'from-emerald-600 to-teal-600',
      icon: Target,
      summary: 'Obtenez un score sur 100, les mots-clés manquants et les questions d’entretien.',
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Cliquez sur le grand bouton <strong>« 🔍 Analyser la compatibilité »</strong>. L&apos;IA passe votre candidature au scanner d&apos;un recruteur expert :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                <span>Score sur 100</span>
              </div>
              <p className="text-[11px] text-gray-600">
                Alignement précis avec les exigences du poste et filtres ATS.
              </p>
            </div>
            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl space-y-1">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-purple-600" />
                <span>Points Forts & Manques</span>
              </div>
              <p className="text-[11px] text-gray-600">
                Mots-clés valorisés et compétences à ajouter impérativement.
              </p>
            </div>
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                <span>Questions d&apos;Entretien</span>
              </div>
              <p className="text-[11px] text-gray-600">
                3 questions pièges anticipées avec arguments de réponse conseillés.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: '5. Suivre dans le Tracker & Rédiger vos Lettres',
      badge: 'Organisation Pro 💼',
      color: 'from-amber-500 to-orange-600',
      icon: Award,
      summary: 'Générez des lettres ultra-personnalisées et pilotez votre Kanban de relances.',
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Ne perdez plus jamais le fil de vos démarches d&apos;embauche grâce aux deux outils complémentaires :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Générateur CV & Lettre</span>
              </div>
              <p className="text-[11px] text-gray-600">
                Rédigez en un clic une lettre de motivation sur-mesure ou adaptez vos réalisations selon la méthode STAR.
              </p>
            </div>
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl space-y-1">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>Tableau Kanban & Relances</span>
              </div>
              <p className="text-[11px] text-gray-600">
                Passez vos candidatures de <em>« À postuler »</em> à <em>« Entretien »</em> avec calcul automatique de la date de relance à J+7 !
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-8 animate-fade-in pb-16">
      {/* =========================================================================
          1. HERO BANNER FUN & COLORÉ AVEC ACTIONS DIRECTES
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-purple-700 via-indigo-600 to-blue-600 text-white p-6 sm:p-8 shadow-lg">
        {/* Cercles de fond stylisés */}
        <div className="absolute -right-8 -top-8 w-56 h-56 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-10 w-44 h-44 bg-rose-400/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold text-amber-200 border border-white/20 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
            <span>Mode d&apos;Emploi Interactif & Astuces Pro</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Maîtrisez votre boîte à outils & décrochez vos entretiens ! 🚀
          </h1>

          <p className="text-xs sm:text-sm text-purple-100 leading-relaxed max-w-2xl">
            Bienvenue dans votre guide pratique interactif. Découvrez comment exploiter à 100% le remplissage auto de profils, tester vos scores ATS en direct et automatiser vos candidatures.
          </p>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            {onOpenTour && (
              <button
                type="button"
                onClick={onOpenTour}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Compass className="w-4 h-4 text-purple-900" />
                <span>Lancer la Visite Guidée Animée ✨</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onLoadSampleData?.(SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB);
                confetti({ particleCount: 50, spread: 70 });
                onNavigateToTab('app');
              }}
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-102"
            >
              <Play className="w-4 h-4 fill-current text-amber-300" />
              <span>Charger la démo complète (CV + Offre)</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToTab('app')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Accéder à l&apos;Analyseur</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. SIMULATEUR D'AUDIT ATS EXPRESS EN DIRECT (FUN & INTERACTIF)
         ========================================================================= */}
      <div className="bg-linear-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl space-y-5 border border-purple-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 border-b border-purple-800/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-500/30 text-amber-300 rounded-lg">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Simulateur d&apos;Adéquation ATS en Direct ⚡
              </h2>
            </div>
            <p className="text-xs text-purple-200 mt-1">
              Testez interactivement comment les compétences sélectionnées boostent le score d&apos;un candidat !
            </p>
          </div>

          <div className="flex items-center gap-2 bg-purple-950/70 border border-purple-700/50 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] text-purple-300 font-medium">Poste ciblé :</span>
            <span className="text-xs font-bold text-amber-300">{simJob}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          {/* Mots-clés cliquables */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-200">
                Cliquez pour ajouter ou retirer des compétences de votre profil :
              </span>
              <span className="text-[11px] text-purple-300">
                {simSelectedKeywords.length} sélectionnée(s)
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableKeywords.map((kw) => {
                const isSelected = simSelectedKeywords.includes(kw);
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => toggleSimKeyword(kw)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-sm scale-102 ring-2 ring-emerald-300/40'
                        : 'bg-purple-950/60 text-purple-200 border border-purple-700/50 hover:bg-purple-800/50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    <span>{kw}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-purple-300/80 pt-1">
              💡 <em>Chaque mot-clé clé correspondant précisément à l&apos;annonce fait grimper le score calculé par l&apos;algorithme.</em>
            </p>
          </div>

          {/* Jauge de Score ATS Interactif */}
          <div className="lg:col-span-4 bg-purple-950/80 border border-purple-600/40 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
              Score ATS Simulé
            </span>

            <div className="relative flex items-center justify-center w-28 h-28">
              <div
                className={`w-28 h-28 rounded-full border-8 flex items-center justify-center font-black text-2xl transition-all duration-500 ${
                  simScore >= 70
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-950/30'
                    : simScore >= 45
                    ? 'border-amber-400 text-amber-300 bg-amber-950/30'
                    : 'border-rose-400 text-rose-300 bg-rose-950/30'
                }`}
              >
                {simScore}%
              </div>
            </div>

            <div className="space-y-1">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  simScore >= 70
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : simScore >= 45
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                }`}
              >
                {simScore >= 70 ? '🎉 Profil Idéal (Retenu)' : simScore >= 45 ? '⚠️ Profil Partiel' : '❌ Lacunes Détectées'}
              </span>
              <p className="text-[10px] text-purple-300">
                {simScore >= 70
                  ? 'Passe les filtres RH sans encombre !'
                  : 'Ajoutez 2 compétences supplémentaires pour atteindre le seuil de 70%.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. PARCOURS INTERACTIF EN 5 ÉTAPES CLÉS
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>Le Parcours d&apos;une Candidature Gagnante (5 Étapes)</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cliquez sur les onglets ci-dessous pour explorer chaque phase pas à pas.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl flex-wrap">
            {steps.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeStep === idx
                    ? 'bg-purple-600 text-white shadow-xs scale-102'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                <span>{idx + 1}.</span>
                <span>{step.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenu de l'étape active + Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl bg-linear-to-tr ${steps[activeStep].color} text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0`}>
                {React.createElement(steps[activeStep].icon, { className: 'w-5 h-5' })}
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">
                  Étape {activeStep + 1} sur {steps.length}
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  {steps[activeStep].title}
                </h3>
              </div>
            </div>

            <div className="p-5 bg-gray-50/80 border border-gray-200/80 rounded-2xl">
              {steps[activeStep].content}
            </div>

            {/* Navigation précédent / suivant */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                disabled={activeStep === 0}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                ← Précédent
              </button>

              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                disabled={activeStep === steps.length - 1}
                className="px-5 py-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-30 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Suivant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mini Checklist Interactive du Candidat */}
          <div className="lg:col-span-4 bg-linear-to-b from-purple-50/90 to-indigo-50/50 p-5 rounded-3xl border border-purple-200/80 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-700" />
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                  Votre Checklist Active
                </h4>
              </div>
              <span className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                {progressPercent}%
              </span>
            </div>

            {/* Barre de progression */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-linear-to-r from-purple-600 via-indigo-600 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              {[
                { key: 'step1', label: '1. Renseigner ou remplir mon profil depuis un CV' },
                { key: 'step2', label: '2. Déposer un CV (PDF/DOCX ou texte)' },
                { key: 'step3', label: '3. Charger ou coller une offre d\'emploi' },
                { key: 'step4', label: '4. Lancer une analyse d\'adéquation ATS' },
                { key: 'step5', label: '5. Ajouter une candidature au tableau de suivi' },
              ].map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                    checklist[item.key]
                      ? 'bg-emerald-50/90 text-emerald-950 font-semibold border border-emerald-200/70 shadow-2xs'
                      : 'hover:bg-white/80 text-gray-700 bg-white/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.key] || false}
                    onChange={() => toggleChecklistItem(item.key)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                  />
                  <span className={checklist[item.key] ? 'line-through opacity-75' : ''}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {completedCount === 5 ? (
              <div className="p-3.5 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-950 text-xs font-bold flex items-center gap-2.5 animate-bounce shadow-xs">
                <Trophy className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>Félicitations ! Vous avez complété toutes les étapes clés ! 🎉</span>
              </div>
            ) : (
              <p className="text-[11px] text-purple-800/80 text-center font-medium">
                Cochez chaque étape au fil de votre exploration pour débloquer votre badge !
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. LE MINI-QUIZ RECRUTEUR & ATS (100% FUN)
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Mini-Quiz : Testez vos Réflexes Recruteur & ATS 🎯
              </h2>
              <p className="text-xs text-gray-500">
                3 questions express pour vérifier si vous connaissez les coulisses de la sélection.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
            3 questions express
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {QUIZ_QUESTIONS.map((q) => {
            const selectedIdx = quizAnswers[q.id];
            const hasAnswered = selectedIdx !== null;
            const isCorrect = hasAnswered && q.options[selectedIdx]?.correct;

            return (
              <div
                key={q.id}
                className="bg-gray-50/70 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 leading-snug">
                    {q.question}
                  </h4>

                  <div className="space-y-1.5 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedIdx === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectQuizOption(q.id, optIdx)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                            isOptionSelected
                              ? opt.correct
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold shadow-2xs'
                                : 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                              : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {hasAnswered && (
                  <div
                    className={`p-2.5 rounded-xl text-[11px] leading-snug font-medium ${
                      isCorrect
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}
                  >
                    <span>{q.options[selectedIdx].feedback}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          5. SECRETS DES RECRUTEURS & ASTUCES ATS (COLORÉ & DYNAMIQUE)
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 text-amber-800 rounded-xl">
                <Lightbulb className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-gray-900">
                Secrets des Recruteurs & Raccourcis ATS
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Les bonnes pratiques indispensables pour déjouer les algorithmes et captiver les recruteurs.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTipCategory('ats')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTipCategory === 'ats'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🤖 Déjouer les ATS
            </button>
            <button
              type="button"
              onClick={() => setActiveTipCategory('recruteur')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTipCategory === 'recruteur'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              👀 Regard Recruteur
            </button>
            <button
              type="button"
              onClick={() => setActiveTipCategory('lettre')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTipCategory === 'lettre'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ✍️ Lettre d&apos;accroche
            </button>
            <button
              type="button"
              onClick={() => setActiveTipCategory('relance')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTipCategory === 'relance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📞 Relance à J+7
            </button>
          </div>
        </div>

        {/* Cartes d'astuces dynamiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeTipCategory === 'ats' && (
            <>
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                <span className="text-2xl">🎯</span>
                <h4 className="text-xs font-bold text-purple-950">Mots-clés exacts</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Si l&apos;annonce mentionne <em>« Cash pooling »</em> ou <em>« SEPA »</em>, utilisez exactement cette orthographe. Les filtres ATS recherchent les occurrences littérales.
                </p>
              </div>
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                <span className="text-2xl">📄</span>
                <h4 className="text-xs font-bold text-purple-950">Structure linéaire sans piège</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Évitez les tableaux complexes, zones de texte flottantes ou graphiques illisibles pour les robots. Un texte linéaire simple garantit 100% de lisibilité.
                </p>
              </div>
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                <span className="text-2xl">⚡</span>
                <h4 className="text-xs font-bold text-purple-950">Le seuil magique des 70%</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Un score supérieur à <strong>70/100</strong> vous place dans les 10% des meilleurs dossiers transmis au recruteur humain.
                </p>
              </div>
            </>
          )}

          {activeTipCategory === 'recruteur' && (
            <>
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                <span className="text-2xl">⏱️</span>
                <h4 className="text-xs font-bold text-blue-950">Le test des 6 secondes</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Un recruteur lit en premier votre <strong>Titre de poste</strong> et vos <strong>3 dernières réalisations</strong>. Ils doivent correspondre au profil recherché.
                </p>
              </div>
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                <span className="text-2xl">📊</span>
                <h4 className="text-xs font-bold text-blue-950">Chiffrez vos résultats</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Au lieu de <em>« Gestion de trésorerie »</em>, écrivez <em>« Gestion d&apos;une trésorerie consolidée de 45 M€ sur 8 filiales »</em>. L&apos;impact est décuplé !
                </p>
              </div>
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                <span className="text-2xl">💼</span>
                <h4 className="text-xs font-bold text-blue-950">Les outils maîtres</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Citez toujours vos progiciels phares (AGICAP, Kyriba, SAP, Pennylane...). C&apos;est le critère d&apos;élimination n°1 des RH.
                </p>
              </div>
            </>
          )}

          {activeTipCategory === 'lettre' && (
            <>
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-2xl">🚫</span>
                <h4 className="text-xs font-bold text-emerald-950">Bannir les formules creuses</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Oubliez <em>« Actuellement à la recherche d&apos;une nouvelle opportunité... »</em>. Attaquez directement par votre apport pour l&apos;entreprise.
                </p>
              </div>
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-2xl">🪝</span>
                <h4 className="text-xs font-bold text-emerald-950">L&apos;accroche sur-mesure</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Mentionnez un défi spécifique de l&apos;offre : <em>« Votre projet de migration TMS fait écho à mon déploiement réussi chez... »</em>.
                </p>
              </div>
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-2xl">✨</span>
                <h4 className="text-xs font-bold text-emerald-950">Le Générateur IA</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Utilisez l&apos;onglet <strong>Générateur CV & Lettre</strong> pour créer une proposition adaptée en moins de 30 secondes.
                </p>
              </div>
            </>
          )}

          {activeTipCategory === 'relance' && (
            <>
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <span className="text-2xl">📅</span>
                <h4 className="text-xs font-bold text-amber-950">Le bon timing</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Relancez à <strong>J+7</strong> ou <strong>J+10</strong>. C&apos;est le délai idéal pour montrer votre motivation sans paraître pressant.
                </p>
              </div>
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <span className="text-2xl">💡</span>
                <h4 className="text-xs font-bold text-amber-950">Apportez de la valeur</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Ne dites pas seulement <em>« Avez-vous reçu mon CV ? »</em>. Ajoutez un élément d&apos;actualité ou un point technique sur leur secteur.
                </p>
              </div>
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <span className="text-2xl">📌</span>
                <h4 className="text-xs font-bold text-amber-950">Le Suivi Kanban</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Programmez vos alertes de relance dans l&apos;onglet <strong>Suivi Candidatures</strong> pour ne jamais laisser une opportunité s&apos;éteindre.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
          6. FOIRE AUX QUESTIONS (FAQ)
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <span className="p-1.5 bg-blue-100 text-blue-800 rounded-xl">
            <HelpCircle className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold text-gray-900">
            Foire Aux Questions (FAQ)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
            <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
              <span>🔒 Mes données sont-elles conservées en sécurité ?</span>
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Oui ! Toutes vos données (CVs, profils, candidatures, historique) sont stockées dans votre base locale sécurisée (<code>data/local_database.json</code> et mémoire de votre navigateur). Aucune donnée n&apos;est vendue ni partagée.
            </p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
            <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
              <span>👤 Comment fonctionne le multi-profils ?</span>
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Vous pouvez créer plusieurs personas professionnels (ex: Direction Financière, Trésorerie Opérationnelle). Le sélecteur situé dans la barre latérale et l&apos;en-tête vous permet de basculer en un clic sur le profil adapté.
            </p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
            <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
              <span>⚡ Pourquoi le bouton « Remplir depuis le CV » est-il pratique ?</span>
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Il vous évite de retaper manuellement vos informations. L&apos;analyseur lit votre CV en 1 seconde et pré-remplit tous les champs de votre profil (coordonnées, compétences, rôles cibles, bio).
            </p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
            <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
              <span>🔑 Faut-il une clé API pour utiliser l&apos;application ?</span>
            </h4>
            <p className="text-gray-600 leading-relaxed">
              L&apos;extraction locale fonctionne 100% sans clé ! Pour l&apos;audit approfondi par IA et le générateur, vous pouvez utiliser la clé du Studio ou saisir votre propre clé Google Gemini gratuite dans l&apos;onglet Paramétrage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
