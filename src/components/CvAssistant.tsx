import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Copy,
  ArrowRight,
  RefreshCw,
  Award,
  Zap,
  FileText,
  FileCheck,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Send,
  Sliders,
  ChevronDown,
  ChevronUp,
  Database,
  Mail,
} from 'lucide-react';
import { localDbClient } from '../services/localDbClient';
import CvGeneratorTool from './CvGeneratorTool';
import CoverLetterGeneratorTool from './CoverLetterGeneratorTool';

interface CvAssistantProps {
  currentCvText: string;
  currentJobText?: string;
  onApplyToCv: (newText: string) => void;
  onNavigateToAnalyzer: () => void;
  onNavigateToTracker?: () => void;
  apiKey?: string;
  hasServerKey?: boolean;
}

const SAMPLE_BULLETS = [
  {
    role: 'Développeur / Tech',
    bullet: 'Développement de nouvelles fonctionnalités et correction de bugs sur la plateforme.',
  },
  {
    role: 'Product Owner / Chef de Projet',
    bullet: 'Animation des réunions de sprint et rédaction des user stories avec les équipes.',
  },
  {
    role: 'Commercial / Business Developer',
    bullet: 'Prospection téléphonique et gestion d’un portefeuille de clients en B2B.',
  },
  {
    role: 'Chargé de Clientèle / Support',
    bullet: 'Traitement des réclamations clients et réponses aux e-mails de support.',
  },
];

const TEMPLATES = [
  {
    title: 'Développeur Senior / Lead Tech (Stack Moderne)',
    category: 'Ingénierie & Tech',
    content: `PRÉNOM NOM
Développeur Fullstack Senior (TypeScript • Python • Cloud)
Paris, France | 06 00 00 00 00 | prenom.nom@email.com | github.com/monprofil | linkedin.com/in/monprofil

RÉSUMÉ PROFESSIONNEL
Développeur Fullstack avec 6 ans d'expérience dans la conception d'architectures web haute performance et scalables. Spécialisé en TypeScript, React, Python (FastAPI) et microservices Cloud (GCP/AWS). Passionné par la qualité logicielle (TDD, CI/CD) et l'optimisation des performances applicatives.

COMPÉTENCES CLÉS
- Langages & Frameworks : TypeScript, JavaScript, Python, React, Next.js, FastAPI, Node.js
- Bases de données : PostgreSQL, Redis, MongoDB, SQLAlchemy, Prisma
- Cloud & DevOps : Docker, Kubernetes, AWS (S3, ECS, Lambda), Terraform, GitHub Actions
- Méthodologies : Agile Scrum, CI/CD, Architecture Microservices, Tests unitaires & E2E

EXPÉRIENCE PROFESSIONNELLE

LEAD DÉVELOPPEUR FULLSTACK | FinTech Solutions, Paris | 2022 - Présent
- Conception et déploiement d'une API de paiement en temps réel traitant plus de 2M de requêtes quotidiennes avec une disponibilité de 99.98%.
- Réduction du temps de chargement des applications front-end de 45% grâce à la migration vers Next.js et l'optimisation du caching Redis.
- Encadrement technique et mentorat d'une équipe de 5 développeurs juniors et mise en place d'une politique rigoureuse de revue de code.

DÉVELOPPEUR WEB CONFIRMÉ | SaaS Factory, Lyon | 2019 - 2022
- Développement de modules SaaS critiques en TypeScript et React pour 50 000 utilisateurs actifs mensuels.
- Automatisation des pipelines CI/CD réduisant le temps moyen de déploiement de 40 min à 8 min.
- Refonte de la base de données PostgreSQL, améliorant les performances des requêtes analytiques de 60%.

FORMATION & CERTIFICATIONS
- Master Ingénierie Logicielle | Université Claude Bernard Lyon 1 (2019)
- Certification AWS Certified Solutions Architect – Associate (2023)`,
  },
  {
    title: 'Product Owner / Chef de Projet Digital',
    category: 'Produit & Projet',
    content: `PRÉNOM NOM
Product Owner Senior | Parcours Clients & Plateformes E-commerce
Paris, France | 06 11 22 33 44 | prenom.nom@email.com | linkedin.com/in/monprofil

RÉSUMÉ PROFESSIONNEL
Product Owner avec 5 ans d'expérience en pilotage de produits digitaux B2B et B2C à fort trafic. Expert dans l'alignement stratégique entre besoins utilisateurs et contraintes techniques, pilotage par la data (OKR/KPI) et méthodologies Agile Scrum.

EXPÉRIENCE PROFESSIONNELLE

PRODUCT OWNER SENIOR | Retail Digital Hub, Paris | 2021 - Présent
- Pilotage du backlog produit et de la roadmap d'une application mobile e-commerce générant 18M€ de volume d'affaires annuel.
- Augmentation du taux de conversion checkout de +14% sur 12 mois grâce à l'implémentation de tests A/B continus.
- Animation quotidienne des rituels Scrum pour une feature team pluridisciplinaire de 8 ingénieurs, 2 designers UI/UX et 1 Data Analyst.

CHEF DE PROJET DIGITAL | Agence Web Interactive, Nantes | 2018 - 2021
- Direction opérationnelle de 12 refontes de portails web et intranets pour des clients grands comptes (budgets de 80k€ à 250k€).
- Garantie du respect des plannings et des livrables avec un taux de satisfaction client (CSAT) de 94%.

COMPÉTENCES
- Outils Produit : Jira, Confluence, Figma, Miro, Notion, Amplitude, Google Analytics 4
- Méthodes : Agile Scrum, Kanban, Design Thinking, User Research, Priorisation MoSCoW / RICE
- Langues : Français (Natif), Anglais (Courant C1)`,
  },
  {
    title: 'Business Developer / Commercial B2B',
    category: 'Vente & Business',
    content: `PRÉNOM NOM
Business Developer B2B Senior | Vente Solutions SaaS & Tech
Paris, France | 06 99 88 77 66 | prenom.nom@email.com | linkedin.com/in/monprofil

RÉSUMÉ PROFESSIONNEL
Commercial B2B dynamique avec 4 ans de succès prouvés dans l'acquisition de comptes stratégiques et la négociation d'accords pluriannuels en cycle long. Dépassement moyen des objectifs de 125% sur les 3 dernières années.

RÉALISATIONS MAJEURES
- Génération de 1.2M€ de nouvel ARR (Revenu Récurrent Annuel) en 2024 (130% de l'objectif assigné).
- Prospection et signature de 18 comptes du CAC 40 / SBF 120 avec un panier moyen de 65 000€.
- Réduction du cycle de vente de 90 à 58 jours grâce à la qualification systématique MEDDIC.

EXPÉRIENCE PROFESSIONNELLE
BUSINESS DEVELOPER SENIOR | CloudCorp, Paris | 2022 - Présent
ACCOUNT EXECUTIVE | Growth Agency, Lyon | 2020 - 2022

COMPÉTENCES : Prospection multicanale, Négociation C-Level, Salesforce, HubSpot, Salesloft, Méthode MEDDIC.`,
  },
];

export default function CvAssistant({
  currentCvText,
  currentJobText,
  onApplyToCv,
  onNavigateToAnalyzer,
  onNavigateToTracker,
  apiKey,
  hasServerKey,
}: CvAssistantProps) {
  const [activeSubTab, setActiveSubTab] = useState<'generator_cv' | 'generator_letter' | 'ai_tools' | 'guide' | 'templates'>('generator_cv');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Tool 1: Bullet Enhancer
  const [bulletInput, setBulletInput] = useState(SAMPLE_BULLETS[0].bullet);
  const [targetRole, setTargetRole] = useState(SAMPLE_BULLETS[0].role);
  const [isEnhancingBullet, setIsEnhancingBullet] = useState(false);
  const [bulletResult, setBulletResult] = useState<string | null>(null);
  const [bulletCopied, setBulletCopied] = useState(false);
  const [bulletSaved, setBulletSaved] = useState(false);

  // Tool 2: Bio Generator
  const [bioRole, setBioRole] = useState('Product Owner / Chef de Projet Digital');
  const [bioExp, setBioExp] = useState('5 ans');
  const [bioKeywords, setBioKeywords] = useState('Agile Scrum, e-commerce, data analytics, augmentation du taux de conversion');
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [bioResult, setBioResult] = useState<string | null>(null);
  const [bioSaved, setBioSaved] = useState(false);

  // Save bullet to local database
  const handleSaveBulletToDb = async () => {
    if (!bulletResult) return;
    try {
      await localDbClient.saveSuggestion({
        id: `sugg-${Date.now()}`,
        type: 'star_accomplishment',
        title: `Puce STAR - ${targetRole || 'Accomplissement'}`,
        originalText: bulletInput.trim(),
        generatedContent: bulletResult.trim(),
        targetRole: targetRole.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
      setBulletSaved(true);
      setSaveNotice('⭐ Puce STAR enregistrée dans vos suggestions locales !');
      setTimeout(() => {
        setBulletSaved(false);
        setSaveNotice(null);
      }, 3000);
    } catch {
      setSaveNotice('❌ Erreur lors de l\'enregistrement dans la base locale.');
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  // Save bio to local database
  const handleSaveBioToDb = async () => {
    if (!bioResult) return;
    try {
      await localDbClient.saveSuggestion({
        id: `sugg-${Date.now()}`,
        type: 'branding_bio',
        title: `Bio Accroche - ${bioRole || 'Personal Branding'}`,
        originalText: `Mots-clés : ${bioKeywords}`,
        generatedContent: bioResult.trim(),
        targetRole: bioRole.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
      setBioSaved(true);
      setSaveNotice('⭐ Phrase d\'accroche enregistrée dans votre base locale !');
      setTimeout(() => {
        setBioSaved(false);
        setSaveNotice(null);
      }, 3000);
    } catch {
      setSaveNotice('❌ Erreur lors de l\'enregistrement dans la base locale.');
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  // Tool 3: Audit Express
  const [auditCvText, setAuditCvText] = useState(currentCvText || '');
  const [auditRole, setAuditRole] = useState('Poste ciblé');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);

  // FAQ Accordion
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Run Bullet Enhancer
  const handleEnhanceBullet = async () => {
    if (!bulletInput.trim()) return;
    setIsEnhancingBullet(true);
    setBulletResult(null);

    try {
      const res = await fetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enhance_bullet',
          input: bulletInput.trim(),
          targetRole: targetRole.trim(),
          apiKey: apiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la reformulation.');
      }

      setBulletResult(data.result);
    } catch (err: unknown) {
      setBulletResult(`❌ Erreur : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsEnhancingBullet(false);
    }
  };

  // Run Bio Generator
  const handleGenerateBio = async () => {
    if (!bioRole.trim() || !bioKeywords.trim()) return;
    setIsGeneratingBio(true);
    setBioResult(null);

    try {
      const res = await fetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_bio',
          input: bioKeywords.trim(),
          targetRole: bioRole.trim(),
          yearsExp: bioExp.trim(),
          apiKey: apiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération de la bio.');
      }

      setBioResult(data.result);
    } catch (err: unknown) {
      setBioResult(`❌ Erreur : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGeneratingBio(false);
    }
  };

  // Run Audit Express
  const handleAuditCv = async () => {
    if (!auditCvText.trim()) return;
    setIsAuditing(true);
    setAuditResult(null);

    try {
      const res = await fetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'audit_cv',
          input: auditCvText.trim(),
          targetRole: auditRole.trim(),
          apiKey: apiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l’audit.');
      }

      setAuditResult(data.result);
    } catch (err: unknown) {
      setAuditResult(`❌ Erreur : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setBulletCopied(true);
    setTimeout(() => setBulletCopied(false), 2000);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* En-tête de l'Assistant */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              Générateurs & Assistant de Candidature IA
            </h1>
            <span className="text-xs bg-purple-100 text-purple-800 font-semibold px-2.5 py-0.5 rounded-full">
              CV, Lettres & Optimisation ATS
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-3xl">
            Générez votre CV et votre lettre de motivation sur-mesure pour chaque offre d&apos;emploi, formulez des puces STAR quantifiées et appliquez les critères d&apos;évaluation des recruteurs.
          </p>
        </div>

        {/* Sous-onglets */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('generator_cv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'generator_cv'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Générateur de CV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('generator_letter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'generator_letter'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Lettre de Motivation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ai_tools')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'ai_tools'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Ateliers STAR & Bio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('templates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'templates'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Modèles ATS Prêts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'guide'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guide & FAQ</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {saveNotice && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* =========================================================================
          SOUS-ONGLET 1 : GÉNÉRATEUR ASSISTÉ DE CV
         ========================================================================= */}
      {activeSubTab === 'generator_cv' && (
        <CvGeneratorTool
          currentCvText={currentCvText}
          currentJobText={currentJobText}
          onApplyToCv={onApplyToCv}
          onNavigateToAnalyzer={onNavigateToAnalyzer}
          apiKey={apiKey}
          hasServerKey={hasServerKey}
        />
      )}

      {/* =========================================================================
          SOUS-ONGLET 2 : GÉNÉRATEUR ASSISTÉ DE LETTRE DE MOTIVATION
         ========================================================================= */}
      {activeSubTab === 'generator_letter' && (
        <CoverLetterGeneratorTool
          currentCvText={currentCvText}
          currentJobText={currentJobText}
          apiKey={apiKey}
          hasServerKey={hasServerKey}
          onNavigateToTracker={onNavigateToTracker}
        />
      )}

      {/* =========================================================================
          SOUS-ONGLET 3 : OUTILS IA INTERACTIFS (STAR, ACCROCHE, AUDIT)
         ========================================================================= */}
      {activeSubTab === 'ai_tools' && (
        <div className="space-y-6">
          {/* Outil 1 : Formulateur d'Accomplissements STAR / Google X-Y-Z */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                  <Zap className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    1. Formulateur d&apos;Impact (Formule Google X-Y-Z & STAR)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Transforme une tâche basique en une réalisation à fort impact : <em>« Accompli [X], mesuré par [Y], en faisant [Z] »</em>.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Méthode STAR
              </span>
            </div>

            {/* Suggestions rapides */}
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Exemples fréquents à tester en 1 clic :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_BULLETS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setBulletInput(item.bullet);
                      setTargetRole(item.role);
                    }}
                    className="text-[11px] text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg transition-colors text-left"
                  >
                    <span className="font-semibold text-gray-900">{item.role} :</span> « {item.bullet.slice(0, 40)}... »
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Intitulé du poste ciblé :
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="ex: Chef de Projet Digital"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Puce ou tâche de CV à valoriser :
                </label>
                <input
                  type="text"
                  value={bulletInput}
                  onChange={(e) => setBulletInput(e.target.value)}
                  placeholder="ex: J'ai géré le planning et la relation avec les clients..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isEnhancingBullet || !bulletInput.trim()}
              onClick={handleEnhanceBullet}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                isEnhancingBullet
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-[#FF4B4B] hover:bg-[#ff3333] text-white shadow-xs cursor-pointer'
              }`}
            >
              {isEnhancingBullet ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Optimisation par Gemini avec métriques et verbes d&apos;action...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✨ Générer 3 versions d&apos;impact chiffrées (STAR)</span>
                </>
              )}
            </button>

            {bulletResult && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Propositions générées par l&apos;IA
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveBulletToDb}
                      className="text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                      title="Sauvegarder ces puces dans votre base locale"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{bulletSaved ? 'Sauvegardé !' : '💾 Sauvegarder dans ma BDD'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(bulletResult)}
                      className="text-[11px] text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium bg-white border border-gray-200 px-2.5 py-1 rounded-lg"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{bulletCopied ? 'Copié !' : 'Copier tout'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-800 leading-relaxed prose prose-sm max-w-none bg-white p-3.5 rounded-lg border border-gray-200">
                  <pre className="whitespace-pre-wrap font-sans text-xs">{bulletResult}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Outil 2 : Générateur d'Accroche / Bio de CV */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                  <Lightbulb className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    2. Générateur de Résumé & Phrase d&apos;Accroche (En-tête de CV)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Les 3 premières lignes que lit le recruteur. Créez un profil captivant en 3 variantes stratégiques.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                Personal Branding
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Poste visé :
                </label>
                <input
                  type="text"
                  value={bioRole}
                  onChange={(e) => setBioRole(e.target.value)}
                  placeholder="ex: Product Manager"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Années d&apos;expérience :
                </label>
                <input
                  type="text"
                  value={bioExp}
                  onChange={(e) => setBioExp(e.target.value)}
                  placeholder="ex: 5 ans"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mots-clés / Atouts majeurs :
                </label>
                <input
                  type="text"
                  value={bioKeywords}
                  onChange={(e) => setBioKeywords(e.target.value)}
                  placeholder="ex: Python, ROI, B2B, Management"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isGeneratingBio || !bioRole.trim()}
              onClick={handleGenerateBio}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                isGeneratingBio
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer'
              }`}
            >
              {isGeneratingBio ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Rédaction des 3 approches de personal branding...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>✍️ Générer mon résumé en 3 approches distinctes</span>
                </>
              )}
            </button>

            {bioResult && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Variantes d&apos;accroches générées
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveBioToDb}
                      className="text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                      title="Sauvegarder cette bio dans votre base locale"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{bioSaved ? 'Sauvegardé !' : '💾 Sauvegarder dans ma BDD'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(bioResult)}
                      className="text-[11px] text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium bg-white border border-gray-200 px-2.5 py-1 rounded-lg"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier tout</span>
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-800 leading-relaxed bg-white p-3.5 rounded-lg border border-gray-200">
                  <pre className="whitespace-pre-wrap font-sans text-xs">{bioResult}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Outil 3 : Diagnostic & Audit de CV Express */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                  <FileCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    3. Diagnostic & Audit Qualité Express du CV
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Détecte les verbes d&apos;action manquants, les zones sans chiffres et les opportunités d&apos;amélioration.
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                Audit 360°
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700">
                  Texte du CV à auditer :
                </label>
                {currentCvText && (
                  <button
                    type="button"
                    onClick={() => setAuditCvText(currentCvText)}
                    className="text-[11px] text-purple-600 hover:underline font-semibold"
                  >
                    🔄 Charger le CV présent dans l&apos;Analyseur
                  </button>
                )}
              </div>

              <textarea
                rows={5}
                value={auditCvText}
                onChange={(e) => setAuditCvText(e.target.value)}
                placeholder="Collez ici le texte de votre CV à auditer..."
                className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono"
              />

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={auditRole}
                  onChange={(e) => setAuditRole(e.target.value)}
                  placeholder="Poste ciblé (ex: Développeur Senior, Responsable RH...)"
                  className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />

                <button
                  type="button"
                  disabled={isAuditing || !auditCvText.trim()}
                  onClick={handleAuditCv}
                  className={`py-2 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
                    isAuditing
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer'
                  }`}
                >
                  {isAuditing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Audit en cours...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Lancer l&apos;audit express</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {auditResult && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    Rapport d&apos;audit qualité
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(auditResult)}
                    className="text-[11px] text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium bg-white border border-gray-200 px-2.5 py-1 rounded-lg"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </button>
                </div>
                <div className="text-xs text-gray-800 leading-relaxed bg-white p-3.5 rounded-lg border border-gray-200">
                  <pre className="whitespace-pre-wrap font-sans text-xs">{auditResult}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SOUS-ONGLET 2 : GUIDE MÉTHODOLOGIQUE COMPLET (LES 7 RÈGLES D'OR)
         ========================================================================= */}
      {activeSubTab === 'guide' && (
        <div className="space-y-6">
          {/* Les 7 Piliers Fondamentaux */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Les 7 Règles d&apos;Or du CV Anti-Rejet ATS en 2025/2026
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Plus de 75% des CV sont filtrés automatiquement avant même d&apos;atteindre les yeux d&apos;un humain. Voici comment vous assurer que le vôtre arrive en haut de la pile.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
                    1
                  </span>
                  Le Titre Miroir de l&apos;Offre
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ne mettez pas un titre générique comme <em>« Ingénieur »</em> ou <em>« Recherche de stage »</em>. Reprenez exactement l&apos;intitulé de l&apos;offre (ex: <em>« Chef de Projet Digital E-commerce »</em>) dans votre en-tête pour maximiser le score de parsing immédiat.
                </p>
              </div>

              <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
                    2
                  </span>
                  Chiffrez Systématiquement (Google X-Y-Z)
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Chaque puce doit idéalement comporter un chiffre, un pourcentage, un budget ou une durée. Une puce avec <em>« +25% de conversion »</em> a 4 fois plus d&apos;impact qu&apos;une description passive.
                </p>
              </div>

              <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
                    3
                  </span>
                  Mise en Page Lisible par les Robots
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Évitez les tableaux complexes à deux colonnes imbriquées, les zones de texte flottantes et les graphiques d&apos;auto-évaluation à étoiles (ex: <em>« Photoshop : 4/5 étoiles »</em>). Les parseurs ATS ne savent pas les lire.
                </p>
              </div>

              <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
                    4
                  </span>
                  La Règle des 6 Premières Secondes
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Le tiers supérieur de votre CV est décisif. Votre nom, votre titre miroir, vos coordonnées et votre résumé de 3 lignes percutant doivent capter l&apos;attention instantanément.
                </p>
              </div>

              <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
                    5
                  </span>
                  Verbes d&apos;Action Énergiques
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Bannissez <em>« En charge de... »</em> ou <em>« Participation à... »</em>. Préférez : <em>« Déployé »</em>, <em>« Négocié »</em>, <em>« Automatisé »</em>, <em>« Doublé »</em>, <em>« Fédéré »</em>.
                </p>
              </div>

              <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
                    6
                  </span>
                  Format de Fichier Idéal
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Exportez toujours en PDF généré numériquement (non scanné) ou en DOCX propre. Nommez votre fichier de manière professionnelle : <code>Prenom_Nom_CV_IntitulePoste.pdf</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Exemple Avant / Après */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Comparatif concret : « Avant / Après »
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  À BANNIR (Trop passif, 0 chiffre)
                </div>
                <ul className="text-xs text-rose-950 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>« Responsable du site internet de l&apos;entreprise. »</li>
                  <li>« Travail en équipe avec les commerciaux. »</li>
                  <li>« Gestion des réseaux sociaux et création de posts. »</li>
                  <li>« Résolution de bugs techniques. »</li>
                </ul>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  À ADOPTER (STAR + Chiffres + Impact)
                </div>
                <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>« Pilotage de la refonte du site vitrine, augmentant le trafic organique de <strong>+65%</strong> en 6 mois. »</li>
                  <li>« Fédéré une équipe transverse de <strong>6 personnes</strong> pour livrer le projet avec 2 semaines d&apos;avance. »</li>
                  <li>« Développé l&apos;audience LinkedIn de <strong>2 000 à 15 000 abonnés</strong> avec un taux d&apos;engagement de 4.8%. »</li>
                  <li>« Résolu <strong>120+ tickets critiques</strong> en divisant le temps moyen de traitement par 2. »</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Modèle de Mail de Relance */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                Modèle d&apos;e-mail de relance percutant (à J+7 après candidature)
              </h3>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(`Objet : Candidature au poste de [Intitulé du poste] – [Votre Prénom et Nom]

Bonjour [Nom du recruteur ou Madame/Monsieur],

Je me permets de revenir vers vous suite à ma candidature déposée le [Date] pour le poste de [Intitulé du poste] au sein de [Nom de l'entreprise].

Particulièrement enthousiaste à l'idée de contribuer à [citer un projet ou défi de l'entreprise], je souhaitais m'assurer de la bonne réception de mon dossier et vous réitérer mon vif intérêt pour ce rôle.

Mon parcours me permettrait d'être immédiatement opérationnel, notamment sur [citer 1 compétence clé en lien avec l'offre].

Je reste à votre entière disposition pour tout échange téléphonique ou entretien.

Bien cordialement,
[Votre Prénom et Nom]
[Votre Numéro de téléphone] | [Lien LinkedIn]`)
                }
                className="text-[11px] text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-lg font-semibold flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le modèle de relance</span>
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs font-mono text-gray-700 leading-relaxed">
              <p><strong>Objet :</strong> Candidature au poste de [Intitulé du poste] – [Votre Prénom et Nom]</p>
              <br />
              <p>Bonjour [Nom du recruteur ou Madame/Monsieur],</p>
              <br />
              <p>Je me permets de revenir vers vous suite à ma candidature déposée le [Date] pour le poste de [Intitulé du poste] au sein de [Nom de l&apos;entreprise].</p>
              <br />
              <p>Particulièrement enthousiaste à l&apos;idée de contribuer à [citer un défi de l&apos;entreprise], je souhaitais m&apos;assurer de la bonne réception de mon dossier et vous réitérer mon vif intérêt pour ce rôle.</p>
              <br />
              <p>Mon parcours me permettrait d&apos;être immédiatement opérationnel, notamment sur [citer 1 compétence clé].</p>
              <br />
              <p>Bien cordialement,<br />[Votre Prénom et Nom] | [Téléphone] | [Lien LinkedIn]</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SOUS-ONGLET 3 : MODÈLES ATS PRÊTS À L'EMPLOI
         ========================================================================= */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Modèles de CV Textuels Prêts à l&apos;Emploi (Format ATS)
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Ces trames respectent l&apos;ordre de lecture idéal des logiciels de recrutement. Vous pouvez copier un modèle ou l&apos;injecter en 1 clic dans l&apos;Analyseur pour tester son adéquation avec une offre.
            </p>

            <div className="grid grid-cols-1 gap-5">
              {TEMPLATES.map((tmpl, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-3">
                    <div>
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                        {tmpl.category}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 mt-1">
                        {tmpl.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tmpl.content)}
                        className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyToCv(tmpl.content);
                          onNavigateToAnalyzer();
                        }}
                        className="text-xs font-bold text-white bg-[#FF4B4B] hover:bg-[#ff3333] px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Tester dans l&apos;Analyseur</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 max-h-60 overflow-y-auto font-mono text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {tmpl.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
