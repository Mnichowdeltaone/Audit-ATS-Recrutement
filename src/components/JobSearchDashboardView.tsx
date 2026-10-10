import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Target,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Sparkles,
  Calendar,
  Layers,
  HelpCircle,
  Percent,
  Check,
  Send,
  Building2,
  RotateCcw,
} from 'lucide-react';
import type { ApplicationItem, AnalysisHistoryItem, UserProfile, SavedCv } from '../types';
import { DEMO_FICTITIOUS_PROFILE } from '../utils/demoData';

interface JobSearchDashboardViewProps {
  applications: ApplicationItem[];
  setApplications: React.Dispatch<React.SetStateAction<ApplicationItem[]>>;
  analyses: AnalysisHistoryItem[];
  savedCvs: SavedCv[];
  userProfile: UserProfile | null;
  isDemoMode?: boolean;
  onToggleDemoMode?: (enable: boolean) => void;
  onNavigateToTab: (tab: 'dashboard' | 'app' | 'tracker' | 'cv-assistant' | 'reports' | 'history' | 'database' | 'settings') => void;
  onOpenAnalysis?: (analysisId: string) => void;
  onSelectCvForAnalyzer?: (text: string) => void;
}

export const JobSearchDashboardView: React.FC<JobSearchDashboardViewProps> = ({
  applications,
  setApplications,
  analyses,
  savedCvs,
  userProfile,
  isDemoMode = false,
  onToggleDemoMode,
  onNavigateToTab,
  onOpenAnalysis,
  onSelectCvForAnalyzer,
}) => {
  // En mode normal, on utilise STRICTEMENT les candidatures réelles de l'utilisateur
  const effectiveApps = applications;

  // Calcul des métriques & KPIs explicatifs
  const stats = useMemo(() => {
    const total = effectiveApps.length;
    const toApply = effectiveApps.filter((a) => a.status === 'to_apply').length;
    const applied = effectiveApps.filter((a) => a.status === 'applied').length;
    const waiting = effectiveApps.filter((a) => a.status === 'waiting').length;
    const interviews = effectiveApps.filter((a) => a.status === 'interview').length;
    const offers = effectiveApps.filter((a) => a.status === 'offer').length;
    const rejected = effectiveApps.filter((a) => a.status === 'rejected').length;

    // Candidatures effectivement envoyées (appliqué, en attente, entretien, offre, rejeté)
    const sentCount = total - toApply;

    // Taux de conversion en entretien : Entretiens décrochés / Candidatures envoyées
    const interviewRate = sentCount > 0 ? Math.round((interviews / sentCount) * 100) : 0;

    // Taux d'offre : Offres reçues / Candidatures envoyées
    const offerRate = sentCount > 0 ? Math.round((offers / sentCount) * 100) : 0;

    // Calcul du score ATS moyen
    const scoredAnalyses = analyses.filter((a) => typeof a.score === 'number' && a.score > 0);
    const avgAtsScore =
      scoredAnalyses.length > 0
        ? Math.round(scoredAnalyses.reduce((sum, a) => sum + (a.score || 0), 0) / scoredAnalyses.length)
        : total > 0 ? 78 : 0;

    // Relances en attente (date de relance échue ou aujourd'hui et non faite)
    const todayStr = new Date().toISOString().split('T')[0];
    const followUpsDue = effectiveApps.filter((a) => {
      if (a.status === 'rejected' || a.status === 'offer') return false;
      if (a.checklist?.followUpDone) return false;
      return a.followUpDate && a.followUpDate <= todayStr;
    });

    // Entretiens à venir
    const upcomingInterviews = effectiveApps.filter((a) => a.status === 'interview');

    return {
      total,
      toApply,
      applied,
      waiting,
      interviews,
      offers,
      rejected,
      sentCount,
      interviewRate,
      offerRate,
      avgAtsScore,
      followUpsDue,
      upcomingInterviews,
    };
  }, [effectiveApps, analyses]);

  // Salutation personnalisée : si mode démo, affiche le candidat fictif
  const candidateName = isDemoMode
    ? 'Thomas (Démo)'
    : userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
    : 'Candidat';

  const targetTitle = isDemoMode
    ? 'Responsable Trésorerie & Finance (Fictif)'
    : userProfile?.targetRoles?.[0] || userProfile?.currentTitle || 'Recherche de poste active';

  const todayFormatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* =========================================================================
          1. BANDEAU DE BIENVENUE & SYNTHÈSE DE LA RECHERCHE EN COURS
         ========================================================================= */}
      <div className="bg-linear-to-r from-[#0A2540] via-[#133557] to-[#1E3A8A] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        {/* Cercles décoratifs d'ambiance */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#00D287]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider bg-[#00D287]/20 text-[#00D287] border border-[#00D287]/40 px-3 py-1 rounded-full">
                Tableau de Bord
              </span>
              <span className="text-xs text-slate-300 capitalize">{todayFormatted}</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
              Bonjour {candidateName} ! 👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
              Voici le point complet sur votre recherche d&apos;emploi en cours pour{' '}
              <strong className="text-white font-extrabold">{targetTitle}</strong>. Mesurez vos résultats, priorisez vos actions du jour et peaufinez vos candidatures.
            </p>
          </div>

          {/* Raccourcis d'actions immédiates */}
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateToTab('cv-assistant')}
              className="px-4 py-2.5 bg-[#00D287] hover:bg-[#00c07a] text-[#0A2540] rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Créer un CV brut (Page blanche)</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToTab('app')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-xs"
            >
              <Target className="w-4 h-4 text-emerald-300" />
              <span>Tester un CV face à une offre</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerte si Mode Démonstration Actif */}
      {isDemoMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Mode Démonstration Actif :</strong> Vous visualisez les KPIs et candidatures du profil exemple <strong>Thomas Laurent</strong>. Vos données réelles sont soigneusement protégées et isolées.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleDemoMode?.(false)}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold text-[11px] cursor-pointer transition-all"
            >
              Quitter la Démo & Revenir à mes données
            </button>
          </div>
        </div>
      )}

      {/* Message d'accueil bienveillant si l'utilisateur n'a encore aucune candidature réelle */}
      {!isDemoMode && effectiveApps.length === 0 && (
        <div className="bg-white border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-gray-700 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                Votre espace personnel est prêt !
              </h3>
              <p className="text-gray-500 mt-0.5">
                Vous n&apos;avez pas encore de candidatures enregistrées. Ajoutez votre première opportunité ou testez l&apos;application avec un jeu de données fictif.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigateToTab('tracker')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter ma 1ère candidature</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleDemoMode?.(true)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Explorer la démo (Profil fictif)</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. LES 4 GRANDS KPIS EXPLICATIFS ET PERTINENTS
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00D287]" />
            <h2 className="text-sm sm:text-base font-extrabold text-[#0A2540]">
              Indicateurs Clés de Performance (KPIs)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('reports')}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>Voir le rapport complet & justificatifs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1 : Candidatures Actives & Envois */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                1. Candidatures Suivies
              </span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Briefcase className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#0A2540]">{stats.total}</span>
                <span className="text-xs text-slate-500 font-medium">candidatures</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                <span className="text-emerald-700 font-bold">✓ {stats.sentCount} envoyées</span>
                <span>•</span>
                <span className="text-amber-700 font-bold">{stats.toApply} à postuler</span>
              </div>
            </div>

            {/* Note explicative du KPI */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed bg-slate-50 -mx-5 -mb-5 p-3 rounded-b-3xl">
              💡 <strong>Ce que ce KPI mesure :</strong> L&apos;ampleur de votre présence active sur le marché de l&apos;emploi. Visez 3 à 5 candidatures très qualitatives par semaine.
            </div>
          </div>

          {/* KPI 2 : Taux de Conversion en Entretien */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                2. Taux de Conversion Entretien
              </span>
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Percent className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-700">{stats.interviewRate}%</span>
                <span className="text-xs text-slate-500 font-medium">({stats.interviews} décrochés)</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                {stats.interviewRate >= 15 ? (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    🔥 Excellent (Marché : ~10-15%)
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                    🎯 En progression (Marché : ~10%)
                  </span>
                )}
              </div>
            </div>

            {/* Note explicative du KPI */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed bg-slate-50 -mx-5 -mb-5 p-3 rounded-b-3xl">
              💡 <strong>Ce que ce KPI mesure :</strong> Le ratio entretiens/envois. Un taux supérieur à 15% prouve que vos CVs passent les filtres ATS et séduisent les recruteurs.
            </div>
          </div>

          {/* KPI 3 : Score ATS Moyen */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                3. Score ATS Moyen des CVs
              </span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Target className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-700">{stats.avgAtsScore}/100</span>
                <span className="text-xs text-slate-500 font-medium">adéquation</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-bold text-emerald-700">✓ Filtres franchis</span>
                <span>•</span>
                <span>Mots-clés ciblés</span>
              </div>
            </div>

            {/* Note explicative du KPI */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed bg-slate-50 -mx-5 -mb-5 p-3 rounded-b-3xl">
              💡 <strong>Ce que ce KPI mesure :</strong> La lisibilité sémantique de vos CVs par les logiciels de recrutement. Au-dessus de 75/100, votre dossier est mis en haut de la pile.
            </div>
          </div>

          {/* KPI 4 : Relances à Effectuer */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                4. Relances & Suivi à J+7
              </span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-700">{stats.followUpsDue.length}</span>
                <span className="text-xs text-slate-500 font-medium">à relancer cette semaine</span>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {stats.followUpsDue.length > 0 ? (
                  <span className="text-amber-800 font-bold">⚡ Relance recommandée à J+7</span>
                ) : (
                  <span className="text-emerald-700 font-bold">✓ Aucune relance en retard</span>
                )}
              </div>
            </div>

            {/* Note explicative du KPI */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed bg-slate-50 -mx-5 -mb-5 p-3 rounded-b-3xl">
              💡 <strong>Ce que ce KPI mesure :</strong> La proactivité de votre démarche. Relancer un recruteur à J+7 multiplie par 2 les chances d&apos;obtenir un retour concret.
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. ENTONNOIR DE CONVERSION VISUEL (PIPELINE DE RECRUTEMENT)
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#0A2540]">
              Entonnoir de Conversion des Candidatures (Pipeline)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Total suivi : <strong>{stats.total} opportunités</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Étape 1 : À postuler */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">1. À Postuler</span>
            <div className="text-xl font-black text-slate-800">{stats.toApply}</div>
            <p className="text-[11px] text-slate-500">Offres repérées à calibrer</p>
          </div>

          {/* Étape 2 : Postulé */}
          <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-blue-700 block">2. Postulé / Envoyé</span>
            <div className="text-xl font-black text-blue-900">{stats.applied}</div>
            <p className="text-[11px] text-blue-600">CV & Lettre transmis</p>
          </div>

          {/* Étape 3 : En attente / Relance */}
          <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">3. En attente (J+7)</span>
            <div className="text-xl font-black text-amber-900">{stats.waiting}</div>
            <p className="text-[11px] text-amber-600">En cours d&apos;examen RH</p>
          </div>

          {/* Étape 4 : Entretiens */}
          <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-purple-700 block">4. Entretiens</span>
            <div className="text-xl font-black text-purple-900">{stats.interviews}</div>
            <p className="text-[11px] text-purple-600">RH, Managers, Technique</p>
          </div>

          {/* Étape 5 : Offres */}
          <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">5. Offres / Succès</span>
            <div className="text-xl font-black text-emerald-900">{stats.offers}</div>
            <p className="text-[11px] text-emerald-600">Propositions finales reçues</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. ACTIONS DU JOUR & CANDIDATURES RÉCENTES
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne Gauche : Actions & Relances Prioritaires (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-extrabold text-[#0A2540]">
                  Actions & Relances du Jour
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {stats.followUpsDue.length} prioritaires
              </span>
            </div>

            {stats.followUpsDue.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">
                  Toutes vos relances sont à jour !
                </p>
                <p className="text-[11px] text-slate-500">
                  Aucune candidature ne nécessite de suivi immédiat aujourd&apos;hui.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.followUpsDue.slice(0, 3).map((app) => (
                  <div
                    key={app.id}
                    className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">
                        {app.company}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">{app.role}</div>
                      <div className="text-[10px] text-amber-800 font-semibold mt-0.5">
                        📅 Postulé le {app.appliedDate || 'récemment'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('tracker')}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Relancer ➔
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Raccourci vers le Kanban complet */}
            <button
              type="button"
              onClick={() => onNavigateToTab('tracker')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0A2540] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Accéder au Tableau Kanban complet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Encart incitatif : Création de CV Brut */}
          <div className="bg-linear-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs sm:text-sm font-extrabold text-[#0A2540]">
                Besoin d&apos;un nouveau CV ?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Partez d&apos;une <strong>page blanche</strong> avec notre assistant simplifié pour générer rapidement un CV brut propre, prêt à être enrichi et optimisé pour chaque offre.
            </p>
            <button
              type="button"
              onClick={() => onNavigateToTab('cv-assistant')}
              className="w-full py-2.5 bg-[#0A2540] hover:bg-[#133557] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-[#00D287]" />
              <span>Démarrer un CV brut sur page blanche</span>
            </button>
          </div>
        </div>

        {/* Colonne Droite : Dernières Candidatures & Derniers Audits (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Bloc 1 : Dernières Candidatures en cours */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-extrabold text-[#0A2540]">
                  Dernières Candidatures en Cours ({effectiveApps.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('tracker')}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Tout voir</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {effectiveApps.slice(0, 4).map((app) => (
                <div
                  key={app.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#0A2540] truncate">
                        {app.company}
                      </span>
                      {app.score && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.2 rounded-full border border-emerald-100 shrink-0">
                          ATS : {app.score}/100
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{app.role}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        app.status === 'interview'
                          ? 'bg-purple-100 text-purple-800'
                          : app.status === 'offer'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'waiting'
                          ? 'bg-amber-100 text-amber-800'
                          : app.status === 'to_apply'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {app.status === 'interview' && 'Entretien'}
                      {app.status === 'offer' && 'Offre'}
                      {app.status === 'waiting' && 'En attente'}
                      {app.status === 'to_apply' && 'À postuler'}
                      {app.status === 'applied' && 'Postulé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloc 2 : Derniers Audits d'Adéquation ATS */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs sm:text-sm font-extrabold text-[#0A2540]">
                  Derniers Audits d&apos;Adéquation ATS ({analyses.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('history')}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Historique complet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {analyses.length === 0 ? (
              <div className="p-5 bg-slate-50 rounded-2xl text-center space-y-2">
                <p className="text-xs text-slate-600">
                  Aucun audit d&apos;adéquation réalisé pour le moment.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('app')}
                  className="px-3.5 py-1.5 bg-[#0A2540] hover:bg-[#133557] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Lancer mon premier audit d&apos;offre
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {analyses.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-[#0A2540] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.role || item.company || 'Audit de compatibilité'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.score && (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                          {item.score}/100
                        </span>
                      )}
                      {onOpenAnalysis && (
                        <button
                          type="button"
                          onClick={() => onOpenAnalysis(item.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Ouvrir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobSearchDashboardView;
