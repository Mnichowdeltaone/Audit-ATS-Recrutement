import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Download,
  RotateCcw,
  Save,
  ArrowRight,
  FileText,
  Briefcase,
  Sliders,
  X,
  RefreshCw,
  Columns,
  Maximize2,
  FileCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CvOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalCvText: string;
  jobText: string;
  analysisResult?: string | null;
  targetRole?: string;
  companyName?: string;
  apiKey?: string;
  hasServerKey?: boolean;
  onReplaceCurrentCv: (newCvText: string) => void;
  onSaveNewCvToDb: (title: string, cvText: string) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
  onAppliedOptimization?: (modifiedCv: string, summaryBullets: string[]) => void;
}

export default function CvOptimizationModal({
  isOpen,
  onClose,
  originalCvText,
  jobText,
  analysisResult,
  targetRole: initialTargetRole = '',
  companyName: initialCompanyName = '',
  apiKey,
  hasServerKey,
  onReplaceCurrentCv,
  onSaveNewCvToDb,
  onNavigateToTab,
  onAppliedOptimization,
}: CvOptimizationModalProps) {
  const [targetRole, setTargetRole] = useState(initialTargetRole);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [customInstructions, setCustomInstructions] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [optimizedCv, setOptimizedCv] = useState<string>('');
  const [modificationsSummary, setModificationsSummary] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'comparison' | 'editor'>('comparison');
  
  const [newCvTitle, setNewCvTitle] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Essayer d'extraire automatiquement le titre et l'entreprise si non fournis
  useEffect(() => {
    if (!targetRole && jobText) {
      const firstLines = jobText.slice(0, 300);
      const titleMatch = firstLines.match(/(?:poste|rôle|recherche un[e]?|intitulé)[\s:]+([^\n,.]+)/i);
      if (titleMatch && titleMatch[1]) {
        setTargetRole(titleMatch[1].trim());
      } else {
        setTargetRole('Poste visé');
      }
    }
    if (!companyName && jobText) {
      const compMatch = jobText.slice(0, 300).match(/(?:chez|société|entreprise|groupe)[\s:]+([A-Z][a-zA-Z0-9\s]+)/);
      if (compMatch && compMatch[1]) {
        setCompanyName(compMatch[1].trim().split('\n')[0]);
      } else {
        setCompanyName('Entreprise cible');
      }
    }
  }, [jobText, targetRole, companyName]);

  // Titre par défaut pour la sauvegarde
  useEffect(() => {
    const role = targetRole || 'Poste Cible';
    const comp = companyName ? ` (${companyName})` : '';
    setNewCvTitle(`CV Optimisé - ${role}${comp}`);
  }, [targetRole, companyName]);

  if (!isOpen) return null;

  // Lancer la réécriture assistée avec Gemini
  const handleGenerateOptimizedCv = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize_cv',
          input: originalCvText,
          jobText: jobText || '',
          analysisRecommendations: analysisResult || '',
          targetRole: targetRole || '',
          companyName: companyName || '',
          keyArguments: customInstructions.trim() || undefined,
          apiKey: apiKey || undefined,
          demoFallback: !apiKey && !hasServerKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération du CV optimisé.');
      }

      const rawResult: string = data.result || '';
      
      // Séparer la synthèse des modifications et le texte du CV
      if (rawResult.includes('---')) {
        const parts = rawResult.split('---');
        const summaryPart = parts[0].trim();
        const cvPart = parts.slice(1).join('---').trim();

        // Extraire les puces de la synthèse
        const bullets = summaryPart
          .split('\n')
          .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map((line) => line.replace(/^[-*]\s*/, '').trim());

        setModificationsSummary(bullets.length > 0 ? bullets : [
          'Mots-clés ATS clés de l\'offre intégrés naturellement',
          'Accomplissements reformulés avec des métriques chiffrées (STAR)',
          'Phrase d\'accroche et résumé réalignés avec le poste cible',
          'Structure des compétences réorganisée pour les logiciels de tri',
        ]);
        setOptimizedCv(cvPart);
      } else {
        setModificationsSummary([
          'Mots-clés ATS de l\'offre intégrés avec succès',
          'Puces reformulées selon la méthode STAR',
          'Résumé professionnel adapté au poste',
        ]);
        setOptimizedCv(rawResult.trim());
      }

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // Option 1 : Remplacer le CV actuel
  const handleApplyReplacement = () => {
    if (!optimizedCv.trim()) return;
    onReplaceCurrentCv(optimizedCv);
    onAppliedOptimization?.(optimizedCv, modificationsSummary);
    setSuccessNotice('✅ Le CV actif dans l\'analyseur a été mis à jour avec la version optimisée !');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Option 2 : Enregistrer comme un nouveau CV en BDD
  const handleSaveAsNew = async () => {
    if (!optimizedCv.trim() || !newCvTitle.trim()) return;
    setIsSavingNew(true);
    try {
      await onSaveNewCvToDb(newCvTitle.trim(), optimizedCv);
      onAppliedOptimization?.(optimizedCv, modificationsSummary);
      setSuccessNotice(`⭐ Nouveau CV « ${newCvTitle} » sauvegardé dans votre base locale !`);
      setTimeout(() => {
        setIsSavingNew(false);
      }, 2500);
    } catch {
      setErrorMessage('Erreur lors de la sauvegarde du nouveau CV.');
      setIsSavingNew(false);
    }
  };

  // Copier le CV optimisé
  const handleCopy = () => {
    if (!optimizedCv) return;
    navigator.clipboard.writeText(optimizedCv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Télécharger au format Word .doc compatible
  const handleDownloadDoc = () => {
    if (!optimizedCv) return;
    const blob = new Blob([optimizedCv], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${newCvTitle || 'CV_Optimise'}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Télécharger au format TXT
  const handleDownloadTxt = () => {
    if (!optimizedCv) return;
    const blob = new Blob([optimizedCv], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${newCvTitle || 'CV_Optimise'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header du Modal */}
        <div className="bg-linear-to-r from-purple-700 via-indigo-700 to-blue-700 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>Atelier d&apos;Optimisation & Création de CV Adapté</span>
                <span className="text-[10px] bg-amber-400 text-purple-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  IA & ATS
                </span>
              </h2>
              <p className="text-xs text-purple-100 mt-0.5">
                Générez une version enrichie de votre CV intégrant les mots-clés de l&apos;offre et les recommandations de l&apos;audit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications de succès et d'erreur */}
        {successNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-800 font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Section Paramètres & Lancement si pas encore généré */}
          {!optimizedCv && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>Paramètres d&apos;alignement avec l&apos;offre</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Intitulé du poste ciblé
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Ex: Product Owner Senior, Développeur Fullstack..."
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Entreprise ciblée
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Doctolib, Airbus, BNP Paribas..."
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Consignes personnalisées supplémentaires (optionnel)
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Ex: Mettre particulièrement en avant mes projets Cloud et la gestion d'équipe Agile..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>
                    L&apos;IA va scanner le CV actuel, injecter les mots-clés de l&apos;offre et reformuler les puces d&apos;expérience avec des métriques STAR.
                  </span>
                </p>

                <button
                  type="button"
                  onClick={handleGenerateOptimizedCv}
                  disabled={isGenerating || !originalCvText.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Optimisation IA en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Générer la version optimisée du CV</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Si généré : Bandeau de synthèse des modifications */}
          {optimizedCv && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Synthèse des modifications apportées par l&apos;IA :</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateOptimizedCv}
                    disabled={isGenerating}
                    className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Régénérer une autre variante</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-950">
                  {modificationsSummary.map((mod, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 bg-white/70 p-2 rounded-lg border border-emerald-100">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{mod}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contrôles de Vue */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold text-gray-700">
                  <button
                    type="button"
                    onClick={() => setViewMode('comparison')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewMode === 'comparison'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Vue Comparative (Avant / Après)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('editor')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewMode === 'editor'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Éditeur Plein Texte (Optimisé)</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center gap-1 cursor-pointer font-medium"
                    title="Copier le texte du CV optimisé"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDoc}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center gap-1 cursor-pointer font-medium"
                    title="Télécharger au format Word (.doc)"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Word (.doc)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center gap-1 cursor-pointer font-medium"
                    title="Télécharger en fichier texte (.txt)"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-600" />
                    <span>TXT</span>
                  </button>
                </div>
              </div>

              {/* Vues de Contenu */}
              {viewMode === 'comparison' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Colonne 1 : CV Initial */}
                  <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
                      <span>📄 CV Initial (Actuel)</span>
                      <span className="text-[10px] text-gray-500 font-normal">
                        {originalCvText.length} caractères
                      </span>
                    </div>
                    <div className="p-3.5 flex-1 max-h-96 overflow-y-auto font-mono text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {originalCvText}
                    </div>
                  </div>

                  {/* Colonne 2 : CV Optimisé (Éditable) */}
                  <div className="flex flex-col border-2 border-indigo-400 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200 flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>✨ CV Optimisé (Recommandations appliquées)</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 font-normal">
                        {optimizedCv.length} caractères • Éditable ci-dessous
                      </span>
                    </div>
                    <textarea
                      value={optimizedCv}
                      onChange={(e) => setOptimizedCv(e.target.value)}
                      rows={14}
                      className="p-3.5 w-full flex-1 max-h-96 overflow-y-auto font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* Vue Éditeur seul */
                <div className="flex flex-col border border-indigo-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200 flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span>Éditeur du CV Optimisé</span>
                    <span className="text-[10px] text-indigo-700">
                      Vous pouvez apporter des modifications directes avant d&apos;enregistrer ou de remplacer
                    </span>
                  </div>
                  <textarea
                    value={optimizedCv}
                    onChange={(e) => setOptimizedCv(e.target.value)}
                    rows={18}
                    className="p-4 w-full font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Section d'action : Double Choix (Remplacer OU Créer nouveau) */}
              <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-4.5 space-y-3">
                <div className="text-xs font-bold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-purple-700" />
                  <span>Que souhaitez-vous faire de cette version optimisée ?</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Choix 1 : Remplacer le CV actuel */}
                  <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                        <span>Option A : Remplacer le CV actif</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Met à jour directement le champ CV de l&apos;analyseur pour que vous puissiez relancer l&apos;analyse et constater la hausse de score immédiate.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyReplacement}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Remplacer le CV actuel</span>
                    </button>
                  </div>

                  {/* Choix 2 : Sauvegarder comme NOUVEAU CV en BDD */}
                  <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5 text-purple-600" />
                        <span>Option B : Créer un NOUVEAU CV ciblé</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-1 mb-2">
                        Conserve votre CV original intact et ajoute une version personnalisée pour ce poste dans votre base de données locale.
                      </p>

                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newCvTitle}
                          onChange={(e) => setNewCvTitle(e.target.value)}
                          placeholder="Nom de cette nouvelle version..."
                          className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAsNew}
                      disabled={isSavingNew || !newCvTitle.trim()}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      {isSavingNew ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Enregistrer comme nouveau CV en BDD</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer du Modal */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Fermer
          </button>

          {optimizedCv && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copier</span>
              </button>
              <button
                type="button"
                onClick={handleApplyReplacement}
                className="px-4 py-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Valider et appliquer</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
