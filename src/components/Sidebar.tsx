import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Briefcase,
  History,
  Database,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Settings,
  X,
  BookOpen,
} from 'lucide-react';
import { UserProfile, DatabaseStats, AnalysisHistoryItem } from '../types';

export interface NavItem {
  id: 'app' | 'tracker' | 'cv-assistant' | 'database' | 'history' | 'code' | 'guide' | 'settings';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
  badge: string | null;
  badgeColor?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  activeTab: 'app' | 'tracker' | 'cv-assistant' | 'database' | 'history' | 'code' | 'guide' | 'settings';
  setActiveTab: (tab: 'app' | 'tracker' | 'cv-assistant' | 'database' | 'history' | 'code' | 'guide' | 'settings') => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  userProfile: UserProfile | null;
  userProfiles?: UserProfile[];
  onSelectProfile?: (id: string) => void;
  onOpenTour?: () => void;
  apiKey: string;
  hasServerKey: boolean;
  selectedModel: string;
  applicationsCount: number;
  historyCount: number;
  dbStats: DatabaseStats | null;
  history?: AnalysisHistoryItem[];
  onLoadHistoryItem?: (item: AnalysisHistoryItem) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  userProfile,
  userProfiles = [],
  onSelectProfile,
  onOpenTour,
  apiKey,
  hasServerKey,
  selectedModel,
  applicationsCount,
  historyCount,
  dbStats,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const [tipIndex, setTipIndex] = useState(0);

  const RECRUITER_TIPS = [
    "Les robots ATS détestent les colonnes multiples : restez linéaire pour un score maximal !",
    "Relancez votre recruteur entre 9h et 10h le mardi : c'est le créneau statistique le plus lu.",
    "Un chiffre vaut 1000 adjectifs : 'Trésorerie consolidée de 45 M€' surpasse 'Trésorier rigoureux'.",
    "Citez toujours vos progiciels phares (AGICAP, Kyriba, Excel VBA) dans vos compétences clés.",
    "Le test des 6 secondes : les 3 premières lignes de votre CV décident de l'attention du recruteur.",
    "Une lettre courte en 3 paragraphes ciblés est 3 fois plus lue qu'un long pavé d'une page !",
  ];

  const nextTip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTipIndex((prev) => (prev + 1) % RECRUITER_TIPS.length);
  };

  // Navigation cliquable avec gestion du menu mobile
  const handleNavClick = (tab: 'app' | 'tracker' | 'cv-assistant' | 'database' | 'history' | 'code' | 'guide' | 'settings') => {
    setActiveTab(tab);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const candidateInitials = userProfile && (userProfile.firstName || userProfile.lastName)
    ? `${userProfile.firstName?.[0] || ''}${userProfile.lastName?.[0] || ''}`.toUpperCase() || 'CV'
    : '👤';

  const candidateFullName = userProfile && (userProfile.firstName || userProfile.lastName)
    ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
    : 'Mon Espace Candidat';

  const candidateTitle = userProfile?.currentTitle || 'Espace Personnel & Recrutement';

  // Navigation fluide et épurée (sans encombrement)
  const navSections: NavSection[] = [
    {
      title: 'Analyse & Génération',
      items: [
        {
          id: 'app' as const,
          label: 'Analyseur CV / Offre',
          icon: Layers,
          color: 'text-[#FF4B4B]',
          activeBg: 'bg-red-50 text-red-700 border-red-200',
          badge: null,
        },
        {
          id: 'cv-assistant' as const,
          label: 'Générateur CV & Lettre',
          icon: Sparkles,
          color: 'text-purple-600',
          activeBg: 'bg-purple-50 text-purple-700 border-purple-200',
          badge: 'IA',
        },
      ],
    },
    {
      title: 'Suivi & Candidatures',
      items: [
        {
          id: 'tracker' as const,
          label: 'Suivi Candidatures',
          icon: Briefcase,
          color: 'text-blue-600',
          activeBg: 'bg-blue-50 text-blue-700 border-blue-200',
          badge: applicationsCount > 0 ? String(applicationsCount) : null,
        },
        {
          id: 'history' as const,
          label: 'Historique des Audits',
          icon: History,
          color: 'text-purple-600',
          activeBg: 'bg-purple-50 text-purple-700 border-purple-200',
          badge: historyCount > 0 ? String(historyCount) : null,
        },
        {
          id: 'database' as const,
          label: 'Base de Données Locale',
          icon: Database,
          color: 'text-emerald-600',
          activeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          badge: dbStats ? String(dbStats.cvsCount) : null,
        },
      ],
    },
    {
      title: 'Guide & Aide',
      items: [
        {
          id: 'guide' as const,
          label: 'Mode d\'emploi interactif',
          icon: BookOpen,
          color: 'text-amber-500',
          activeBg: 'bg-amber-50 text-amber-950 border-amber-300 font-black',
          badge: 'Tuto 💡',
          badgeColor: 'bg-linear-to-r from-amber-400 to-orange-400 text-gray-950 font-black shadow-2xs',
        },
      ],
    },
    {
      title: 'Espace Personnel & Technique',
      items: [
        {
          id: 'settings' as const,
          label: 'Espace Personnel & Technique',
          icon: Sliders,
          color: 'text-indigo-600',
          activeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          badge: apiKey.trim() || hasServerKey ? 'Prêt' : 'À configurer',
          badgeColor: apiKey.trim() || hasServerKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 select-none">
      {/* 1. Header Logo & Collapse Button */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
        <div
          onClick={() => handleNavClick('app')}
          className="flex items-center gap-2.5 cursor-pointer group min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-[#FF4B4B] flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            📄
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 text-sm leading-tight truncate">
                CV Move Personnel
              </h2>
              <p className="text-[10px] text-gray-500 font-medium truncate">
                Audit ATS & Recrutement
              </p>
            </div>
          )}
        </div>

        {/* Bouton pour replier / déplier sur desktop */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
          title={isCollapsed ? 'Déplier le menu' : 'Replier le menu'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Bouton fermer sur mobile */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Mini Carte Profil Utilisateur */}
      {!isCollapsed ? (
        <div className="p-3 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div
            onClick={() => handleNavClick('settings')}
            className="p-2 bg-white rounded-xl border border-gray-200/80 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group space-y-1.5"
            title="Ouvrir l'onglet Paramétrage & Profil"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-linear-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                {candidateInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-900 truncate flex items-center justify-between">
                  <span>{candidateFullName}</span>
                  <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-purple-600 transition-colors shrink-0" />
                </div>
                <div className="text-[10px] text-gray-500 truncate font-medium">
                  {candidateTitle}
                </div>
              </div>
            </div>

            {/* Sélecteur de profil actif si plusieurs profils */}
            {userProfiles.length > 1 ? (
              <div
                className="pt-1.5 border-t border-gray-100 flex items-center justify-between gap-1 text-[11px]"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider shrink-0">
                  Profil :
                </span>
                <select
                  value={userProfile?.id || ''}
                  onChange={(e) => onSelectProfile?.(e.target.value)}
                  className="bg-purple-50/80 hover:bg-purple-100 border border-purple-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-purple-900 truncate max-w-[130px] cursor-pointer focus:outline-none"
                  title="Changer de profil actif"
                >
                  {userProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.isDefault ? '⭐ ' : ''}{p.name || p.currentTitle || `${p.firstName} ${p.lastName}` || 'Profil'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="pt-1 border-t border-gray-100/80 flex items-center justify-between text-[10px] text-gray-400">
                <span className="truncate">{userProfile?.name || 'Profil Principal'}</span>
                <span className="text-purple-600 font-semibold">Gérer</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-2 border-b border-gray-100 flex justify-center shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('settings')}
            className="w-9 h-9 rounded-full bg-linear-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
            title={`Profil de ${candidateFullName} (${userProfile?.name || 'Actif'}) - Cliquer pour configurer`}
          >
            {candidateInitials}
          </button>
        </div>
      )}

      {/* 3. Sections de Navigation Réorganisées Fonctionnellement */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? `${item.activeBg} font-bold shadow-xs border`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 border border-transparent'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? '' : item.color}`} />
                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                          item.badgeColor
                            ? item.badgeColor
                            : isActive
                            ? 'bg-white/80 text-gray-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Widget Astuce Recruteur Express & Fun */}
        {!isCollapsed && (
          <div className="mx-2 mb-2 p-3 bg-linear-to-br from-amber-50/90 to-orange-50/70 border border-amber-200/90 rounded-xl space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
              <span className="flex items-center gap-1">
                <span>💡</span>
                <span>Astuce Recruteur</span>
              </span>
              <button
                type="button"
                onClick={nextTip}
                className="px-1.5 py-0.5 bg-amber-200/60 hover:bg-amber-300 text-amber-900 rounded text-[10px] font-bold cursor-pointer transition-colors"
                title="Afficher une autre astuce"
              >
                🎲 Autre
              </button>
            </div>
            <p className="text-[10px] text-amber-950 leading-relaxed font-medium">
              &laquo; {RECRUITER_TIPS[tipIndex]} &raquo;
            </p>
          </div>
        )}

        {/* Bouton Visite Guidée */}
        {!isCollapsed && onOpenTour && (
          <div className="mx-2 mb-2">
            <button
              type="button"
              onClick={onOpenTour}
              className="w-full py-1.5 px-2 bg-linear-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 text-purple-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>✨ Visite guidée interactive</span>
            </button>
          </div>
        )}

      </div>

      {/* 4. Pied de page / Statut API Google Gemini */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div
              onClick={() => handleNavClick('settings')}
              className="p-2.5 bg-white border border-gray-200 rounded-xl flex items-start gap-2 hover:border-indigo-300 transition-colors cursor-pointer group"
              title="Cliquer pour gérer la clé API et le modèle dans l'onglet Paramétrage"
            >
              {apiKey.trim() ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : hasServerKey ? (
                <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-gray-800 flex items-center justify-between">
                  <span className="truncate">
                    {apiKey.trim()
                      ? 'Clé personnalisée'
                      : hasServerKey
                      ? 'Clé Studio active'
                      : 'Clé non configurée'}
                  </span>
                  <Settings className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 shrink-0" />
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {selectedModel}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => handleNavClick('settings')}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
              title={
                apiKey.trim()
                  ? 'Clé API active'
                  : hasServerKey
                  ? 'Clé Studio active'
                  : 'Configurer la clé API'
              }
            >
              {apiKey.trim() ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : hasServerKey ? (
                <Zap className="w-4 h-4 text-blue-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 z-30 sticky top-0 h-screen ${
          isCollapsed ? 'w-18' : 'w-64 lg:w-72'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Drawer Mobile avec Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
