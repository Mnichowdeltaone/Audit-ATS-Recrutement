import React, { useState } from 'react';
import {
  Sparkles,
  Lightbulb,
  MessageCircle,
  HelpCircle,
  RefreshCw,
  Award,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export type CoachMood = 'happy' | 'thinking' | 'writing' | 'coaching' | 'celebrating';

interface AnimatedCoachMascotProps {
  mood?: CoachMood;
  customMessage?: string;
  onAskTip?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const COACH_TIPS = [
  "💡 **Méthode STAR** : Ne dis pas juste 'Géré un projet'. Dis : 'Piloté un projet de 80k€ et livré avec 2 semaines d'avance (+15% rentabilité)' !",
  "🤖 **Secret des robots ATS** : Ils ne lisent pas les graphiques, camemberts ou tableaux complexes. Reste sur une structure linéaire textuelle nette !",
  "⚡ **Les 6 premières secondes** : Les recruteurs scannent en priorité le titre de ton poste, ton résumé de 3 lignes et ta dernière expérience !",
  "🎯 **Mots-clés stratégiques** : Reprends exactement l'orthographe des outils cités dans l'offre (ex: 'TypeScript' et non 'TS').",
  "💼 **Pour une reconversion** : Mets l'accent sur tes 'compétences transférables' (gestion de budget, négociation, management).",
  "🌍 **Sur un CV en anglais** : Pas de date de naissance, pas d'état civil, pas de photo. Concentre-toi à 100% sur les 'Achievements' !",
  "📈 **Chiffre tes impacts** : Des pourcentages, des montants en euros ou des gains de temps rendent n'importe quel profil irrésistible !",
];

export const AnimatedCoachMascot: React.FC<AnimatedCoachMascotProps> = ({
  mood = 'happy',
  customMessage,
  onAskTip,
  className = '',
  size = 'md',
}) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [isWaving, setIsWaving] = useState(false);

  const currentMessage = customMessage || COACH_TIPS[tipIndex];

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % COACH_TIPS.length);
    onAskTip?.();
  };

  const handleAvatarClick = () => {
    setIsWaving(true);
    handleNextTip();
    setTimeout(() => setIsWaving(false), 800);
  };

  // Dimensions selon taille
  const sizeConfig = {
    sm: { avatar: 'w-16 h-16', bubbleText: 'text-xs', container: 'gap-3' },
    md: { avatar: 'w-20 h-20 sm:w-24 sm:h-24', bubbleText: 'text-xs sm:text-sm', container: 'gap-4' },
    lg: { avatar: 'w-28 h-28 sm:w-32 sm:h-32', bubbleText: 'text-sm sm:text-base', container: 'gap-5' },
  }[size];

  return (
    <div className={`flex items-start select-none ${sizeConfig.container} ${className}`}>
      {/* =========================================================================
          AVATAR ANIMÉ VECTORIEL : FÉLIX LE MENTOR ATS
         ========================================================================= */}
      <div
        onClick={handleAvatarClick}
        className={`relative shrink-0 cursor-pointer group transition-transform duration-300 hover:scale-105 active:scale-95 ${sizeConfig.avatar}`}
        title="Cliquez sur Félix pour recevoir un nouveau conseil !"
      >
        {/* Halo lumineux d'aura */}
        <div className="absolute inset-0 rounded-full bg-linear-to-tr from-[#00D287]/40 via-blue-400/30 to-purple-500/40 blur-md group-hover:blur-lg transition-all animate-pulse" />

        {/* Corps de l'avatar SVG stylisé */}
        <div className="relative w-full h-full rounded-full bg-linear-to-b from-[#0A2540] to-[#133557] border-2 border-[#00D287] shadow-lg flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <defs>
              {/* Dégradés du personnage */}
              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FED7AA" />
                <stop offset="100%" stopColor="#FDBA74" />
              </linearGradient>
              <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
              <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0F223A" />
                <stop offset="100%" stopColor="#0A1829" />
              </linearGradient>
            </defs>

            {/* Veste / Costume chic */}
            <path d="M 20 120 Q 30 85 60 85 Q 90 85 100 120 Z" fill="url(#suitGrad)" />
            {/* Chemise blanche et cravate vert menthe */}
            <polygon points="50,85 70,85 64,115 56,115" fill="#FFFFFF" />
            <polygon points="58,87 62,87 63,110 59,114 57,110" fill="#00D287" />

            {/* Tête */}
            <circle cx="60" cy="55" r="28" fill="url(#skinGrad)" />

            {/* Oreilles */}
            <circle cx="32" cy="56" r="6" fill="#FDBA74" />
            <circle cx="88" cy="56" r="6" fill="#FDBA74" />

            {/* Cheveux modernes stylés */}
            <path
              d="M 32 48 C 30 28 50 20 68 22 C 84 24 90 35 88 48 C 84 32 72 26 58 28 C 42 30 36 38 32 48 Z"
              fill="url(#hairGrad)"
            />
            {/* Mèche dynamique */}
            <path d="M 52 24 Q 60 14 74 18 Q 65 24 58 25 Z" fill="#334155" />

            {/* Lunettes de coach intelligentes */}
            <rect
              x="39"
              y="46"
              width="17"
              height="13"
              rx="4"
              fill="none"
              stroke="#0A2540"
              strokeWidth="2.5"
            />
            <rect
              x="64"
              y="46"
              width="17"
              height="13"
              rx="4"
              fill="none"
              stroke="#0A2540"
              strokeWidth="2.5"
            />
            <line x1="56" y1="52" x2="64" y2="52" stroke="#0A2540" strokeWidth="2.5" />

            {/* Yeux expressifs derrière les lunettes */}
            {mood === 'thinking' ? (
              <>
                <circle cx="48" cy="51" r="2.5" fill="#0A2540" />
                <circle cx="73" cy="51" r="2.5" fill="#0A2540" />
                <line x1="42" y1="43" x2="52" y2="44" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                <line x1="68" y1="44" x2="78" y2="42" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
              </>
            ) : mood === 'celebrating' ? (
              <>
                {/* Yeux rieurs en arc */}
                <path d="M 44 54 Q 48 48 52 54" fill="none" stroke="#0A2540" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 68 54 Q 72 48 76 54" fill="none" stroke="#0A2540" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Yeux ouverts bienveillants avec reflet */}
                <circle cx="47" cy="52" r="3" fill="#0A2540" />
                <circle cx="73" cy="52" r="3" fill="#0A2540" />
                <circle cx="48" cy="51" r="1" fill="#FFFFFF" />
                <circle cx="74" cy="51" r="1" fill="#FFFFFF" />
              </>
            )}

            {/* Sourire bienveillant */}
            {mood === 'celebrating' ? (
              <path d="M 50 67 Q 60 77 70 67 Z" fill="#E11D48" stroke="#0A2540" strokeWidth="2" />
            ) : mood === 'thinking' ? (
              <ellipse cx="60" cy="69" rx="3" ry="2" fill="#0A2540" />
            ) : (
              <path d="M 52 68 Q 60 74 68 68" fill="none" stroke="#0A2540" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Pommettes chaleureuses */}
            <circle cx="41" cy="61" r="3" fill="#FDA4AF" opacity="0.6" />
            <circle cx="79" cy="61" r="3" fill="#FDA4AF" opacity="0.6" />
          </svg>
        </div>

        {/* Badge animé en bas à droite (Humeur du coach) */}
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border border-slate-200 flex items-center justify-center animate-bounce">
          {mood === 'writing' ? (
            <span className="text-xs">✍️</span>
          ) : mood === 'celebrating' ? (
            <span className="text-xs">🎉</span>
          ) : mood === 'thinking' ? (
            <span className="text-xs">🧐</span>
          ) : mood === 'coaching' ? (
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <span className="text-xs">✨</span>
          )}
        </div>
      </div>

      {/* =========================================================================
          BULLE DE DIALOGUE INTERACTIVE DU PERSONNAGE
         ========================================================================= */}
      <div className="flex-1 min-w-0 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 relative">
        {/* Flèche de la bulle pointant vers l'avatar */}
        <div className="absolute top-5 -left-2 w-4 h-4 bg-white border-l border-b border-slate-200 transform rotate-45" />

        {/* En-tête de la bulle */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#0A2540] flex items-center gap-1.5">
              <span>Félix</span>
              <span className="text-[10px] font-bold bg-[#00D287]/20 text-emerald-800 border border-[#00D287]/40 px-2 py-0.2 rounded-full">
                Coach Recrutement & ATS
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleNextTip}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Obtenir une autre astuce du coach"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Autre conseil</span>
            </button>
          </div>
        </div>

        {/* Message du coach */}
        <div className={`text-slate-700 leading-relaxed font-sans ${sizeConfig.bubbleText}`}>
          <div
            dangerouslySetInnerHTML={{
              __html: currentMessage
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#0A2540] font-black">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em class="text-slate-800">$1</em>'),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AnimatedCoachMascot;
