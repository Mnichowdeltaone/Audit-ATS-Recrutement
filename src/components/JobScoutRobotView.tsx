import React, { useState, useMemo, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Search,
  Filter,
  Briefcase,
  MapPin,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  Share2,
  Trash2,
  RefreshCw,
  PlusCircle,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Building2,
  User,
  Users,
  Target,
  Layers,
  FileText,
  Eye,
  Check,
  Send,
  Link as LinkIcon,
  HelpCircle,
  Zap,
  Percent,
  X,
  Compass,
} from 'lucide-react';
import type {
  ScrapedJobOffer,
  UserProfile,
  JobOfferSource,
  ApplicationItem,
  JobScoutConfig,
} from '../types';
import { jobScoutService } from '../services/jobScoutService';
import { localDbClient } from '../services/localDbClient';

interface JobScoutRobotViewProps {
  userProfile: UserProfile | null;
  userProfiles?: UserProfile[];
  applications: ApplicationItem[];
  apiKey?: string;
  hasServerKey?: boolean;
  selectedModel?: string;
  onAnalyzeWithCv: (offer: ScrapedJobOffer) => void;
  onAddToTracker: (offer: ScrapedJobOffer) => void;
  onGenerateCoverLetter?: (offer: ScrapedJobOffer) => void;
  onOpenCompanyDossier?: (companyName: string) => void;
  isDemoMode?: boolean;
}

export const JobScoutRobotView: React.FC<JobScoutRobotViewProps> = ({
  userProfile,
  userProfiles = [],
  applications = [],
  apiKey = '',
  hasServerKey = false,
  selectedModel = 'gemini-3.8-flash',
  onAnalyzeWithCv,
  onAddToTracker,
  onGenerateCoverLetter,
  onOpenCompanyDossier,
  isDemoMode = false,
}) => {
  // Liste des profils effectifs
  const effectiveProfiles = useMemo(() => {
    if (userProfiles && userProfiles.length > 0) return userProfiles;
    if (userProfile) return [userProfile];
    return [];
  }, [userProfile, userProfiles]);

  // État local des offres dénichées
  const [offers, setOffers] = useState<ScrapedJobOffer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  // Filtres
  const [activeProfileFilter, setActiveProfileFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedContract, setSelectedContract] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(65);
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'favorites' | 'applied'>('all');

  // Modales
  const [viewingOffer, setViewingOffer] = useState<ScrapedJobOffer | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Formulaire d'importation manuelle d'offre
  const [importInputType, setImportInputType] = useState<'url' | 'text'>('url');
  const [importUrl, setImportUrl] = useState<string>('');
  const [importText, setImportText] = useState<string>('');
  const [importTitle, setImportTitle] = useState<string>('');
  const [importCompany, setImportCompany] = useState<string>('');
  const [isAnalyzingImport, setIsAnalyzingImport] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Configuration de veille
  const [scoutConfig, setScoutConfig] = useState<JobScoutConfig>({
    autoScanEnabled: true,
    targetProfileIds: ['all'],
    keywords: [],
    locations: [],
    contractTypes: ['CDI', 'CDD', 'Freelance'],
    minMatchScore: 65,
    sources: ['France Travail', 'LinkedIn', 'Apec', 'Welcome to the Jungle', 'Indeed'],
  });

  // Charger les offres et la configuration au montage
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const stored = await localDbClient.getScoutedOffers();
        const conf = await localDbClient.getJobScoutConfig();

        if (isMounted) {
          setScoutConfig(conf);
          if (stored && stored.length > 0) {
            setOffers(stored);
            setLastScanTime(stored[0]?.discoveredAt || null);
          } else {
            // Si aucune offre en mémoire, lancer un premier scan de découverte automatique
            handleLaunchScout(false);
          }
        }
      } catch (err) {
        console.warn('Erreur chargement données scout :', err);
      }
    }

    loadData();

    // Écouter les mises à jour en direct
    const handleOffersUpdated = () => {
      localDbClient.getScoutedOffers().then((list) => {
        if (isMounted) setOffers(list);
      });
    };

    window.addEventListener('cv_move_scouted_offers_updated', handleOffersUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('cv_move_scouted_offers_updated', handleOffersUpdated);
    };
  }, [effectiveProfiles]);

  // Lancer le robot de recherche
  const handleLaunchScout = async (showToast = true) => {
    setIsLoading(true);
    setStatusMessage('🤖 Le Robot scrute les offres compatibles avec vos profils...');

    try {
      const discovered = await jobScoutService.scoutJobs({
        profiles: effectiveProfiles,
        activeProfileId: activeProfileFilter,
        keywords: scoutConfig.keywords.join(', '),
        location: userProfile?.location || '',
        contractTypes: scoutConfig.contractTypes,
        sources: scoutConfig.sources as JobOfferSource[],
        minScore: minScoreFilter,
        userApiKey: apiKey,
        model: selectedModel,
      });

      if (discovered && discovered.length > 0) {
        setOffers(discovered);
        await localDbClient.saveScoutedOffers(discovered);
        setLastScanTime(new Date().toISOString());
        if (showToast) {
          setStatusMessage(`🎯 ${discovered.length} opportunités ciblées sélectionnées avec succès !`);
          setTimeout(() => setStatusMessage(null), 4000);
        }
      } else {
        setStatusMessage('Aucune nouvelle offre détectée avec les critères actuels.');
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch (err) {
      console.error('Erreur scan robot :', err);
      setStatusMessage('Erreur lors de la récupération des offres.');
      setTimeout(() => setStatusMessage(null), 3500);
    } finally {
      setIsLoading(false);
    }
  };

  // Basculer l'état favori d'une offre
  const handleToggleFavorite = async (offer: ScrapedJobOffer) => {
    const nextState = !offer.isFavorite;
    await localDbClient.updateScoutedOffer(offer.id, { isFavorite: nextState });
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, isFavorite: nextState } : o))
    );
  };

  // Masquer / supprimer une offre
  const handleDeleteOffer = async (id: string) => {
    await localDbClient.deleteScoutedOffer(id);
    setOffers((prev) => prev.filter((o) => o.id !== id));
  };

  // Traiter l'analyse d'une offre importée (par URL ou texte)
  const handleAnalyzeImportedOffer = async () => {
    setIsAnalyzingImport(true);
    try {
      let fullText = importText;

      // Si URL fournie, récupérer d'abord le texte de la page
      if (importInputType === 'url' && importUrl.trim()) {
        try {
          const res = await fetch('/api/fetch-job-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: importUrl.trim() }),
          });
          if (res.ok) {
            const data = await res.json();
            fullText = data.text || '';
            if (data.title && !importTitle) setImportTitle(data.title);
          }
        } catch {
          // Si l'extraction de l'URL échoue, demander le texte
        }
      }

      if (!fullText || fullText.trim().length < 30) {
        alert("Veuillez renseigner le contenu ou le lien de l'offre d'emploi.");
        setIsAnalyzingImport(false);
        return;
      }

      // Évaluer la compatibilité avec tous les profils de l'utilisateur
      const evalResult = jobScoutService.evaluateOfferMatch(fullText, effectiveProfiles);
      setImportResult({
        ...evalResult,
        jobText: fullText,
        title: importTitle || 'Poste Détecté',
        company: importCompany || 'Entreprise Recruteuse',
        sourceUrl: importInputType === 'url' ? importUrl : undefined,
      });
    } catch (err) {
      console.error("Erreur d'analyse import :", err);
    } finally {
      setIsAnalyzingImport(false);
    }
  };

  // Enregistrer l'offre importée dans la liste du robot
  const handleSaveImportedOffer = async () => {
    if (!importResult) return;

    const newOffer: ScrapedJobOffer = {
      id: `scout-manual-${Date.now()}`,
      title: importResult.title,
      company: importResult.company,
      location: userProfile?.location || 'France',
      contractType: 'CDI',
      source: importInputType === 'url' ? 'Web' : 'Manuel',
      sourceUrl: importResult.sourceUrl,
      description: importResult.jobText,
      publishedAt: "À l'instant",
      matchedProfileId: importResult.bestProfileId,
      matchedProfileName: importResult.bestProfileName,
      relevanceScore: importResult.bestScore,
      matchingSkills: importResult.matchingSkills,
      missingSkills: importResult.missingSkills,
      aiFitSummary: importResult.aiFitSummary,
      recommendedAction: importResult.recommendedAction,
      discoveredAt: new Date().toISOString(),
      isFavorite: true,
    };

    await localDbClient.saveScoutedOffer(newOffer);
    setOffers((prev) => [newOffer, ...prev]);
    setIsImportModalOpen(false);
    setImportResult(null);
    setImportUrl('');
    setImportText('');
    setImportTitle('');
    setImportCompany('');
    setStatusMessage('✅ Offre analysée et ajoutée à votre liste du Robot !');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Vérifier si une offre est déjà dans le suivi Kanban
  const isOfferInTracker = (offer: ScrapedJobOffer): boolean => {
    return (
      offer.isApplied ||
      applications.some(
        (app) =>
          app.company.toLowerCase().trim() === offer.company.toLowerCase().trim() &&
          app.role.toLowerCase().trim() === offer.title.toLowerCase().trim()
      )
    );
  };

  // Filtrage intelligent des offres affichées
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      // Filtre profil
      if (activeProfileFilter !== 'all' && offer.matchedProfileId !== activeProfileFilter) {
        return false;
      }

      // Filtre sous-onglets
      if (activeSubTab === 'favorites' && !offer.isFavorite) return false;
      if (activeSubTab === 'applied' && !isOfferInTracker(offer)) return false;

      // Filtre texte
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          offer.title.toLowerCase().includes(q) ||
          offer.company.toLowerCase().includes(q) ||
          offer.location.toLowerCase().includes(q) ||
          (offer.matchingSkills || []).some((s) => s.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Filtre source
      if (selectedSource !== 'all' && offer.source !== selectedSource) return false;

      // Filtre contrat
      if (selectedContract !== 'all' && offer.contractType !== selectedContract) return false;

      // Filtre score
      if (offer.relevanceScore < minScoreFilter) return false;

      return true;
    });
  }, [offers, activeProfileFilter, activeSubTab, searchQuery, selectedSource, selectedContract, minScoreFilter, applications]);

  // Statistiques calculées pour le bandeau
  const stats = useMemo(() => {
    const total = offers.length;
    const favorites = offers.filter((o) => o.isFavorite).length;
    const applied = offers.filter((o) => isOfferInTracker(o)).length;
    const avgScore =
      total > 0
        ? Math.round(offers.reduce((acc, o) => acc + o.relevanceScore, 0) / total)
        : 0;

    return { total, favorites, applied, avgScore };
  }, [offers, applications]);

  // Rendu de la couleur du badge de score
  const getScoreBadgeClasses = (score: number) => {
    if (score >= 88) {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20',
        bar: 'bg-emerald-500',
        label: 'Match Exceptionnel',
      };
    }
    if (score >= 75) {
      return {
        bg: 'bg-blue-50 text-blue-800 border-blue-300 ring-blue-500/20',
        bar: 'bg-blue-500',
        label: 'Forte Adéquation',
      };
    }
    return {
      bg: 'bg-amber-50 text-amber-900 border-amber-300 ring-amber-500/20',
      bar: 'bg-amber-500',
      label: 'Adéquation Partielle',
    };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* 1. HERO HEADER DU ROBOT CHASSEUR */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-indigo-800/40">
        {/* Cercles d'ambiance et radar animé en arrière-plan */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Robot Chasseur d'Opportunités • Veille Active</span>
              {hasServerKey && (
                <span className="ml-1 text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                  Gemini Flash Connecté
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Bot className="w-8 h-8 text-cyan-400 shrink-0" />
              <span>Robot Dénicheur d'Offres Ciblées</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Le robot analyse l'ensemble de vos profils, compétences et métiers ciblés pour récupérer,
              filtrer et vous proposer une sélection sur-mesure d'opportunités à fort potentiel.
            </p>

            {/* Sélecteur de profil actif */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Profil(s) analysé(s) :
              </span>

              <button
                type="button"
                onClick={() => setActiveProfileFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeProfileFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30 ring-2 ring-cyan-300'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                🌐 Tous les profils ({effectiveProfiles.length})
              </button>

              {effectiveProfiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveProfileFilter(p.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeProfileFilter === p.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30 ring-2 ring-cyan-300'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  👤 {p.name || p.currentTitle || 'Profil'}
                </button>
              ))}
            </div>
          </div>

          {/* Boutons d'action du robot */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleLaunchScout(true)}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Scan en cours...' : 'Lancer le Robot Chasseur'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
                title="Analyser une offre par URL ou copier-coller"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-300" />
                <span>Sourcer par Lien / Texte</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
                title="Paramètres de veille du Robot"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {lastScanTime && (
              <span className="text-[11px] text-slate-400 text-center lg:text-right">
                Dernière détection : {new Date(lastScanTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Message de notification d'état */}
        {statusMessage && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-900/60 border border-cyan-500/40 text-cyan-100 text-xs flex items-center gap-2 animate-fadeIn">
            <Zap className="w-4 h-4 text-cyan-300 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* 2. STATS & KPIS BANDEAU */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Offres Détectées</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.avgScore}%</div>
            <div className="text-xs text-gray-500">Adéquation Moyenne</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.favorites}</div>
            <div className="text-xs text-gray-500">Offres Favorites</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.applied}</div>
            <div className="text-xs text-gray-500">Dans le Suivi Kanban</div>
          </div>
        </div>
      </div>

      {/* 3. BARRE DE FILTRES & RECHERCHE */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-4">
        {/* Ligne 1 : Sous-onglets & Recherche textuelle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Sous-onglets */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Toutes les offres ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('favorites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                activeSubTab === 'favorites'
                  ? 'bg-white text-amber-700 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>⭐ Favoris</span>
              <span>({stats.favorites})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('applied')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                activeSubTab === 'applied'
                  ? 'bg-white text-blue-700 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>💼 Déjà postulées</span>
              <span>({stats.applied})</span>
            </button>
          </div>

          {/* Champ de recherche */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par poste, entreprise ou compétence..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Ligne 2 : Filtres rapides par contrat, source et score */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 font-medium">Contrat :</span>
            {['all', 'CDI', 'CDD', 'Freelance'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedContract(c)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedContract === c
                    ? 'bg-blue-100 text-blue-800 font-bold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c === 'all' ? 'Tous' : c}
              </button>
            ))}

            <span className="text-gray-300 mx-1">|</span>

            <span className="text-gray-500 font-medium">Source :</span>
            {['all', 'France Travail', 'LinkedIn', 'Apec', 'Welcome to the Jungle', 'Indeed'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSource(s)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedSource === s
                    ? 'bg-indigo-100 text-indigo-800 font-bold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'Toutes sources' : s}
              </button>
            ))}
          </div>

          {/* Curseur de score minimal */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-500">Score min. :</span>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={minScoreFilter}
              onChange={(e) => setMinScoreFilter(Number(e.target.value))}
              className="w-24 accent-cyan-600"
            />
            <span className="font-bold text-cyan-700 min-w-[32px]">{minScoreFilter}%</span>
          </div>
        </div>
      </div>

      {/* 4. LISTE DES OFFRES DÉNICHÉES */}
      {filteredOffers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto">
            <Bot className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Aucune offre ne correspond à vos filtres actuels
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto">
            Tentez d'abaisser le seuil d'adéquation minimal, d'élargir la recherche ou cliquez sur le bouton
            ci-dessous pour relancer un scan du robot.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveProfileFilter('all');
                setSearchQuery('');
                setSelectedContract('all');
                setSelectedSource('all');
                setMinScoreFilter(60);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Réinitialiser les filtres
            </button>

            <button
              type="button"
              onClick={() => handleLaunchScout(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-600/20"
            >
              Lancer un nouveau scan
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOffers.map((offer) => {
            const scoreMeta = getScoreBadgeClasses(offer.relevanceScore);
            const inTracker = isOfferInTracker(offer);

            return (
              <div
                key={offer.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                {/* Ligne 1 : En-tête de l'offre (Titre, Entreprise, Badge Profil & Score) */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Badge du profil associé */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Target className="w-3 h-3 text-indigo-500" />
                        <span>Pour votre profil : {offer.matchedProfileName || 'Principal'}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700">
                        <span>{offer.source}</span>
                      </span>

                      {offer.publishedAt && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{offer.publishedAt}</span>
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {offer.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-600">
                      <span className="font-semibold text-gray-900 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {offer.company}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {offer.location}
                      </span>
                      {offer.remote && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 font-medium">{offer.remote}</span>
                        </>
                      )}
                      {offer.contractType && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800">
                            {offer.contractType}
                          </span>
                        </>
                      )}
                      {offer.salary && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-700">{offer.salary}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score de pertinence calculé par le Robot */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ring-1 ${scoreMeta.bg}`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>{offer.relevanceScore}%</span>
                      <span className="hidden sm:inline font-normal text-[11px]">({scoreMeta.label})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(offer)}
                        className={`p-2 rounded-lg transition-all ${
                          offer.isFavorite
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100'
                        }`}
                        title={offer.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Bookmark className={`w-4 h-4 ${offer.isFavorite ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Masquer cette offre"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ligne 2 : Analyse synthétique du Robot (aiFitSummary) */}
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-slate-900 font-semibold">Analyse du Robot : </strong>
                      {offer.aiFitSummary}
                    </p>
                  </div>

                  {/* Compétences alignées & Compétences à préparer */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2 pt-1">
                    {offer.matchingSkills && offer.matchingSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] font-semibold text-emerald-800">Points forts :</span>
                        {offer.matchingSkills.map((sk) => (
                          <span
                            key={sk}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-100/70 text-emerald-800"
                          >
                            <Check className="w-2.5 h-2.5" />
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}

                    {offer.missingSkills && offer.missingSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] font-semibold text-amber-800">À valoriser :</span>
                        {offer.missingSkills.map((sk) => (
                          <span
                            key={sk}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-100/70 text-amber-800"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ligne 3 : Barre d'actions rapides (Analyser CV, Ajouter Kanban, Lettre, Fiche) */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Action 1 : Lancer l'analyse d'adéquation ATS */}
                    <button
                      type="button"
                      onClick={() => onAnalyzeWithCv(offer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                      title="Pré-remplir l'Analyseur ATS avec cette offre"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Analyser avec mon CV</span>
                    </button>

                    {/* Action 2 : Ajouter au Suivi Kanban */}
                    <button
                      type="button"
                      onClick={() => onAddToTracker(offer)}
                      disabled={inTracker}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        inTracker
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                      title={inTracker ? 'Déjà dans votre Suivi' : 'Ajouter au Suivi des candidatures'}
                    >
                      {inTracker ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                      <span>{inTracker ? 'Dans le Suivi' : 'Ajouter au Suivi'}</span>
                    </button>

                    {/* Action 3 : Rédiger Lettre de motivation */}
                    {onGenerateCoverLetter && (
                      <button
                        type="button"
                        onClick={() => onGenerateCoverLetter(offer)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-all"
                        title="Rédiger une lettre de motivation ciblée pour ce poste"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        <span className="hidden sm:inline">Rédiger</span> Lettre
                      </button>
                    )}

                    {/* Action 4 : Fiche Entreprise */}
                    {onOpenCompanyDossier && (
                      <button
                        type="button"
                        onClick={() => onOpenCompanyDossier(offer.company)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-all"
                        title="Consulter le dossier d'entreprise"
                      >
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden sm:inline">Fiche</span> Entreprise
                      </button>
                    )}
                  </div>

                  {/* Consulter les détails complets de l'offre */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingOffer(offer)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-900 px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Détails complets</span>
                    </button>

                    {offer.sourceUrl && (
                      <a
                        href={offer.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                        title="Ouvrir l'annonce sur le site officiel"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODALE : DÉTAILS COMPLETS DE L'OFFRE */}
      {viewingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header modale */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4 bg-slate-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                    {viewingOffer.source}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    Pour : {viewingOffer.matchedProfileName}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">{viewingOffer.title}</h3>
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{viewingOffer.company}</span>
                  <span>•</span>
                  <span>{viewingOffer.location}</span>
                  {viewingOffer.salary && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700">{viewingOffer.salary}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingOffer(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu de l'annonce */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-800">
              {/* Carte Score & Synthèse Robot */}
              <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                    Adéquation calculée par le Robot
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-cyan-600 text-white">
                    {viewingOffer.relevanceScore}%
                  </span>
                </div>
                <p className="text-xs text-cyan-950 leading-relaxed">{viewingOffer.aiFitSummary}</p>
              </div>

              {/* Texte complet de l'offre */}
              <div className="space-y-3 prose prose-sm max-w-none">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-gray-500">
                  Descriptif de l'annonce
                </h4>
                <div className="whitespace-pre-line text-xs sm:text-sm text-gray-700 leading-relaxed font-sans bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {viewingOffer.description}
                </div>
              </div>
            </div>

            {/* Footer modale avec boutons d'action */}
            <div className="p-4 border-t border-gray-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewingOffer(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200/60"
              >
                Fermer
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const off = viewingOffer;
                    setViewingOffer(null);
                    onAddToTracker(off);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800"
                >
                  Ajouter au Suivi
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const off = viewingOffer;
                    setViewingOffer(null);
                    onAnalyzeWithCv(off);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                >
                  Analyser avec mon CV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALE : IMPORTER / SOURCER UNE OFFRE PAR URL OU TEXTE */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-cyan-600" />
                  <span>Analyser une offre externe avec le Robot</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Collez un lien d'annonce (LinkedIn, France Travail, Apec, etc.) ou le texte brut pour mesurer sa compatibilité avec vos profils.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResult(null);
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Type de saisie */}
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImportInputType('url')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    importInputType === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Lien URL de l'offre</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportInputType('text')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    importInputType === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Copier-coller le texte</span>
                </button>
              </div>

              {importInputType === 'url' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">URL de l'annonce :</label>
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/jobs/view/... ou France Travail, Apec..."
                    className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700">Titre du poste (optionnel) :</label>
                      <input
                        type="text"
                        value={importTitle}
                        onChange={(e) => setImportTitle(e.target.value)}
                        placeholder="Ex: Trésorier Opérationnel"
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700">Entreprise (optionnel) :</label>
                      <input
                        type="text"
                        value={importCompany}
                        onChange={(e) => setImportCompany(e.target.value)}
                        placeholder="Ex: Valoria Capital"
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">Texte de l'annonce :</label>
                    <textarea
                      rows={6}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Collez ici l'intégralité de l'offre d'emploi..."
                      className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Résultat de l'analyse */}
              {importResult && (
                <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-cyan-800 uppercase">Meilleur Profil Associé</span>
                      <h4 className="text-sm font-bold text-slate-900">{importResult.bestProfileName}</h4>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-sm font-extrabold bg-cyan-600 text-white">
                      {importResult.bestScore}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{importResult.aiFitSummary}</p>

                  {/* Comparatif tous les profils */}
                  {importResult.allProfileScores && importResult.allProfileScores.length > 1 && (
                    <div className="pt-2 border-t border-cyan-200/60 space-y-1">
                      <span className="text-[10px] font-semibold text-cyan-900">Score pour vos autres profils :</span>
                      <div className="flex flex-wrap gap-2">
                        {importResult.allProfileScores.map((ps: any) => (
                          <span
                            key={ps.profileId}
                            className="px-2 py-0.5 rounded bg-white text-xs font-medium text-slate-700 border border-cyan-200"
                          >
                            {ps.profileName} : <strong>{ps.score}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResult(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                Annuler
              </button>

              {!importResult ? (
                <button
                  type="button"
                  onClick={handleAnalyzeImportedOffer}
                  disabled={isAnalyzingImport}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-600/20 disabled:opacity-50"
                >
                  {isAnalyzingImport ? 'Analyse en cours...' : 'Évaluer la compatibilité'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveImportedOffer}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                >
                  Enregistrer dans ma liste du Robot
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODALE : PARAMÈTRES DE VEILLE DU ROBOT */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-600" />
                <span>Paramètres de Veille du Robot</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-700">Mots-clés prioritaires (séparés par des virgules) :</label>
                <input
                  type="text"
                  value={scoutConfig.keywords.join(', ')}
                  onChange={(e) =>
                    setScoutConfig((prev) => ({
                      ...prev,
                      keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="Ex: Trésorerie, AGICAP, Kyriba, Finance, DAF"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-700">Sources de diffusion autorisées :</label>
                <div className="grid grid-cols-2 gap-2">
                  {['France Travail', 'LinkedIn', 'Apec', 'Welcome to the Jungle', 'Indeed'].map((src) => {
                    const isChecked = scoutConfig.sources.includes(src);
                    return (
                      <label key={src} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setScoutConfig((prev) => ({
                              ...prev,
                              sources: isChecked
                                ? prev.sources.filter((s) => s !== src)
                                : [...prev.sources, src],
                            }));
                          }}
                          className="rounded text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>{src}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-700">Seuil d'adéquation minimum par défaut :</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="5"
                    value={scoutConfig.minMatchScore}
                    onChange={(e) =>
                      setScoutConfig((prev) => ({ ...prev, minMatchScore: Number(e.target.value) }))
                    }
                    className="flex-1 accent-cyan-600"
                  />
                  <span className="font-bold text-cyan-800">{scoutConfig.minMatchScore}%</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={async () => {
                  await localDbClient.saveJobScoutConfig(scoutConfig);
                  setIsSettingsModalOpen(false);
                  setStatusMessage('Paramètres de veille sauvegardés.');
                  setTimeout(() => setStatusMessage(null), 3000);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default JobScoutRobotView;
