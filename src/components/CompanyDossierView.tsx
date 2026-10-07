import React, { useState } from 'react';
import {
  Building2,
  TrendingUp,
  Cpu,
  HelpCircle,
  Copy,
  Check,
  Download,
  Share2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Users,
  Briefcase,
  Layers,
  MapPin,
  Clock,
  Award,
  FileText,
  MessageSquare,
  Compass,
  DollarSign,
  AlertCircle,
  Printer,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { CompanyFinancialTechnicalDossier } from '../types';

interface CompanyDossierViewProps {
  dossier: CompanyFinancialTechnicalDossier;
  roleTitle?: string;
  onRefreshWithAi?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export default function CompanyDossierView({
  dossier,
  roleTitle,
  onRefreshWithAi,
  isRefreshing = false,
  className = '',
}: CompanyDossierViewProps) {
  const [activeTab, setActiveTab] = useState<'interview' | 'finance' | 'technical' | 'identity'>('interview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    confetti({ particleCount: 20, spread: 45 });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadDossier = () => {
    const content = dossier.rawBriefText || `# Fiche Technique & Financière : ${dossier.companyName}\n\nPoste : ${roleTitle || 'Candidature'}\n\nSecteur : ${dossier.sector}\nModèle : ${dossier.businessModel}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fiche_Entreprise_${dossier.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Preparation_Entretien.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* En-tête Pro & Immersif */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-blue-400" />
                Fiche Recruteur & Entretien
              </span>
              {dossier.sector && (
                <span className="text-[11px] bg-white/10 text-gray-200 px-2.5 py-0.5 rounded-full border border-white/10 font-medium">
                  {dossier.sector}
                </span>
              )}
              {dossier.estimatedSize && (
                <span className="text-[11px] bg-white/10 text-gray-200 px-2.5 py-0.5 rounded-full border border-white/10 font-medium">
                  {dossier.estimatedSize}
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span>{dossier.companyName}</span>
              {roleTitle && (
                <span className="text-sm font-semibold text-blue-200/90 hidden sm:inline">
                  • {roleTitle}
                </span>
              )}
            </h3>

            <p className="text-xs text-blue-100/80 max-w-2xl leading-relaxed">
              Dossier technique, financier et stratégique complet pour maîtriser les enjeux du poste, démontrer votre posture de Business Partner et réussir l&apos;ensemble de vos entretiens.
            </p>
          </div>

          {/* Actions rapides d'export */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopy(dossier.rawBriefText || '', 'all')}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
              title="Copier la fiche complète au format Markdown"
            >
              {copiedKey === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'all' ? 'Fiche copiée !' : 'Copier Markdown'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDossier}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
              title="Télécharger la fiche pour réviser hors-ligne"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter (.md)</span>
            </button>

            {onRefreshWithAi && (
              <button
                type="button"
                onClick={onRefreshWithAi}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                title="Approfondir et ré-analyser l'entreprise avec Gemini"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isRefreshing ? 'Actualisation IA...' : 'Approfondir avec l’IA'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Métriques / Badges Clés en bandeau */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-blue-200/70 uppercase font-bold block">Business Model</span>
            <span className="text-white font-bold truncate block">{dossier.businessModel || 'B2B & Prestations'}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-blue-200/70 uppercase font-bold block">Actionnariat / Capital</span>
            <span className="text-white font-bold truncate block">{dossier.ownershipStructure || 'Privé / Indépendant'}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-blue-200/70 uppercase font-bold block">Stade Financier</span>
            <span className="text-white font-bold truncate block">{dossier.financialProfile.growthStage || 'Croissance pérenne'}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-blue-200/70 uppercase font-bold block">Implantation</span>
            <span className="text-white font-bold truncate block">{dossier.location || 'France'}</span>
          </div>
        </div>
      </div>

      {/* Barre d'onglets de navigation */}
      <div className="flex border-b border-gray-200 px-4 sm:px-6 bg-gray-50/70 overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('interview')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'interview'
              ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>1. Stratégie d&apos;Entretien & Questions ({dossier.interviewStrategy.highImpactQuestions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finance')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'finance'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>2. Profil Financier & Trésorerie</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('technical')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'technical'
              ? 'border-purple-600 text-purple-700 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Cpu className="w-4 h-4 text-purple-600" />
          <span>3. Stack Technique & Organisation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('identity')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'identity'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>4. Modèle Économique & Identité</span>
        </button>
      </div>

      {/* Contenu dynamique des onglets */}
      <div className="p-5 sm:p-7 space-y-6">
        {/* ONGLET 1 : STRATÉGIE D'ENTRETIEN & QUESTIONS (LE COEUR UTILE CANDIDAT) */}
        {activeTab === 'interview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Pitch d'accroche personnalisé */}
            <div className="p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/40 border border-blue-200 rounded-2xl space-y-3 relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-2xs">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <h4 className="font-extrabold text-sm text-gray-900">
                    Pitch d&apos;accroche recommandé pour votre entretien
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(dossier.interviewStrategy.pitchRecommendation, 'pitch')}
                  className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-blue-300 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedKey === 'pitch' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pitch' ? 'Copié !' : 'Copier le pitch'}</span>
                </button>
              </div>

              <blockquote className="text-xs sm:text-sm text-gray-800 italic leading-relaxed pl-3 border-l-3 border-blue-500 bg-white/60 p-3 rounded-r-xl">
                {dossier.interviewStrategy.pitchRecommendation}
              </blockquote>

              <p className="text-[11px] text-gray-500">
                💡 <strong>Conseil :</strong> Utilisez ce pitch en introduction lors de la classique question <em>« Parlez-moi de vous »</em> pour créer immédiatement un écho avec les priorités de {dossier.companyName}.
              </p>
            </div>

            {/* Questions Stratégiques à Poser */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                    <HelpCircle className="w-4 h-4" />
                  </span>
                  <h4 className="font-extrabold text-sm text-gray-900">
                    Questions à fort impact à poser au recruteur / DAF / DG
                  </h4>
                </div>
                <span className="text-xs text-gray-500">
                  {dossier.interviewStrategy.highImpactQuestions.length} questions ciblées
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {dossier.interviewStrategy.highImpactQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50/80 hover:bg-gray-50 border border-gray-200 hover:border-indigo-300 rounded-2xl transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                          Question {idx + 1}
                        </span>
                        <p className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-indigo-950 transition-colors">
                          « {q.question} »
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(q.question, `q-${idx}`)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Copier cette question"
                      >
                        {copiedKey === `q-${idx}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="p-2.5 bg-white border border-gray-200/80 rounded-xl text-xs space-y-0.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-500" />
                        Objectif candidat :
                      </span>
                      <p className="text-gray-700 text-[11px] leading-relaxed">
                        {q.objective}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guide pas-à-pas pour franchir chaque étape du process */}
            <div className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-gray-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-800 text-white rounded-lg">
                  <Compass className="w-4 h-4 text-amber-300" />
                </span>
                <h4 className="font-extrabold text-sm text-gray-900">
                  Conseils stratégiques pour chaque étape du process de recrutement
                </h4>
              </div>

              <div className="space-y-2.5">
                {dossier.interviewStrategy.strategicAdvice.map((advice, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {i + 1}
                    </span>
                    <p className="leading-relaxed">{advice}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 2 : PROFIL FINANCIER & TRÉSORERIE */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Chiffre d&apos;Affaires / Dynamique</span>
                </div>
                <div className="text-sm font-black text-emerald-950">
                  {dossier.financialProfile.estimatedRevenue || 'Non communiqué publiquement'}
                </div>
                <p className="text-[11px] text-gray-500">Ordre de grandeur ou tendance observée</p>
              </div>

              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-teal-800 text-[11px] font-bold uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Stade de Croissance</span>
                </div>
                <div className="text-sm font-black text-teal-950">
                  {dossier.financialProfile.growthStage || 'Maturité & Rentabilité'}
                </div>
                <p className="text-[11px] text-gray-500">Position dans le cycle économique</p>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-blue-800 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Modèle de Rentabilité</span>
                </div>
                <div className="text-sm font-black text-blue-950">
                  {dossier.financialProfile.profitabilityModel || 'Marge brute & BFR'}
                </div>
                <p className="text-[11px] text-gray-500">Facteurs clés de génération de marge</p>
              </div>
            </div>

            {/* Enjeux Financiers & Trésorerie Identifiés */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
                <h4 className="font-extrabold text-sm text-gray-900">
                  Enjeux financiers & de trésorerie prioritaires déduits de l&apos;offre
                </h4>
              </div>

              <p className="text-xs text-gray-600">
                Ces sujets constituent vos points de levier en entretien pour montrer que vous comprenez la réalité financière de {dossier.companyName} :
              </p>

              <div className="space-y-2">
                {dossier.financialProfile.keyFinancialChallenges.map((challenge, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-medium flex items-start gap-2.5"
                  >
                    <span className="text-emerald-600 font-bold text-sm leading-none mt-0.5">•</span>
                    <span className="leading-relaxed">{challenge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 3 : STACK TECHNIQUE, OUTILS & ORGANISATION */}
        {activeTab === 'technical' && (
          <div className="space-y-6 animate-fade-in">
            {/* Outils & Logiciels */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-lg">
                  <Cpu className="w-4 h-4" />
                </span>
                <h4 className="font-extrabold text-sm text-gray-900">
                  Outils, Progiciels (ERP / TMS / BI) & Environnement Informatique
                </h4>
              </div>

              <p className="text-xs text-gray-600">
                Progiciels identifiés ou attendus dans l&apos;organisation cible :
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {dossier.technicalProfile.toolsAndStack.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5"
                  >
                    <Cpu className="w-3 h-3 text-purple-600" />
                    <span>{tool}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Organisation & Reporting Line */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">Rattachement Hiérarchique</span>
                <h5 className="font-extrabold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{dossier.technicalProfile.reportingLine || 'Direction Administrative & Financière (DAF)'}</span>
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Interlocuteurs clés : Direction Générale, CAC, équipes comptables et opérationnelles.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">Méthodologie & Cadre Normatif</span>
                <h5 className="font-extrabold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{dossier.technicalProfile.methodology || 'Normes françaises & Fast Close'}</span>
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Respect des procédures de contrôle interne, audit légal et reporting mensuel.
                </p>
              </div>
            </div>

            {/* Chantiers Opérationnels & Priorités */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                  <Layers className="w-4 h-4" />
                </span>
                <h4 className="font-extrabold text-sm text-gray-900">
                  Chantiers et Projets Prioritaires sur ce Poste
                </h4>
              </div>

              <div className="space-y-2">
                {dossier.technicalProfile.keyOperationalProjects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-xs text-blue-950 font-medium flex items-start gap-2.5"
                  >
                    <span className="text-blue-600 font-bold text-sm leading-none mt-0.5">•</span>
                    <span className="leading-relaxed">{proj}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 4 : IDENTITÉ & MODÈLE ÉCONOMIQUE */}
        {activeTab === 'identity' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Secteur d&apos;activité</span>
                <h5 className="font-extrabold text-sm text-gray-900">{dossier.sector || 'Secteur d’activité'}</h5>
                <p className="text-xs text-gray-600">Positionnement sectoriel et marché de référence.</p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Modèle Économique</span>
                <h5 className="font-extrabold text-sm text-gray-900">{dossier.businessModel || 'B2B / Prestations'}</h5>
                <p className="text-xs text-gray-600">Mode de génération de chiffre d&apos;affaires et de marge.</p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Taille & Structure</span>
                <h5 className="font-extrabold text-sm text-gray-900">{dossier.estimatedSize || 'PME / ETI'}</h5>
                <p className="text-xs text-gray-600">Effectifs estimés et périmètre organisationnel.</p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Actionnariat & Capital</span>
                <h5 className="font-extrabold text-sm text-gray-900">{dossier.ownershipStructure || 'Privé / Indépendant'}</h5>
                <p className="text-xs text-gray-600">Gouvernance et type d&apos;actionnaires de référence.</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Implantation géographique : <strong>{dossier.location || 'France'}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Pied de carte avec rappel de révision */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>Fiche prête pour préparer l&apos;entretien • Exportable en 1 clic pour vos fiches de révision</span>
        </div>

        <button
          type="button"
          onClick={() => handleCopy(dossier.rawBriefText || '', 'all-footer')}
          className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold text-xs cursor-pointer flex items-center gap-1 self-start sm:self-auto"
        >
          <Copy className="w-3 h-3 text-gray-500" />
          <span>{copiedKey === 'all-footer' ? 'Copié !' : 'Copier tout le dossier'}</span>
        </button>
      </div>
    </div>
  );
}
