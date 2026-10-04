import React, { useState, useMemo } from 'react';
import {
  X,
  Trophy,
  Target,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
  Briefcase,
  Copy,
  Check,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  HelpCircle,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseAnalysisResult, ParsedAnalysis } from '../utils/analysisParser';
import CvEvolutionTracker from './CvEvolutionTracker';
import { EvolutionStep } from '../types';

interface VisualAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawAnalysisText: string;
  cvText: string;
  jobText: string;
  defaultTab?: 'report' | 'evolution';
  evolutionSteps?: EvolutionStep[];
  currentVersion?: number;
  onOpenCvOptimization?: () => void;
  onAddToTracker?: () => void;
  onNavigateToCvAssistant?: () => void;
  onTriggerReAnalysis?: () => void;
  onRestoreCv?: (cvText: string, stepTitle: string) => void;
}

export default function VisualAnalysisModal({
  isOpen,
  onClose,
  rawAnalysisText,
  cvText,
  jobText,
  defaultTab = 'report',
  evolutionSteps = [],
  currentVersion = 1,
  onOpenCvOptimization,
  onAddToTracker,
  onNavigateToCvAssistant,
  onTriggerReAnalysis,
  onRestoreCv,
}: VisualAnalysisModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'report' | 'evolution'>(defaultTab);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<'all' | 'matched' | 'missing' | 'partial'>('all');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(1);

  // Synchroniser avec defaultTab si changement
  React.useEffect(() => {
    if (isOpen) {
      setActiveModalTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Parser les données une fois
  const parsed: ParsedAnalysis = useMemo(() => {
    return parseAnalysisResult(rawAnalysisText, cvText, jobText);
  }, [rawAnalysisText, cvText, jobText]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtrer les compétences de la matrice
  const filteredSkills = parsed.skillsBreakdown.filter((s) => {
    if (selectedSkillFilter === 'all') return true;
    return s.status === selectedSkillFilter;
  });

  // Déterminer la couleur de la jauge
  const score = parsed.globalScore;
  const scoreColor =
    score >= 80 ? 'text-emerald-500 stroke-emerald-500' : score >= 60 ? 'text-amber-500 stroke-amber-500' : 'text-rose-500 stroke-rose-500';
  const scoreBg =
    score >= 80 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : score >= 60 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-800 border-rose-200';

  // Calcul circonférence du cercle SVG (rayon 42 -> 2 * PI * 42 = 263.89)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in print:p-0 print:bg-white print:static">
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-gray-200 w-full overflow-hidden flex flex-col transition-all duration-300 print:shadow-none print:border-none print:w-full print:rounded-none ${
          isFullScreen ? 'h-full max-w-full m-0 rounded-none' : 'max-w-6xl max-h-[92vh] my-auto'
        }`}
      >
        {/* =========================================================================
            1. TOP BAR AVEC TITRE, ACTIONS & CONTRÔLES
           ========================================================================= */}
        <div className="px-6 py-4 bg-linear-to-r from-gray-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between gap-4 border-b border-gray-800 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full text-amber-300 border border-white/20">
                  Rapport Visuel & KPIs ATS
                </span>
                {parsed.company && (
                  <span className="text-[10px] font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded-full">
                    🏢 {parsed.company}
                  </span>
                )}
                {parsed.cabinet && (
                  <span className="text-[10px] font-extrabold bg-purple-500/30 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full">
                    👔 {parsed.cabinet}
                  </span>
                )}
                {parsed.isHorodatedOnly && (
                  <span className="text-[10px] font-medium bg-amber-500/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full">
                    🕒 {parsed.horodatage}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate leading-tight mt-0.5">
                {parsed.suggestedTitle || `${parsed.targetRole} chez ${parsed.targetCompany}`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bouton Imprimer / PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-all cursor-pointer"
              title="Imprimer ou enregistrer en PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Bouton Copier la synthèse */}
            <button
              type="button"
              onClick={() => copyToClipboard(rawAnalysisText, 'full')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-all cursor-pointer"
              title="Copier tout le rapport au format texte"
            >
              {copiedSection === 'full' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Bouton Plein Écran */}
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-all cursor-pointer hidden md:block"
              title={isFullScreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-rose-600 text-white transition-all cursor-pointer ml-1"
              title="Fermer cette fenêtre"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            SOUS-BARRE DE NAVIGATION : RAPPORT VISUEL VS SUIVI DES ÉVOLUTIONS
           ========================================================================= */}
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 print:hidden flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveModalTab('report')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeModalTab === 'report'
                  ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>Tableau de Bord & KPIs ATS 📊</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModalTab('evolution')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeModalTab === 'evolution'
                  ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Suivi des Évolutions CV & Analyse 📈</span>
              <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                V{currentVersion} • {evolutionSteps.length > 0 ? `${evolutionSteps.length} étapes` : '1 étape'}
              </span>
            </button>
          </div>

          <div className="text-xs text-gray-300 hidden sm:flex items-center gap-2">
            <span className="text-gray-400">Score de compatibilité :</span>
            <span
              className={`font-black px-2.5 py-0.5 rounded-lg text-xs ${
                score >= 80
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                  : score >= 60
                  ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
                  : 'bg-rose-950 text-rose-300 border border-rose-700/50'
              }`}
            >
              {score} / 100
            </span>
          </div>
        </div>

        {/* =========================================================================
            2. CONTENU DU TABLEAU DE BORD OU DU SUIVI DES ÉVOLUTIONS
           ========================================================================= */}
        {activeModalTab === 'evolution' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
            <CvEvolutionTracker
              steps={evolutionSteps}
              currentVersion={currentVersion}
              currentCvText={cvText}
              targetRole={parsed.targetRole}
              companyName={parsed.targetCompany}
              onRestoreCv={onRestoreCv || (() => {})}
              onOpenAnalysisModal={() => setActiveModalTab('report')}
              onTriggerReAnalysis={onTriggerReAnalysis}
              onOpenOptimizationModal={onOpenCvOptimization}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 bg-gray-50/50">
            {/* Bannière Découverte de l'évolution si plusieurs versions */}
            {evolutionSteps.length > 1 && (
              <div
                onClick={() => setActiveModalTab('evolution')}
                className="bg-linear-to-r from-purple-900 via-indigo-900 to-emerald-900 border border-purple-400/30 rounded-3xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm cursor-pointer hover:border-emerald-400/50 transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    📈
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                        Historique Actif
                      </span>
                      <span className="text-xs text-purple-200">
                        Version courante : <strong>V{currentVersion}</strong> ({evolutionSteps.length} étapes)
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white mt-0.5">
                      Visualisez la frise chronologique complète et le comparateur avant / après
                    </h4>
                  </div>
                </div>

                <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5 shrink-0 group-hover:translate-x-1 transition-transform">
                  <span>Accéder à la frise</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* A. BANNIÈRE HERO SCORE & KPIS CLÉS */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Jauge Radiale de Score */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-linear-to-b from-gray-50 to-white rounded-2xl border border-gray-100 text-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Score de compatibilité global
                </span>

                <div className="relative flex items-center justify-center w-36 h-36">
                  <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="text-gray-100 stroke-current"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className={`stroke-current transition-all duration-1000 ease-out ${scoreColor}`}
                      strokeWidth="9"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                      {score}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400">sur 100</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${scoreBg}`}>
                    {score >= 80 ? '🌟 Tier 1 • Profil Recommandé' : score >= 60 ? '⚠️ Tier 2 • Profil Partiel' : '❌ Tier 3 • Écarts Importants'}
                  </span>
                  <p className="text-[11px] text-gray-600 font-medium max-w-xs">
                    {parsed.scoreLabel}
                  </p>
                </div>
              </div>

              {/* 4 Cartes KPIs Express */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-linear-to-br from-indigo-50/80 to-purple-50/40 rounded-2xl border border-indigo-100 flex items-start gap-3.5 shadow-2xs">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider block">
                      Filtres ATS & Parsing
                    </span>
                    <div className="text-xl font-black text-indigo-950 mt-0.5">
                      {parsed.kpis.atsPassProbability}%
                    </div>
                    <span className="text-[11px] text-indigo-800 font-medium">
                      Probabilité de franchir le tri automatique des robots ATS.
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-linear-to-br from-emerald-50/80 to-teal-50/40 rounded-2xl border border-emerald-100 flex items-start gap-3.5 shadow-2xs">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider block">
                      Couverture Mots-Clés
                    </span>
                    <div className="text-xl font-black text-emerald-950 mt-0.5">
                      {parsed.kpis.keywordMatchRate}%
                    </div>
                    <span className="text-[11px] text-emerald-800 font-medium">
                      Mots-clés indispensables détectés dans votre texte.
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-linear-to-br from-amber-50/80 to-orange-50/40 rounded-2xl border border-amber-100 flex items-start gap-3.5 shadow-2xs">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider block">
                      Temps de Lecture RH
                    </span>
                    <div className="text-xl font-black text-amber-950 mt-0.5">
                      {parsed.kpis.recruiterReadTime}
                    </div>
                    <span className="text-[11px] text-amber-800 font-medium">
                      Temps estimé avant décision de sélection humaine.
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-linear-to-br from-blue-50/80 to-cyan-50/40 rounded-2xl border border-blue-100 flex items-start gap-3.5 shadow-2xs">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider block">
                      Chance d&apos;Entretien
                    </span>
                    <div className="text-xl font-black text-blue-950 mt-0.5">
                      {parsed.kpis.interviewChance}%
                    </div>
                    <span className="text-[11px] text-blue-800 font-medium">
                      {score >= 80 ? 'Excellente opportunité d’être reçu en entretien.' : 'Nécessite d’adapter 2-3 mots-clés clés.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* B. GRAPHIQUE DES 5 PILIERS D'ÉVALUATION (BARRES DE NIVEAU MULTIAXES) */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Décomposition de la Note sur les 5 Piliers Recruteur 📈
                  </h3>
                  <p className="text-xs text-gray-500">
                    Audit multidimensionnel pour identifier vos axes de domination et vos marges de progression.
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full w-fit">
                Benchmark Marché 2026
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 pt-1">
              {parsed.axisScores.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                      <span>{idx + 1}.</span>
                      <span>{item.axis}</span>
                    </span>
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded-md ${
                        item.score >= 85
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.score >= 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.score}%
                    </span>
                  </div>

                  {/* Barre de progression avec animation */}
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200/60">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        item.score >= 85
                          ? 'bg-linear-to-r from-emerald-500 to-teal-500'
                          : item.score >= 70
                          ? 'bg-linear-to-r from-amber-400 to-orange-400'
                          : 'bg-linear-to-r from-rose-500 to-red-500'
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-gray-500 font-medium">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* C. MATRICE VISUELLE DES COMPÉTENCES & MOTS-CLÉS ATS */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>Matrice de Correspondance des Mots-Clés & Compétences 🎯</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ce que l&apos;annonce recherche précisément vs ce qui est détecté dans votre CV.
                </p>
              </div>

              {/* Filtres de la matrice */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedSkillFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSkillFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tous ({parsed.skillsBreakdown.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSkillFilter('matched')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSkillFilter === 'matched' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  ✅ Validés ({parsed.skillsBreakdown.filter((s) => s.status === 'matched').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSkillFilter('missing')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSkillFilter === 'missing' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  ❌ Manquants ({parsed.skillsBreakdown.filter((s) => s.status === 'missing').length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredSkills.map((skill, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                    skill.status === 'matched'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : skill.status === 'missing'
                      ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">
                      {skill.status === 'matched' ? '✅' : skill.status === 'missing' ? '❌' : '⚠️'}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-xs truncate block">
                        {skill.name}
                      </span>
                      <span className="text-[10px] opacity-75 block">
                        {skill.status === 'matched'
                          ? 'Présent dans le CV'
                          : skill.status === 'missing'
                          ? 'Absent (Filtre éliminatoire)'
                          : 'Partiellement détecté'}
                      </span>
                    </div>
                  </div>

                  {skill.status === 'missing' && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(skill.name, `skill-${idx}`)}
                      className="px-2 py-1 bg-white hover:bg-rose-100 border border-rose-300 text-rose-900 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer shadow-2xs"
                      title="Copier ce mot-clé pour l'ajouter à votre CV"
                    >
                      {copiedSection === `skill-${idx}` ? 'Copié !' : '+ Copier'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* D. CARTES VISUELLES : POINTS FORTS (3 ADÉQUATIONS PARFAITES) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Vos 3 Pépites : Points Forts Majeurs Valorisés 💎
                </h3>
                <p className="text-xs text-gray-500">
                  Ces éléments déclenchent un signal positif direct chez le recruteur.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {parsed.strengths.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-3xl border border-emerald-200/80 p-5 shadow-xs flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-emerald-400 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {item.category || 'Atout Clé'}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-gray-900 leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-xs text-gray-600 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-emerald-50 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Validé pour l&apos;entretien</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* E. CARTES VISUELLES : POINTS FAIBLES & STRATÉGIE ATS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Points faibles / Manques */}
            <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
                <span className="p-1.5 bg-rose-100 text-rose-800 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    Écarts Détectés & Points de Vigilance ⚠️
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Les critères qui pourraient freiner l&apos;algorithme ou le recruteur.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {parsed.weaknesses.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-rose-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-900 text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>{item.title}</span>
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-200/70 text-rose-900 px-2 py-0.5 rounded-full">
                        {item.severity === 'critical' ? 'Critique' : 'Secondaire'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stratégie de CV & Mots-clés */}
            <div className="bg-white rounded-3xl border border-purple-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-purple-100 pb-3">
                <span className="p-1.5 bg-purple-100 text-purple-800 rounded-xl">
                  <Lightbulb className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    Actions Immédiates : Stratégie de CV 🚀
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Conseils pratiques pour modifier votre CV en 2 minutes et maximiser le score.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {parsed.strategies.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-1.5"
                  >
                    <span className="font-extrabold text-xs text-purple-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-900 text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span>{item.title}</span>
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed font-normal">
                      {item.advice}
                    </p>
                  </div>
                ))}

                {onOpenCvOptimization && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCvOptimization();
                    }}
                    className="w-full mt-2 py-2.5 px-4 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer hover:scale-102"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Lancer l&apos;Optimiseur Intelligent de CV</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* F. PRÉPARATION D'ENTRETIEN : 3 QUESTIONS PIÈGES & PISTES DE RÉPONSE */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <HelpCircle className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Préparation aux Entretiens : 3 Questions Pièges Anticipées 🎙️
                  </h3>
                  <p className="text-xs text-gray-500">
                    Les interrogations que le recruteur aura en tête par rapport à vos écarts.
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                Méthode STAR recommandée
              </span>
            </div>

            <div className="space-y-3">
              {parsed.interviewQuestions.map((q) => {
                const isExpanded = expandedQuestion === q.id;
                return (
                  <div
                    key={q.id}
                    className="border border-gray-200 rounded-2xl overflow-hidden transition-all bg-gray-50/60"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                      className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-gray-100/70 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          Q{q.id}
                        </span>
                        <span className="font-extrabold text-xs sm:text-sm text-gray-900 truncate">
                          « {q.question} »
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            q.difficulty === 'difficile'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Piste de réponse suggérée (Méthode STAR) :</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed font-normal bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                          {q.tip}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* G. ACCROCHE DE LETTRE DE MOTIVATION ULTRA-PERSONNALISÉE */}
          <div className="bg-linear-to-r from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-6 text-white shadow-md space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-300" />
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Accroche personnalisée pour votre Lettre ou Email
                </h4>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(parsed.coverLetterHook, 'hook')}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedSection === 'hook' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'hook' ? 'Copié !' : 'Copier l’accroche'}</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-purple-100 italic leading-relaxed bg-white/10 p-4 rounded-2xl border border-white/20">
              « {parsed.coverLetterHook} »
            </p>
          </div>
        </div>
        )}

        {/* =========================================================================
            3. PIED DE PAGE : ACTIONS RAPIDES
           ========================================================================= */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Rapport généré et sécurisé dans votre base locale.</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onAddToTracker && (
              <button
                type="button"
                onClick={() => {
                  onAddToTracker();
                  confetti({ particleCount: 40, spread: 60 });
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-102"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>+ Suivre dans mon Kanban</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
