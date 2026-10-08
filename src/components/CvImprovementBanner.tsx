import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Layers,
  ShieldCheck,
  UserCheck,
  Clock,
  ArrowRight,
  Pause,
  Play,
} from 'lucide-react';

interface CvImprovementBannerProps {
  initialDurationSeconds?: number;
  onClose?: () => void;
}

export const CvImprovementBanner: React.FC<CvImprovementBannerProps> = ({
  initialDurationSeconds = 10,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(initialDurationSeconds);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Écouteur global pour ré-ouvrir la bannière au centre à tout moment (ex: clic logo)
  useEffect(() => {
    const handleReopen = () => {
      setTimeLeft(initialDurationSeconds);
      setIsPaused(false);
      setIsFadingOut(false);
      setIsOpen(true);
    };

    window.addEventListener('open_cv_improvement_banner', handleReopen);
    return () => window.removeEventListener('open_cv_improvement_banner', handleReopen);
  }, [initialDurationSeconds]);

  // Décompte de 10 secondes avec fermeture automatique
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const intervalMs = 100;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTriggerFadeOut();
          return 0;
        }
        return Math.max(0, +(prev - intervalMs / 1000).toFixed(2));
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPaused]);

  const handleTriggerFadeOut = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsFadingOut(false);
      onClose?.();
    }, 450);
  };

  const handleImmediateClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    handleTriggerFadeOut();
  };

  if (!isOpen) return null;

  // Calcul du pourcentage écoulé pour la barre de progression (0 à 100%)
  const progressPercent = Math.min(
    100,
    Math.max(0, ((initialDurationSeconds - timeLeft) / initialDurationSeconds) * 100)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bannière d'accueil CV Improvement"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs select-none transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-fade-in'
      }`}
    >
      {/* Conteneur principal centré au milieu de l'écran */}
      <div
        className={`w-full max-w-2xl sm:max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col relative transform transition-all duration-500 ${
          isFadingOut ? 'scale-95 translate-y-2' : 'scale-100 translate-y-0'
        }`}
      >
        {/* Ligne d'accent supérieure verte menthe */}
        <div className="h-2 w-full bg-linear-to-r from-[#0A2540] via-[#00D287] to-[#0A2540]" />

        {/* Bouton de fermeture rapide ✕ dans l'angle supérieur droit */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title={isPaused ? 'Reprendre le décompte automatique' : 'Mettre en pause le décompte'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleImmediateClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Fermer la bannière immédiatement"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            CORPS DE LA BANNIÈRE : REPRISE RIGOUROUSE DE TOUS LES CODES IDENTIFIANTS
           ========================================================================= */}
        <div className="p-6 sm:p-9 flex flex-col md:flex-row items-center md:items-stretch gap-6 sm:gap-8 bg-linear-to-b from-white via-white to-slate-50/50">
          {/* -----------------------------------------------------------------------
              BLOC GAUCHE : LE GRAND LOGO OFFICIEL DANS SON SQUIRCLE BLEU NUIT
             ----------------------------------------------------------------------- */}
          <div className="flex flex-col items-center justify-center text-center select-none shrink-0 md:border-r md:border-slate-200/80 md:pr-8 md:min-w-[210px]">
            {/* Grand icône d'application officiel avec coins arrondis profonds */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] sm:rounded-[32px] bg-[#0A2540] p-5 shadow-xl flex items-center justify-center border border-[#133557] relative transition-transform hover:scale-102">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                {/* Coin supérieur droit replié (triangle vert menthe) */}
                <path d="M 62 14 L 84 36 L 62 36 Z" fill="#00D287" />

                {/* Contour principal du document avec arrondi haut-gauche */}
                <path
                  d="M 60 14 H 30 C 21 14 15 20 15 29 V 40"
                  stroke="#FFFFFF"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Bord supérieur droit avant le pli */}
                <path
                  d="M 84 38 V 44"
                  stroke="#FFFFFF"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* 2 Lignes de texte horizontales intérieures */}
                <line
                  x1="30"
                  y1="28"
                  x2="52"
                  y2="28"
                  stroke="#FFFFFF"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <line
                  x1="30"
                  y1="40"
                  x2="45"
                  y2="40"
                  stroke="#FFFFFF"
                  strokeWidth="7"
                  strokeLinecap="round"
                />

                {/* Boucle inférieure du document (forme de 'C' arrondi) */}
                <path
                  d="M 46 50 H 30 C 20 50 15 57 15 67 C 15 78 22 86 34 86 H 64 C 76 86 84 78 84 66 V 56"
                  stroke="#FFFFFF"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Trait dynamique ascendant (stylo en vert menthe) */}
                <line
                  x1="40"
                  y1="75"
                  x2="72"
                  y2="43"
                  stroke="#00D287"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Titre textuel "CV Improvement" */}
            <div className="mt-3.5 text-center leading-tight">
              <span className="block text-xl sm:text-2xl font-black text-[#0A2540] tracking-tight">
                CV Improvement
              </span>
            </div>

            {/* Barre d'accentuation verte menthe */}
            <div className="w-14 h-1 bg-[#00D287] rounded-full my-2.5" />

            {/* Mention DeltaOne Developpement */}
            <div className="text-xs text-slate-500 font-semibold tracking-wide">
              by DeltaOne Developpement
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              BLOC DROIT : IDENTITÉ, SLOGAN, DIRECTION DE PROJET ET MISSION
             ----------------------------------------------------------------------- */}
          <div className="flex flex-col justify-center flex-1 text-center md:text-left min-w-0 pr-0 md:pr-4">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#0A2540] text-white px-2.5 py-0.5 rounded-full">
                Application Officielle
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Moteur ATS & Recrutement IA
              </span>
            </div>

            {/* Titre principal */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tracking-tight leading-snug">
              Bienvenue dans CV Improvement
            </h2>

            {/* Slogan officiel */}
            <p className="text-base sm:text-lg font-bold text-slate-800 mt-1">
              Votre potentiel mérite un meilleur CV.
            </p>

            {/* Crédits de développement et direction de projet */}
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap text-xs sm:text-sm text-slate-600 font-medium mt-2 pt-2.5 border-t border-slate-200/80">
              <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                <span>by DeltaOne Developpement</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1.5 text-slate-900 font-bold">
                <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Direction de projet : François Delrieu</span>
              </span>
            </div>

            {/* Descriptif d'accompagnement */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2.5 max-w-xl">
              Cet outil intelligent analyse l&apos;adéquation entre votre profil et vos offres cibles,
              optimise vos expériences selon la méthode STAR et prépare vos arguments d&apos;entretien.
            </p>

            {/* Puces de fonctionnalités */}
            <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 flex-wrap mt-3.5 pt-2 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold text-slate-800 shadow-2xs">
                <Layers className="w-3 h-3 text-[#FF4B4B]" />
                Audit ATS sur 100
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold text-slate-800 shadow-2xs">
                <Sparkles className="w-3 h-3 text-purple-600" />
                Optimisation STAR
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold text-slate-800 shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Données locales & sécurisées
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BARRE INFÉRIEURE : MINUTEUR 10 SECONDES & BOUTON D'ACCÈS IMMÉDIAT
           ========================================================================= */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Indicateur de compte à rebours 10 secondes */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isPaused ? (
                <span className="text-amber-700 font-bold">Décompte en pause</span>
              ) : (
                <>
                  Fermeture automatique dans{' '}
                  <strong className="text-slate-900 font-black">
                    {Math.ceil(timeLeft)} seconde{Math.ceil(timeLeft) > 1 ? 's' : ''}
                  </strong>
                </>
              )}
            </span>
          </div>

          {/* Bouton d'accès immédiat */}
          <button
            type="button"
            onClick={handleImmediateClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0A2540] hover:bg-[#133557] text-white transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
          >
            <span>Accéder à l&apos;application</span>
            <ArrowRight className="w-4 h-4 text-[#00D287]" />
          </button>
        </div>

        {/* Jauge de progression dynamique des 10 secondes */}
        <div className="h-1.5 w-full bg-slate-200 relative overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-emerald-500 to-[#00D287] transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default CvImprovementBanner;
