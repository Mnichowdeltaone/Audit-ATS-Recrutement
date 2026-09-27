import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Save,
  Copy,
  Check,
  Download,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  Award,
  BookOpen,
  ArrowRight,
  Database,
  RefreshCw,
  Eye,
  CheckCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { localDbClient } from '../services/localDbClient';
import { SavedCv } from '../types';

interface CvGeneratorToolProps {
  currentCvText?: string;
  currentJobText?: string;
  onApplyToCv: (newText: string) => void;
  onNavigateToAnalyzer: () => void;
  apiKey?: string;
  hasServerKey?: boolean;
}

export default function CvGeneratorTool({
  currentCvText = '',
  currentJobText = '',
  onApplyToCv,
  onNavigateToAnalyzer,
  apiKey,
  hasServerKey,
}: CvGeneratorToolProps) {
  // Formulaire de saisie
  const [candidateName, setCandidateName] = useState('Alex Martin');
  const [contactInfo, setContactInfo] = useState('Paris, France | 06 12 34 56 78 | contact@alexmartin.fr | linkedin.com/in/alexmartin');
  const [targetRole, setTargetRole] = useState('Product Owner Senior');
  const [targetCompany, setTargetCompany] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'ats_standard' | 'impact_star' | 'tech_modern' | 'executive'>('impact_star');
  
  const [notesOrExperience, setNotesOrExperience] = useState(
    currentCvText ||
      `EXPÉRIENCES :
- Lead Product Owner chez TechVentures (2022 - Présent) : refonte onboarding client, squad de 8 devs, churn réduit de 22%, NPS +18.
- Product Owner chez CloudCommerce (2019 - 2022) : tunnel de commande, A/B testing (+15% conversion), rituels Scrum.

COMPÉTENCES :
Agile Scrum (PSPO II), Amplitude, Google Analytics 4, Jira, Confluence, Figma, SQL, API REST.

FORMATION :
Master 2 Management des SI & Projets Digitaux (2019)`
  );

  const [jobOfferText, setJobOfferText] = useState(currentJobText || '');

  // États de génération
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCv, setGeneratedCv] = useState<string>('');
  const [savedCvs, setSavedCvs] = useState<SavedCv[]>([]);
  const [selectedDbCvId, setSelectedDbCvId] = useState<string>('');
  
  // États d'action
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Charger les CVs de la BDD locale pour pré-remplissage éventuel
  useEffect(() => {
    localDbClient
      .getCvs()
      .then((cvs) => setSavedCvs(cvs))
      .catch((err) => console.warn('Impossible de charger les CVs BDD:', err));
  }, []);

  // Déclencher la génération
  const handleGenerateCv = async () => {
    if (!notesOrExperience.trim()) {
      setActionNotice({ type: 'error', message: 'Veuillez saisir au moins vos notes ou expériences de base.' });
      setTimeout(() => setActionNotice(null), 3000);
      return;
    }

    setIsGenerating(true);
    setActionNotice(null);

    try {
      const res = await fetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_cv',
          input: notesOrExperience.trim(),
          candidateName: candidateName.trim(),
          contactInfo: contactInfo.trim(),
          targetRole: targetRole.trim(),
          companyName: targetCompany.trim() || undefined,
          jobText: jobOfferText.trim() || undefined,
          style: selectedStyle,
          apiKey: apiKey || undefined,
          demoFallback: !apiKey && !hasServerKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération du CV.');
      }

      setGeneratedCv(data.result);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setActionNotice({ type: 'success', message: '✨ CV généré avec succès par l\'IA ! Vous pouvez le retoucher ci-dessous.' });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: unknown) {
      setActionNotice({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsGenerating(false);
    }
  };

  // Pré-remplir avec le CV actif de l'analyseur
  const handleImportCurrentCv = () => {
    if (currentCvText && currentCvText.trim()) {
      setNotesOrExperience(currentCvText);
      setActionNotice({ type: 'success', message: 'Contenu du CV actuel importé dans le générateur !' });
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  // Pré-remplir depuis l'offre active de l'analyseur
  const handleImportCurrentJob = () => {
    if (currentJobText && currentJobText.trim()) {
      setJobOfferText(currentJobText);
      setActionNotice({ type: 'success', message: 'Descriptif de l\'offre actuelle injecté pour le ciblage ATS !' });
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  // Charger depuis la BDD locale
  const handleSelectFromDb = (cvId: string) => {
    setSelectedDbCvId(cvId);
    const found = savedCvs.find((c) => c.id === cvId);
    if (found) {
      setNotesOrExperience(found.rawText);
      if (found.targetRole) setTargetRole(found.targetRole);
      setActionNotice({ type: 'success', message: `CV "${found.title}" chargé dans le générateur !` });
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  // Définir comme CV actif pour l'analyseur
  const handleApplyToActiveCv = () => {
    if (!generatedCv.trim()) return;
    onApplyToCv(generatedCv);
    setActionNotice({ type: 'success', message: 'CV défini comme CV actif dans l\'analyseur ! Redirection...' });
    setTimeout(() => {
      onNavigateToAnalyzer();
    }, 1200);
  };

  // Sauvegarder dans la BDD locale
  const handleSaveToDb = async () => {
    if (!generatedCv.trim()) return;
    setIsSaving(true);
    try {
      const title = `CV Généré - ${targetRole || 'Profil'}${targetCompany ? ` (${targetCompany})` : ''}`;
      const now = new Date().toISOString();
      await localDbClient.saveCv({
        id: `cv-${Date.now()}`,
        title,
        targetRole: targetRole || 'Général',
        fileName: `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`,
        fileType: 'manual',
        rawText: generatedCv,
        isDefault: false,
        fileSize: new Blob([generatedCv]).size,
        createdAt: now,
        updatedAt: now,
      });
      setActionNotice({ type: 'success', message: `⭐ CV enregistré avec succès dans votre base locale sous « ${title} » !` });
      setTimeout(() => setActionNotice(null), 3500);
    } catch {
      setActionNotice({ type: 'error', message: 'Erreur lors de l\'enregistrement dans la base locale.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Copier
  const handleCopy = () => {
    if (!generatedCv) return;
    navigator.clipboard.writeText(generatedCv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Télécharger Word .doc
  const handleDownloadDoc = () => {
    if (!generatedCv) return;
    const blob = new Blob([generatedCv], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CV_${(targetRole || 'Profil').replace(/\s+/g, '_')}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Télécharger TXT
  const handleDownloadTxt = () => {
    if (!generatedCv) return;
    const blob = new Blob([generatedCv], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CV_${(targetRole || 'Profil').replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Bandeau d'introduction */}
      <div className="bg-linear-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>Générateur Assisté de CV Professionnel</span>
                <span className="text-[10px] bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                  IA & Méthode STAR
                </span>
              </h2>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                Concevez un CV complet, percutant et 100% calibré pour les logiciels ATS. Saisissez vos notes ou importez un profil existant, et l&apos;IA structure vos réalisations avec des métriques chiffrées.
              </p>
            </div>
          </div>

          {/* Raccourcis d'import */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentCvText && (
              <button
                type="button"
                onClick={handleImportCurrentCv}
                className="text-xs px-2.5 py-1.5 bg-white border border-purple-300 text-purple-800 hover:bg-purple-50 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Importer le texte du CV actuel de l'analyseur"
              >
                <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                <span>Charger CV actif</span>
              </button>
            )}

            {savedCvs.length > 0 && (
              <select
                value={selectedDbCvId}
                onChange={(e) => handleSelectFromDb(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-white border border-purple-300 text-purple-900 rounded-lg font-medium cursor-pointer shadow-2xs"
              >
                <option value="">-- Charger depuis ma BDD locale ({savedCvs.length}) --</option>
                {savedCvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Notifications de feedback */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* Formulaire en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Colonne Gauche : Formulaire & Paramètres (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>1. Paramètres & Ciblage</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Nom & Prénom
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Ex: Alex Martin"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Poste / Rôle Cible (Titre du CV)
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Ex: Product Owner Senior, Lead Tech React..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Entreprise ciblée (optionnel)
                  </label>
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    placeholder="Ex: Doctolib..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Format & Style
                  </label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    <option value="impact_star">Impactant STAR (Chiffré)</option>
                    <option value="ats_standard">ATS Sobre & Standard</option>
                    <option value="tech_modern">Tech & Ingénierie</option>
                    <option value="executive">Exécutif & Leadership</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Coordonnées & Liens (En-tête)
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Ville | Tél | Email | LinkedIn | GitHub..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Offre d'emploi cible (optionnelle pour aligner les mots-clés) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>2. Offre d&apos;emploi cible (pour l&apos;ATS)</span>
              </h3>
              {currentJobText && (
                <button
                  type="button"
                  onClick={handleImportCurrentJob}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                >
                  Charger l&apos;offre active
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Collez ici l&apos;annonce pour que l&apos;IA intègre les mots-clés recherchés par le recruteur.
            </p>
            <textarea
              rows={4}
              value={jobOfferText}
              onChange={(e) => setJobOfferText(e.target.value)}
              placeholder="Collez le descriptif de l'offre d'emploi ici (optionnel mais recommandé)..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            />
          </div>

          {/* Parcours brut & notes */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>3. Vos Expériences & Compétences</span>
              </h3>
              <span className="text-[11px] text-gray-400">
                {notesOrExperience.length} car.
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Notes en vrac, missions, outils, chiffres clés ou votre CV actuel brut :
            </p>
            <textarea
              rows={8}
              value={notesOrExperience}
              onChange={(e) => setNotesOrExperience(e.target.value)}
              placeholder="Listez vos postes, entreprises, dates, missions principales, compétences et formations..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <button
              type="button"
              onClick={handleGenerateCv}
              disabled={isGenerating || !notesOrExperience.trim()}
              className="w-full py-3 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Génération du CV par l&apos;IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Générer mon CV optimisé ATS</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Colonne Droite : Prévisualisation & Éditeur en direct (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Aperçu & Éditeur du CV Généré</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {generatedCv ? 'Document prêt à l\'emploi. Vous pouvez modifier directement le texte ci-dessous.' : 'Le CV généré apparaîtra ici avec une structure professionnelle complète.'}
                </p>
              </div>

              {generatedCv && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center gap-1 cursor-pointer font-medium"
                    title="Copier le texte complet"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDoc}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center gap-1 cursor-pointer font-medium"
                    title="Télécharger en Word (.doc)"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 flex items-center gap-1 cursor-pointer font-medium"
                    title="Télécharger en Texte (.txt)"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-600" />
                    <span>TXT</span>
                  </button>
                </div>
              )}
            </div>

            {/* Zone de texte ou Placeholder */}
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3 bg-purple-50/40 rounded-xl border border-dashed border-purple-200">
                <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-800">
                    Rédaction du CV par l&apos;IA en cours...
                  </p>
                  <p className="text-xs text-gray-500 max-w-sm">
                    Structuration des sections, application de la formule Google X-Y-Z et harmonisation des mots-clés ATS.
                  </p>
                </div>
              </div>
            ) : generatedCv ? (
              <div className="flex-1 flex flex-col space-y-3">
                <textarea
                  value={generatedCv}
                  onChange={(e) => setGeneratedCv(e.target.value)}
                  rows={20}
                  className="w-full flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />

                {/* Barre d'action d'intégration rapide */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                  <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {generatedCv.split(/\s+/).filter(Boolean).length} mots • {generatedCv.length} caractères
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSaveToDb}
                      disabled={isSaving}
                      className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      title="Sauvegarder ce CV dans ma base locale"
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Enregistrer en BDD</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyToActiveCv}
                      className="flex-1 sm:flex-none px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      title="Remplacer le CV dans l'analyseur pour tester immédiatement le score ATS"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Définir comme CV actif & Analyser</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-300">
                <div className="p-3 bg-purple-100/70 text-purple-700 rounded-full">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h4 className="text-sm font-bold text-gray-800">
                    Prêt à créer votre nouveau CV optimisé
                  </h4>
                  <p className="text-xs text-gray-500">
                    Complétez les informations sur la gauche ou cliquez sur « Charger CV actif », puis lancez la génération pour obtenir votre CV personnalisé.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateCv}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Lancer la génération assistée
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
