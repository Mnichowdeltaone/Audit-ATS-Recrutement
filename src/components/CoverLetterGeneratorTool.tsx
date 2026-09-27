import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  Send,
  Save,
  Copy,
  Check,
  Download,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  FileText,
  User,
  Building,
  RefreshCw,
  HelpCircle,
  PlusCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { localDbClient } from '../services/localDbClient';

interface CoverLetterGeneratorToolProps {
  currentCvText?: string;
  currentJobText?: string;
  targetRole?: string;
  companyName?: string;
  apiKey?: string;
  hasServerKey?: boolean;
  onNavigateToTracker?: () => void;
}

export default function CoverLetterGeneratorTool({
  currentCvText = '',
  currentJobText = '',
  targetRole: defaultTargetRole = '',
  companyName: defaultCompanyName = '',
  apiKey,
  hasServerKey,
  onNavigateToTracker,
}: CoverLetterGeneratorToolProps) {
  // Formulaire candidat & poste
  const [candidateName, setCandidateName] = useState('Alex Martin');
  const [targetRole, setTargetRole] = useState(defaultTargetRole || 'Product Owner Senior');
  const [companyName, setCompanyName] = useState(defaultCompanyName || 'Doctolib');
  const [hiringManager, setHiringManager] = useState("L'équipe Recrutement & Direction Produit");
  
  // Ton de la lettre
  const [selectedTone, setSelectedTone] = useState<'impact' | 'corporate' | 'startup' | 'values'>('impact');
  
  // Points clés
  const [keyArguments, setKeyArguments] = useState('6 ans en SaaS B2B, expertise Agile Scrum certifiée PSPO II, réduction de churn démontrée de 22%');
  
  // Contenus de référence
  const [cvSnippet, setCvSnippet] = useState(currentCvText ? currentCvText.slice(0, 1500) : '');
  const [jobSnippet, setJobSnippet] = useState(currentJobText || '');

  // États de génération
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string>('');
  
  // Actions
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Lancer la génération
  const handleGenerateLetter = async () => {
    setIsGenerating(true);
    setActionNotice(null);

    try {
      const res = await fetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_cover_letter',
          input: cvSnippet || candidateName,
          candidateName: candidateName.trim(),
          companyName: companyName.trim() || 'Votre Entreprise',
          targetRole: targetRole.trim() || 'Poste Cible',
          hiringManager: hiringManager.trim() || undefined,
          tone: selectedTone,
          keyArguments: keyArguments.trim() || undefined,
          jobText: jobSnippet.trim() || undefined,
          apiKey: apiKey || undefined,
          demoFallback: !apiKey && !hasServerKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération de la lettre.');
      }

      setGeneratedLetter(data.result);
      confetti({ particleCount: 45, spread: 55, origin: { y: 0.6 } });
      setActionNotice({ type: 'success', message: '✨ Lettre de motivation générée avec succès ! Vous pouvez la personnaliser ci-dessous.' });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: unknown) {
      setActionNotice({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsGenerating(false);
    }
  };

  // Pré-remplir avec l'offre de l'analyseur
  const handleInjectCurrentJob = () => {
    if (currentJobText) {
      setJobSnippet(currentJobText);
      setActionNotice({ type: 'success', message: 'Offre d\'emploi de l\'analyseur injectée dans le générateur !' });
      setTimeout(() => setActionNotice(null), 2500);
    }
  };

  // Pré-remplir avec le CV de l'analyseur
  const handleInjectCurrentCv = () => {
    if (currentCvText) {
      setCvSnippet(currentCvText.slice(0, 1500));
      setActionNotice({ type: 'success', message: 'Extrait de votre CV actif injecté comme référence !' });
      setTimeout(() => setActionNotice(null), 2500);
    }
  };

  // Sauvegarder dans la boîte à suggestions de la base locale
  const handleSaveToDb = async () => {
    if (!generatedLetter.trim()) return;
    setIsSaving(true);
    try {
      const title = `Lettre de Motivation - ${companyName} (${targetRole})`;
      await localDbClient.saveSuggestion({
        id: `sugg-${Date.now()}`,
        type: 'cover_letter_hook',
        title,
        originalText: `Candidature ${targetRole} chez ${companyName}`,
        generatedContent: generatedLetter,
        targetRole,
        createdAt: new Date().toISOString(),
      });
      setActionNotice({ type: 'success', message: `⭐ Lettre enregistrée dans vos suggestions locales sous « ${title} » !` });
      setTimeout(() => setActionNotice(null), 3500);
    } catch {
      setActionNotice({ type: 'error', message: 'Erreur lors de l\'enregistrement dans la base locale.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Créer directement la candidature correspondante dans le suivi
  const handleCreateApplication = async () => {
    try {
      const now = new Date().toISOString().split('T')[0];
      await localDbClient.saveApplication({
        id: `app-${Date.now()}`,
        company: companyName || 'Entreprise Cible',
        role: targetRole || 'Poste Cible',
        status: 'applied',
        appliedDate: now,
        followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        location: 'France',
        contractType: 'CDI',
        notes: `Lettre de motivation générée le ${now}.`,
        checklist: {
          cvSent: true,
          coverLetterSent: true,
          portfolioSent: false,
          followUpDone: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setActionNotice({ type: 'success', message: `💼 Candidature créée pour "${companyName}" avec lettre cochée !` });
      setTimeout(() => {
        if (onNavigateToTracker) onNavigateToTracker();
      }, 1500);
    } catch {
      setActionNotice({ type: 'error', message: 'Erreur lors de la création de la candidature.' });
    }
  };

  // Copier
  const handleCopy = () => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Télécharger Word .doc
  const handleDownloadDoc = () => {
    if (!generatedLetter) return;
    const blob = new Blob([generatedLetter], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lettre_Motivation_${(companyName || 'Candidature').replace(/\s+/g, '_')}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Télécharger TXT
  const handleDownloadTxt = () => {
    if (!generatedLetter) return;
    const blob = new Blob([generatedLetter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lettre_Motivation_${(companyName || 'Candidature').replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Bandeau d'en-tête */}
      <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/80 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>Générateur Assisté de Lettre de Motivation</span>
                <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                  Haute Conversion
                </span>
              </h2>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                Rédigez en quelques secondes une lettre de motivation sur-mesure, convaincante et ciblée, qui valorise vos réussites concrètes en miroir des besoins de l&apos;entreprise.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentJobText && (
              <button
                type="button"
                onClick={handleInjectCurrentJob}
                className="text-xs px-2.5 py-1.5 bg-white border border-blue-300 text-blue-800 hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Insérer le descriptif de l'offre actuellement dans l'analyseur"
              >
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>Injecter offre active</span>
              </button>
            )}
            {currentCvText && (
              <button
                type="button"
                onClick={handleInjectCurrentCv}
                className="text-xs px-2.5 py-1.5 bg-white border border-blue-300 text-blue-800 hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Insérer les éléments clés du CV actif"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>Injecter CV actif</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionNotice.message}</span>
        </div>
      )}

      {/* Formulaire & Prévisualisation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Colonne Gauche : Paramètres de la Lettre (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>1. Destinataire & Profil</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Votre Nom & Prénom
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Alex Martin"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Entreprise visée
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Doctolib, Airbus..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Intitulé du poste ciblé
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Product Owner Senior"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Destinataire / Salutation
                  </label>
                  <input
                    type="text"
                    value={hiringManager}
                    onChange={(e) => setHiringManager(e.target.value)}
                    placeholder="L'équipe Recrutement"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Ton rédactionnel souhaité
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'impact', label: 'Impactant & Chiffré', desc: 'KPIs, ROI, réalisations' },
                    { id: 'corporate', label: 'Corporate & Élégant', desc: 'Sérieux, grands groupes' },
                    { id: 'startup', label: 'Start-up & Direct', desc: 'Agilité, passion produit' },
                    { id: 'values', label: 'Engagé & Valeurs', desc: 'Raison d\'être, RSE' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTone(t.id as any)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        selectedTone === t.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                          : 'border-gray-200 bg-gray-50/60 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{t.label}</div>
                      <div className="text-[10px] text-gray-500">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Arguments clés / Anecdotes à valoriser
                </label>
                <input
                  type="text"
                  value={keyArguments}
                  onChange={(e) => setKeyArguments(e.target.value)}
                  placeholder="Ex: 6 ans d'exp, réduction churn 22%, disponible sous 1 mois..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Offre d'emploi & CV de référence */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-purple-600" />
              <span>2. Offre d&apos;emploi de référence</span>
            </h3>
            <textarea
              rows={5}
              value={jobSnippet}
              onChange={(e) => setJobSnippet(e.target.value)}
              placeholder="Collez ici les missions principales ou l'offre complète pour créer une résonance parfaite..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-sans text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={handleGenerateLetter}
              disabled={isGenerating}
              className="w-full py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Rédaction de votre lettre en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Générer ma Lettre de Motivation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Colonne Droite : Visualisation & Éditeur de la lettre (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Lettre de Motivation Personnalisée</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {generatedLetter ? 'Vous pouvez retoucher chaque phrase directement dans la zone ci-dessous.' : 'La lettre apparaîtra ici après génération.'}
                </p>
              </div>

              {generatedLetter && (
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

            {/* Contenu */}
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3 bg-blue-50/40 rounded-xl border border-dashed border-blue-200">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-800">
                    Rédaction de la lettre par l&apos;IA en cours...
                  </p>
                  <p className="text-xs text-gray-500 max-w-sm">
                    Construction d&apos;une accroche percutante et formulation de vos accomplissements en réponse aux critères majeurs de l&apos;offre.
                  </p>
                </div>
              </div>
            ) : generatedLetter ? (
              <div className="flex-1 flex flex-col space-y-3">
                <textarea
                  value={generatedLetter}
                  onChange={(e) => setGeneratedLetter(e.target.value)}
                  rows={19}
                  className="w-full flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-sans text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                  <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {generatedLetter.split(/\s+/).filter(Boolean).length} mots (Longueur idéale d&apos;une page A4)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSaveToDb}
                      disabled={isSaving}
                      className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      title="Sauvegarder dans ma boîte à suggestions de la base locale"
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Enregistrer en BDD</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateApplication}
                      className="flex-1 sm:flex-none px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      title="Créer une candidature dans le suivi avec la lettre cochée"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Ajouter au Suivi des candidatures</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-300">
                <div className="p-3 bg-blue-100/70 text-blue-700 rounded-full">
                  <Mail className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h4 className="text-sm font-bold text-gray-800">
                    Générez une lettre ultra-personnalisée
                  </h4>
                  <p className="text-xs text-gray-500">
                    Renseignez les détails du poste ou injectez l&apos;offre active, puis cliquez sur le bouton de génération pour obtenir une lettre professionnelle.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateLetter}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
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
