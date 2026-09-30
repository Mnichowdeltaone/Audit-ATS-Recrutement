import React, { useState } from 'react';
import {
  TrendingUp,
  History,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  RotateCcw,
  Copy,
  Check,
  FileText,
  Briefcase,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  Award,
  Layers,
  Zap,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EvolutionStep } from '../types';

interface CvEvolutionTrackerProps {
  steps: EvolutionStep[];
  currentVersion: number;
  currentCvText: string;
  targetRole?: string;
  companyName?: string;
  onRestoreCv: (cvText: string, stepTitle: string) => void;
  onOpenAnalysisModal?: (analysisResult: string) => void;
  onTriggerReAnalysis?: () => void;
  onOpenOptimizationModal?: () => void;
  isLoading?: boolean;
}

export default function CvEvolutionTracker({
  steps = [],
  currentVersion = 1,
  currentCvText,
  targetRole = 'Offre analysée',
  companyName = 'Entreprise',
  onRestoreCv,
  onOpenAnalysisModal,
  onTriggerReAnalysis,
  onOpenOptimizationModal,
  isLoading = false,
}: CvEvolutionTrackerProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [compareStepId, setCompareStepId] = useState<string | null>(null);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [copiedCv, setCopiedCv] = useState(false);

  // Trier les étapes chronologiquement
  const sortedSteps = [...steps].sort((a, b) => a.version - b.version);

  // Scores initial et le plus récent
  const firstAnalysisStep = sortedSteps.find((s) => s.score !== null);
  const lastAnalysisStep = [...sortedSteps].reverse().find((s) => s.score !== null);

  const initialScore = firstAnalysisStep?.score ?? null;
  const currentScore = lastAnalysisStep?.score ?? null;
  const totalGain =
    currentScore !== null && initialScore !== null ? currentScore - initialScore : 0;

  // Étape sélectionnée pour le détail
  const activeStep = sortedSteps.find((s) => s.id === selectedStepId) || lastAnalysisStep || sortedSteps[0];
  const compareStep = sortedSteps.find((s) => s.id === compareStepId) || firstAnalysisStep || sortedSteps[0];

  const handleCopyCv = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCv(true);
    setTimeout(() => setCopiedCv(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-0">
      {/* =========================================================================
          1. HEADER AVEC GAIN DE SCORE & RÉSUMÉ DU SUIVI
         ========================================================================= */}
      <div className="bg-linear-to-r from-gray-900 via-indigo-950 to-purple-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Suivi des Évolutions CV & Analyse
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-purple-200 font-semibold">
              {sortedSteps.length} étape(s) enregistrée(s)
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
            Parcours d&apos;Amélioration Continue pour « {targetRole} »
          </h3>

          <p className="text-xs text-purple-100 max-w-2xl leading-relaxed">
            Retrouvez chaque itération de votre CV : premier audit, traitement des recommandations, et nouvelles analyses avec calcul automatique du gain de score.
          </p>
        </div>

        {/* Bloc Gain de Score Global */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0 relative z-10">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-gray-300 block">
              Audit Initial (V1)
            </span>
            <span className="text-xl font-black text-white">
              {initialScore !== null ? `${initialScore}%` : 'N/A'}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <ArrowRight className="w-5 h-5 text-amber-300" />
            {totalGain > 0 && (
              <span className="text-[10px] font-black text-emerald-300 bg-emerald-900/60 px-1.5 py-0.5 rounded-full mt-0.5">
                +{totalGain} pts
              </span>
            )}
          </div>

          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">
              Version Actuelle
            </span>
            <span className="text-2xl font-black text-amber-300">
              {currentScore !== null ? `${currentScore}%` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. FRISE CHRONOLOGIQUE DES ÉTAPES (TIMELINE INTERACTIVE)
         ========================================================================= */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h4 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <span>Frise Chronologique des Étapes de Traitement</span>
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Cliquez sur une étape pour consulter le CV associé, ses recommandations ou comparer l&apos;évolution.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenOptimizationModal && (
              <button
                type="button"
                onClick={onOpenOptimizationModal}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Adapter mon CV avec l&apos;IA</span>
              </button>
            )}

            {onTriggerReAnalysis && (
              <button
                type="button"
                onClick={() => {
                  onTriggerReAnalysis();
                  confetti({ particleCount: 40, spread: 60 });
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Analyse en cours...' : '🔄 Re-analyser ce CV (Créer V' + (sortedSteps.length + 1) + ')'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Timeline verticale */}
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-gray-200 before:pointer-events-none">
          {sortedSteps.map((step, idx) => {
            const isSelected = activeStep?.id === step.id;
            const isInitial = step.type === 'initial_analysis';
            const isTreated = step.type === 'recommendations_applied';
            const isReAnalysis = step.type === 're_analysis';

            return (
              <div
                key={step.id}
                className={`relative flex items-start gap-4 pl-1 sm:pl-2 group transition-all`}
              >
                {/* Pastille circulaire */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs z-10 transition-transform group-hover:scale-110 ${
                    isInitial
                      ? 'bg-blue-600 text-white'
                      : isTreated
                      ? 'bg-purple-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isInitial ? 'V1' : isTreated ? '⚡' : `V${step.version}`}
                </div>

                {/* Carte d'étape */}
                <div
                  onClick={() => setSelectedStepId(step.id)}
                  className={`flex-1 p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-purple-400 shadow-md ring-2 ring-purple-100'
                      : 'bg-gray-50/70 border-gray-200 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isInitial
                              ? 'bg-blue-100 text-blue-800'
                              : isTreated
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isInitial
                            ? '1. Première analyse (Audit Initial)'
                            : isTreated
                            ? '2. Traitement des recommandations'
                            : `3. Nouvelle analyse (Version optimisée V${step.version})`}
                        </span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{step.timestamp}</span>
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-gray-900 mt-1">
                        {step.title}
                      </h5>
                    </div>

                    {/* Badge de Score & Delta */}
                    {step.score !== null && (
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {step.scoreDelta !== undefined && step.scoreDelta !== 0 && (
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-full ${
                              step.scoreDelta > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {step.scoreDelta > 0 ? `+${step.scoreDelta}` : step.scoreDelta} pts
                          </span>
                        )}
                        <div
                          className={`px-3 py-1 rounded-xl font-black text-sm text-white ${
                            step.score >= 80
                              ? 'bg-emerald-600'
                              : step.score >= 60
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        >
                          {step.score}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions / modifications effectuées */}
                  <div className="pt-3 space-y-2">
                    {step.summaryNote && (
                      <p className="text-xs text-gray-700 italic">
                        « {step.summaryNote} »
                      </p>
                    )}

                    {step.changesApplied && step.changesApplied.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {step.changesApplied.map((ch, cIdx) => (
                          <span
                            key={cIdx}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-gray-200 text-gray-700 px-2.5 py-0.5 rounded-lg shadow-2xs"
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{ch}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Raccourcis d'action sur l'étape */}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStepId(step.id);
                        }}
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Consulter le CV ({step.cvText ? Math.round(step.cvText.length / 5) : 0} mots)</span>
                      </button>

                      {step.analysisResult && onOpenAnalysisModal && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAnalysisModal(step.analysisResult!);
                          }}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Rapport d&apos;Analyse Visuel</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreCv(step.cvText, step.title);
                        }}
                        className="text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                        title="Restaurer ce texte dans la zone de saisie du CV actif"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restaurer ce CV</span>
                      </button>

                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStepId(step.id);
                            setCompareStepId(sortedSteps[idx - 1].id);
                            setIsDiffOpen(true);
                          }}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                        >
                          <span>⚖️ Comparer avec V{sortedSteps[idx - 1].version}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* =========================================================================
            3. DÉTAIL DU CV SÉLECTIONNÉ DANS LA TIMELINE
           ========================================================================= */}
        {activeStep && (
          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                  Aperçu du document
                </span>
                <h5 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <span>Texte du CV - {activeStep.title}</span>
                  {activeStep.score !== null && (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Score : {activeStep.score}%
                    </span>
                  )}
                </h5>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCv(activeStep.cvText)}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedCv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCv ? 'Copié !' : 'Copier ce CV'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRestoreCv(activeStep.cvText, activeStep.title)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Charger ce CV dans l&apos;Analyseur</span>
                </button>
              </div>
            </div>

            <pre className="text-xs font-mono text-gray-700 bg-white p-4 rounded-2xl border border-gray-200 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {activeStep.cvText}
            </pre>
          </div>
        )}

        {/* =========================================================================
            4. MODAL / TIROIR DE COMPARAISON AVANT / APRÈS (DIFF)
           ========================================================================= */}
        {isDiffOpen && activeStep && compareStep && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-5xl w-full p-6 space-y-5 animate-scale-up">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h4 className="font-black text-base text-gray-900 flex items-center gap-2">
                    <span>⚖️ Comparateur d&apos;Évolution : {compareStep.title} vs {activeStep.title}</span>
                  </h4>
                  <p className="text-xs text-gray-500">
                    Visualisez les améliorations apportées entre les deux étapes de traitement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDiffOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Comparaison de Score */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-purple-50/70 border border-purple-200 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">Version Initiale</span>
                  <div className="text-lg font-black text-gray-900">{compareStep.score ?? 'N/A'}%</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-600 uppercase block">Version Traitée</span>
                  <div className="text-lg font-black text-purple-700">{activeStep.score ?? 'N/A'}%</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Gain Net</span>
                  <div className="text-lg font-black text-emerald-700">
                    {activeStep.score !== null && compareStep.score !== null
                      ? `+${activeStep.score - compareStep.score} pts`
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Côte à côte des textes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-700 block">
                    Avant : {compareStep.title}
                  </span>
                  <pre className="text-[11px] font-mono text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200 h-80 overflow-y-auto whitespace-pre-wrap">
                    {compareStep.cvText}
                  </pre>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-purple-900 block">
                    Après : {activeStep.title}
                  </span>
                  <pre className="text-[11px] font-mono text-purple-950 bg-purple-50/40 p-3 rounded-xl border border-purple-200 h-80 overflow-y-auto whitespace-pre-wrap">
                    {activeStep.cvText}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDiffOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Fermer la comparaison
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
