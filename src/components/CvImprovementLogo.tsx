import React from 'react';

interface CvImprovementLogoProps {
  variant?: 'full' | 'symbol' | 'icon' | 'white-text';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const CvImprovementLogo: React.FC<CvImprovementLogoProps> = ({
  variant = 'full',
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  // Dimensions pour le symbole SVG
  const symbolDimensions = {
    xs: { w: 22, h: 22 },
    sm: { w: 32, h: 32 },
    md: { w: 42, h: 42 },
    lg: { w: 54, h: 54 },
    xl: { w: 72, h: 72 },
  }[size];

  // Symbol SVG pur basé sur l'identité visuelle officielle
  const renderSymbol = (isDarkBg: boolean = false) => {
    const mainStrokeColor = isDarkBg ? '#FFFFFF' : '#0A2540';
    const accentMint = '#00D287';

    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        style={{ width: symbolDimensions.w, height: symbolDimensions.h }}
      >
        {/* Coin supérieur droit replié (triangle vert menthe) */}
        <path
          d="M 62 14 L 84 36 L 62 36 Z"
          fill={accentMint}
        />

        {/* Contour principal du document avec arrondi haut-gauche */}
        <path
          d="M 60 14 H 30 C 21 14 15 20 15 29 V 40"
          stroke={mainStrokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bord supérieur droit avant le pli */}
        <path
          d="M 84 38 V 44"
          stroke={mainStrokeColor}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* 2 Lignes de texte horizontales intérieures */}
        <line
          x1="30"
          y1="28"
          x2="52"
          y2="28"
          stroke={mainStrokeColor}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="30"
          y1="40"
          x2="45"
          y2="40"
          stroke={mainStrokeColor}
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Boucle inférieure du document (forme de 'C' arrondi) */}
        <path
          d="M 46 50 H 30 C 20 50 15 57 15 67 C 15 78 22 86 34 86 H 64 C 76 86 84 78 84 66 V 56"
          stroke={mainStrokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Trait dynamique ascendant (stylo / flèche d'amélioration à 45° en vert menthe) */}
        <line
          x1="40"
          y1="75"
          x2="72"
          y2="43"
          stroke={accentMint}
          strokeWidth="9"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  // 1. Variante : Icône d'application sur fond sombre (Squircle / App Icon)
  if (variant === 'icon') {
    return (
      <div
        className={`bg-[#0A2540] rounded-2xl flex items-center justify-center p-2.5 shadow-md border border-[#0f3256] transition-transform hover:scale-105 ${className}`}
        style={{
          width: symbolDimensions.w * 1.35,
          height: symbolDimensions.h * 1.35,
        }}
        title="CV Improvement - Votre potentiel mérite un meilleur CV"
      >
        {renderSymbol(true)}
      </div>
    );
  }

  // 2. Variante : Symbole seul (sans texte)
  if (variant === 'symbol') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderSymbol(false)}
      </div>
    );
  }

  // 3. Variante : Logo complet avec typographie officielle
  const isWhiteText = variant === 'white-text';
  const textColor = isWhiteText ? 'text-white' : 'text-[#0A2540]';
  const taglineColor = isWhiteText ? 'text-gray-300' : 'text-[#0A2540]/80';

  const fontSizes = {
    xs: { title: 'text-xs', tagline: 'text-[9px]' },
    sm: { title: 'text-sm', tagline: 'text-[10px]' },
    md: { title: 'text-base sm:text-lg', tagline: 'text-[11px]' },
    lg: { title: 'text-xl sm:text-2xl', tagline: 'text-xs sm:text-sm' },
    xl: { title: 'text-2xl sm:text-3xl', tagline: 'text-sm sm:text-base' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Symbole officiel */}
      <div className="shrink-0">{renderSymbol(isWhiteText)}</div>

      {/* Titre & Slogan */}
      <div className="flex flex-col justify-center min-w-0">
        <div
          className={`font-black tracking-tight leading-none ${textColor} ${fontSizes.title}`}
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          <span>CV </span>
          <span className="font-extrabold">Improvement</span>
        </div>

        {showTagline && (
          <p
            className={`font-medium leading-tight mt-1 truncate ${taglineColor} ${fontSizes.tagline}`}
          >
            Votre potentiel mérite un meilleur CV.
          </p>
        )}
      </div>
    </div>
  );
};

export default CvImprovementLogo;
