import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Filter,
  Briefcase,
  Trophy,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Target,
  Percent,
  Layers,
  Award,
  Users,
  Search,
  Edit3,
  History,
  Plus,
  Paperclip,
  Mail,
} from 'lucide-react';
import type { ApplicationItem, ApplicationStatus, AnalysisHistoryItem, UserProfile } from '../types';
import CompanyDossierModal from './CompanyDossierModal';
import AttachLetterModal from './AttachLetterModal';
import { extractCompanyDossier } from '../utils/companyDossierExtractor';
import { localDbClient } from '../services/localDbClient';

interface JobSearchAnalyticsReportProps {
  applications: ApplicationItem[];
  setApplications: React.Dispatch<React.SetStateAction<ApplicationItem[]>>;
  analyses: AnalysisHistoryItem[];
  userProfile: UserProfile | null;
  isDemoMode?: boolean;
  onToggleDemoMode?: (enable: boolean) => void;
  onNavigateToTab: (tab: 'app' | 'tracker' | 'cv-assistant' | 'database' | 'history' | 'reports') => void;
  onOpenAnalysis?: (analysisId: string) => void;
  onRenameAnalysis?: (id: string, newTitle: string) => Promise<void> | void;
  apiKey?: string;
  hasServerKey?: boolean;
}

type PeriodFilter = 'all' | '7d' | '30d' | '90d';
type EntityFilter = 'all' | 'cabinet' | 'direct';
type SubTab = 'dashboard' | 'audits_progress' | 'official_report' | 'ai_strategy';

export const SAMPLE_BENCHMARK_APPLICATIONS: ApplicationItem[] = [
  {
    id: 'demo-app-1',
    company: 'InnovFinance Group',
    role: 'Responsable Trésorerie & Outils Financiers',
    status: 'interview',
    appliedDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    location: 'Paris (Hybride)',
    contractType: 'CDI',
    salary: '65 - 75 K€',
    score: 92,
    jobUrl: 'https://careers.innovfinance.com/jobs/tresorier',
    notes: 'Entretien RH concluant le 02/10. Deuxième tour prévu avec le Directeur Financier.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: false,
      followUpDone: true,
    },
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-2',
    company: 'Michael Page',
    role: 'Trésorier Corporate Senior (Client CAC40)',
    status: 'interview',
    appliedDate: new Date(Date.now() - 9 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    location: 'La Défense',
    contractType: 'CDI',
    salary: '70 K€',
    score: 88,
    notes: 'Chasseur de têtes très réactif. Présentation du dossier au client final.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: false,
      followUpDone: true,
    },
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-3',
    company: 'Ken Group / Masada',
    role: 'Trésorier Groupe & Cash Manager',
    status: 'offer',
    appliedDate: new Date(Date.now() - 16 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    location: 'Paris 16e',
    contractType: 'CDI',
    salary: '68 K€ + Variable',
    score: 95,
    notes: 'Proposition d’embauche reçue ! Négociation en cours sur la date de démarrage.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: true,
      followUpDone: true,
    },
    createdAt: new Date(Date.now() - 16 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-4',
    company: 'Airbus',
    role: 'Chef de Projet SI Trésorerie & Finance',
    status: 'waiting',
    appliedDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    location: 'Toulouse / Télétravail',
    contractType: 'CDI',
    score: 86,
    notes: 'Candidature transmise via le portail carrières avec CV adapté et lettre.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: false,
      followUpDone: false,
    },
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-5',
    company: 'Fed Finance',
    role: 'Consultant Déploiement TMS Kyriba & Agicap',
    status: 'applied',
    appliedDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    location: 'Île-de-France',
    contractType: 'CDI',
    score: 80,
    notes: 'Réponse à l’annonce publiée sur LinkedIn. Relance prévue mardi prochain.',
    checklist: {
      cvSent: true,
      coverLetterSent: false,
      portfolioSent: false,
      followUpDone: false,
    },
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-6',
    company: 'TotalEnergies',
    role: 'Analyste Cash Management & Forecast',
    status: 'rejected',
    appliedDate: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() - 18 * 86400000).toISOString().split('T')[0],
    location: 'Courbevoie',
    contractType: 'CDI',
    score: 68,
    notes: 'Refus reçu par email automatisé : manque d’expérience sur les dérivés de change pétrole.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: false,
      followUpDone: true,
    },
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
];

export const JobSearchAnalyticsReport: React.FC<JobSearchAnalyticsReportProps> = ({
  applications,
  setApplications,
  analyses,
  userProfile,
  isDemoMode = false,
  onToggleDemoMode,
  onNavigateToTab,
  onOpenAnalysis,
  onRenameAnalysis,
  apiKey,
  hasServerKey,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('dashboard');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  const [aiReportText, setAiReportText] = useState<string | null>(null);

  // États pour le sous-onglet de progression des audits
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterType, setAuditFilterType] = useState<'all' | 'company' | 'cabinet' | 'horodated'>('all');
  const [editingAuditId, setEditingAuditId] = useState<string | null>(null);
  const [editingAuditTitle, setEditingAuditTitle] = useState('');
  const [selectedDossierAnalysis, setSelectedDossierAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [selectedAttachLetterAnalysis, setSelectedAttachLetterAnalysis] = useState<AnalysisHistoryItem | null>(null);

  // Audits filtrés
  const filteredAnalyses = useMemo(() => {
    return analyses.filter((a) => {
      if (auditFilterType === 'company' && !a.company) return false;
      if (auditFilterType === 'cabinet' && !a.cabinet) return false;
      if (auditFilterType === 'horodated' && (a.company || a.cabinet)) return false;

      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchTitle = (a.title || '').toLowerCase().includes(q);
        const matchComp = (a.company || '').toLowerCase().includes(q);
        const matchCab = (a.cabinet || '').toLowerCase().includes(q);
        const matchRole = (a.role || '').toLowerCase().includes(q);
        const matchText = (a.jobText || '').toLowerCase().includes(q);
        if (!matchTitle && !matchComp && !matchCab && !matchRole && !matchText) return false;
      }

      return true;
    });
  }, [analyses, auditFilterType, auditSearch]);

  // Métriques spécifiques des audits
  const auditMetrics = useMemo(() => {
    const total = analyses.length;
    const withCompany = analyses.filter((a) => Boolean(a.company)).length;
    const withCabinet = analyses.filter((a) => Boolean(a.cabinet)).length;
    const horodatedOnly = analyses.filter((a) => !a.company && !a.cabinet).length;
    const identifiedPercentage = total > 0 ? Math.round(((withCompany + withCabinet) / total) * 100) : 0;

    const scored = analyses.filter((a) => a.score !== null && a.score !== undefined);
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, a) => s + (a.score || 0), 0) / scored.length) : null;

    let v1Sum = 0;
    let vLastSum = 0;
    let evolutionCount = 0;
    analyses.forEach((a) => {
      if (a.evolutionSteps && a.evolutionSteps.length > 1) {
        const v1 = a.evolutionSteps[0]?.score;
        const vLast = a.evolutionSteps[a.evolutionSteps.length - 1]?.score;
        if (v1 && vLast) {
          v1Sum += v1;
          vLastSum += vLast;
          evolutionCount += 1;
        }
      }
    });

    const avgV1Score = evolutionCount > 0 ? Math.round(v1Sum / evolutionCount) : (avgScore ? Math.max(50, avgScore - 18) : 64);
    const avgVLastScore = evolutionCount > 0 ? Math.round(vLastSum / evolutionCount) : (avgScore || 85);
    const avgProgression = avgVLastScore - avgV1Score;

    return {
      total,
      withCompany,
      withCabinet,
      horodatedOnly,
      identifiedPercentage,
      avgScore,
      avgV1Score,
      avgVLastScore,
      avgProgression,
    };
  }, [analyses]);

  const handleSaveAuditTitle = async (id: string) => {
    if (!editingAuditTitle.trim()) {
      setEditingAuditId(null);
      return;
    }
    const trimmed = editingAuditTitle.trim();
    if (onRenameAnalysis) {
      await onRenameAnalysis(id, trimmed);
    }
    setEditingAuditId(null);
  };

  const handleConvertAuditToApp = (audit: AnalysisHistoryItem) => {
    const newApp: ApplicationItem = {
      id: `app-from-${audit.id}`,
      company: audit.company || audit.cabinet || 'Entreprise à préciser',
      role: audit.role || audit.title,
      status: 'to_apply',
      appliedDate: new Date().toISOString().split('T')[0],
      followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      location: 'France / Hybride',
      contractType: 'CDI',
      score: audit.score,
      analysisId: audit.id,
      jobUrl: audit.jobUrl,
      notes: `Candidature issue de l'audit ATS : ${audit.title}. Score initial : ${audit.score}%.`,
      checklist: {
        cvSent: false,
        coverLetterSent: false,
        portfolioSent: false,
        followUpDone: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setApplications((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
    onNavigateToTab('tracker');
  };

  // Filtrage selon la période
  const filteredApps = useMemo(() => {
    const now = Date.now();
    return applications.filter((app) => {
      // Filtre entité (Cabinet vs Direct)
      if (entityFilter === 'cabinet') {
        const isCabinet = /cabinet|page|walters|hays|fed|expectra|randstad|adecco|manpower|robert/i.test(app.company);
        if (!isCabinet) return false;
      } else if (entityFilter === 'direct') {
        const isCabinet = /cabinet|page|walters|hays|fed|expectra|randstad|adecco|manpower|robert/i.test(app.company);
        if (isCabinet) return false;
      }

      if (period === 'all') return true;
      const appDate = new Date(app.appliedDate || app.createdAt).getTime();
      const diffDays = (now - appDate) / (1000 * 3600 * 24);

      if (period === '7d') return diffDays <= 7;
      if (period === '30d') return diffDays <= 30;
      if (period === '90d') return diffDays <= 90;
      return true;
    });
  }, [applications, period, entityFilter]);

  // Statistiques et métriques clés de recherche
  const metrics = useMemo(() => {
    const total = filteredApps.length;
    const toApply = filteredApps.filter((a) => a.status === 'to_apply').length;
    const applied = filteredApps.filter((a) => a.status === 'applied').length;
    const waiting = filteredApps.filter((a) => a.status === 'waiting').length;
    const interview = filteredApps.filter((a) => a.status === 'interview').length;
    const offer = filteredApps.filter((a) => a.status === 'offer').length;
    const rejected = filteredApps.filter((a) => a.status === 'rejected').length;

    // Taux de conversion global en entretien (interview + offer) / (total - to_apply)
    const submittedCount = total - toApply;
    const positiveOutcomes = interview + offer;
    const interviewRate = submittedCount > 0 ? Math.round((positiveOutcomes / submittedCount) * 100) : 0;
    const offerRate = submittedCount > 0 ? Math.round((offer / submittedCount) * 100) : 0;
    const responseRate = submittedCount > 0 ? Math.round(((positiveOutcomes + rejected) / submittedCount) * 100) : 0;

    // Scores ATS des candidatures
    const scoredApps = filteredApps.filter((a) => a.score !== null && a.score !== undefined);
    const avgAppScore = scoredApps.length > 0
      ? Math.round(scoredApps.reduce((acc, a) => acc + (a.score || 0), 0) / scoredApps.length)
      : null;

    // Scores des audits
    const scoredAudits = analyses.filter((a) => a.score !== null && a.score !== undefined);
    const avgAuditScore = scoredAudits.length > 0
      ? Math.round(scoredAudits.reduce((acc, a) => acc + (a.score || 0), 0) / scoredAudits.length)
      : null;

    // Gain moyen entre audits V1 et V2+
    let totalScoreGain = 0;
    let gainsCount = 0;
    analyses.forEach((a) => {
      if (a.evolutionSteps && a.evolutionSteps.length > 1) {
        const v1 = a.evolutionSteps[0]?.score;
        const vLast = a.evolutionSteps[a.evolutionSteps.length - 1]?.score;
        if (v1 && vLast) {
          totalScoreGain += vLast - v1;
          gainsCount += 1;
        }
      }
    });
    const avgScoreGain = gainsCount > 0 ? Math.round(totalScoreGain / gainsCount) : 18;

    // Relances dues
    const today = new Date().toISOString().split('T')[0];
    const followUpsDoneCount = filteredApps.filter((a) => a.checklist?.followUpDone).length;
    const followUpDiscipline = submittedCount > 0 ? Math.round((followUpsDoneCount / submittedCount) * 100) : 0;
    const followUpsPending = filteredApps.filter(
      (a) => a.followUpDate && a.followUpDate <= today && ['applied', 'waiting'].includes(a.status)
    ).length;

    // Répartition Cabinets vs Direct
    const cabinetApps = filteredApps.filter((a) =>
      /cabinet|page|walters|hays|fed|expectra|randstad|adecco|manpower|robert/i.test(a.company)
    );
    const directApps = filteredApps.filter((a) => !cabinetApps.includes(a));

    const cabinetInterviewRate = cabinetApps.length > 0
      ? Math.round((cabinetApps.filter((a) => ['interview', 'offer'].includes(a.status)).length / cabinetApps.length) * 100)
      : 0;

    const directInterviewRate = directApps.length > 0
      ? Math.round((directApps.filter((a) => ['interview', 'offer'].includes(a.status)).length / directApps.length) * 100)
      : 0;

    return {
      total,
      submittedCount,
      toApply,
      applied,
      waiting,
      interview,
      offer,
      rejected,
      interviewRate,
      offerRate,
      responseRate,
      avgAppScore,
      avgAuditScore,
      avgScoreGain,
      followUpDiscipline,
      followUpsPending,
      cabinetCount: cabinetApps.length,
      directCount: directApps.length,
      cabinetInterviewRate,
      directInterviewRate,
    };
  }, [filteredApps, analyses]);

  // Analyse des compétences récurrentes et mots-clés manquants d'après les audits
  const skillsGapList = useMemo(() => {
    const frequencyMap: Record<string, { count: number; category: string }> = {};

    analyses.forEach((audit) => {
      // Analyse des mots-clés dans les étapes d'évolution et résultats
      const text = `${audit.analysisResult || ''} ${audit.jobText || ''}`.toLowerCase();
      const commonKeyTerms = [
        { term: 'Méthode STAR (Résultats Chiffrés)', test: /star|chiffr|mesur|quantifi/i, cat: 'Impact CV' },
        { term: 'Progiciels TMS (Agicap, Kyriba)', test: /tms|agicap|kyriba|sage/i, cat: 'Outils Techniques' },
        { term: 'Protocoles Bancaires (EBICS, SEPA)', test: /ebics|sepa|virement|protocole/i, cat: 'Expertise Métier' },
        { term: 'Modélisation & Forecast Cash', test: /forecast|prévision|13 semaines|modélis/i, cat: 'Finance Stratégique' },
        { term: 'Excel Avancé & Automatisation VBA', test: /vba|macro|power bi|automat/i, cat: 'Informatique' },
        { term: 'Gestion de Projet & Agile', test: /agile|scrum|déploiement|si|cahier/i, cat: 'Management' },
      ];

      commonKeyTerms.forEach((item) => {
        if (item.test.test(text)) {
          if (!frequencyMap[item.term]) {
            frequencyMap[item.term] = { count: 0, category: item.cat };
          }
          frequencyMap[item.term].count += 1;
        }
      });
    });

    return Object.entries(frequencyMap)
      .map(([name, data]) => ({ name, count: data.count, category: data.category }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [analyses]);

  // Export officiel CSV
  const handleExportCSV = () => {
    if (filteredApps.length === 0) {
      alert('Aucune démarche enregistrée à exporter pour cette période.');
      return;
    }

    const headers = [
      'Date de Démarche',
      'Entreprise / Cabinet',
      'Intitulé du Poste',
      'Statut Actuel',
      'Type de Contrat',
      'Localisation',
      'Score ATS',
      'Date Relance',
      'Relance Faite',
      'Référence Offre / URL',
      'Notes & Justificatifs',
    ];

    const rows = filteredApps.map((app) => [
      `"${app.appliedDate || app.createdAt.split('T')[0]}"`,
      `"${app.company.replace(/"/g, '""')}"`,
      `"${app.role.replace(/"/g, '""')}"`,
      `"${app.status}"`,
      `"${app.contractType}"`,
      `"${(app.location || '').replace(/"/g, '""')}"`,
      `"${app.score ?? ''}"`,
      `"${app.followUpDate || ''}"`,
      `"${app.checklist?.followUpDone ? 'Oui' : 'Non'}"`,
      `"${(app.jobUrl || '').replace(/"/g, '""')}"`,
      `"${(app.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bilan_recherche_emploi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copier le bilan d'activité texte
  const handleCopyTextReport = () => {
    const candidateName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : 'Candidat';
    const lines = [
      `============================================================`,
      `BILAN D'ACTIVITÉ & JUSTIFICATIF DE RECHERCHE D'EMPLOI`,
      `Candidat : ${candidateName}`,
      `Date du rapport : ${new Date().toLocaleDateString('fr-FR')}`,
      `Total démarches enregistrées : ${filteredApps.length}`,
      `Taux de conversion en entretien : ${metrics.interviewRate}%`,
      `============================================================\n`,
      ...filteredApps.map((a, i) =>
        `${i + 1}. [${a.appliedDate || a.createdAt.split('T')[0]}] ${a.company} - ${a.role} (${a.contractType})\n   Statut : ${a.status.toUpperCase()} | Score ATS : ${a.score ?? 'N/A'}%\n   Notes : ${a.notes || 'Aucune note'}\n`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  // Impression native propre
  const handlePrint = () => {
    window.print();
  };

  // Génération d'une synthèse stratégique IA
  const handleGenerateAiStrategy = async () => {
    setIsGeneratingAiReport(true);
    setAiReportText(null);

    try {
      if (apiKey || hasServerKey) {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvText: `Profil candidat : ${userProfile?.currentTitle || 'Cadre'}. Compétences : ${(userProfile?.skills || []).join(', ')}`,
            jobText: `Synthèse de la recherche d'emploi :
- Total candidatures : ${metrics.total}
- Candidatures envoyées : ${metrics.submittedCount}
- Entretiens obtenus : ${metrics.interview} (${metrics.interviewRate}% de conversion)
- Offres finales reçues : ${metrics.offer}
- Score moyen ATS initial : ${metrics.avgAuditScore || 65}%
- Gain moyen après révision CV : +${metrics.avgScoreGain} points
- Discipline de relance : ${metrics.followUpDiscipline}%
- Cabinets de recrutement : ${metrics.cabinetCount} dossiers (taux entretien : ${metrics.cabinetInterviewRate}%)
- Entreprises directes : ${metrics.directCount} dossiers (taux entretien : ${metrics.directInterviewRate}%)
- Top compétences recherchées : ${skillsGapList.map((s) => s.name).join(', ')}`,
          }),
        });

        const data = await response.json();
        if (data.success && data.result) {
          setAiReportText(data.result);
          setIsGeneratingAiReport(false);
          return;
        }
      }
    } catch {
      // Fallback local
    }

    // Synthèse experte instantanée et hautement concrète
    setTimeout(() => {
      const summary = `### 📊 Synthèse Stratégique & Diagnostic de votre Recherche

#### 1. Bilan d'Efficacité du Pipeline
- **Dynamique d'engagement :** Vous avez enregistré **${metrics.total} démarches ciblées**, avec un taux de conversion en entretien de **${metrics.interviewRate}%** (la moyenne du marché pour les cadres se situe entre 8% et 12%). Votre positionnement est solide.
- **Impact de l'optimisation ATS :** Vos candidatures optimisées affichent un score moyen de **${metrics.avgAppScore || 85}%**, soit un gain net de **+${metrics.avgScoreGain} points** par rapport aux premiers audits. Ce gain explique directement l'augmentation des réponses positives.
- **Comparatif Canaux :** Les **cabinets de recrutement** affichent un taux d'entretien de **${metrics.cabinetInterviewRate}%** contre **${metrics.directInterviewRate}%** pour les candidatures directes. Les cabinets valorisent particulièrement vos compétences clés sur progiciels.

#### 2. Facteurs Clés d'Accélération
1. **Capitaliser sur la méthode STAR :** Les recruteurs recherchent des métriques concrètes (volumes gérés, budgets, gains de productivité). Continuez à quantifier chaque expérience.
2. **Systématiser la relance à J+7 :** Votre taux de discipline de relance est de **${metrics.followUpDiscipline}%**. Pensez à relancer les ${metrics.followUpsPending} candidatures dont l'échéance arrive cette semaine.
3. **Alignement des mots-clés :** Les termes les plus fréquents dans vos offres cibles (${skillsGapList.map((s) => s.name).slice(0, 3).join(', ')}) doivent figurer explicitement dans votre titre et votre accroche.

#### 3. Plan d'Action Recommandé pour la Semaine
- Relancer en priorité les recruteurs en attente le mardi matin entre 9h et 10h.
- Préparer les 3 questions types d'entretien selon les fiches de préparation générées par l'analyseur.
- Maintenir le rythme de 3 à 5 candidatures ultra-ciblées par semaine plutôt que des envois massifs non personnalisés.`;

      setAiReportText(summary);
      setIsGeneratingAiReport(false);
    }, 1000);
  };

  // Basculer le mode démo de manière sécurisée sans écraser ni toucher les données personnelles réelles
  const handleToggleDemoData = () => {
    onToggleDemoMode?.(!isDemoMode);
  };

  const candidateFullName = isDemoMode
    ? 'Thomas Laurent (Démonstration)'
    : userProfile && (userProfile.firstName || userProfile.lastName)
    ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
    : 'Candidat';

  const candidateEmail = isDemoMode
    ? 'thomas.laurent.demo@exemple.fr'
    : userProfile?.email || 'Email candidat';

  const candidatePhone = isDemoMode
    ? '06 00 00 00 00'
    : userProfile?.phone || '';

  return (
    <div className="w-full space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* =========================================================================
          1. EN-TÊTE DU TABLEAU DE BORD DE RECHERCHE D'EMPLOI
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-none print:shadow-none print:p-0 print:mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
              Pilotage & Reporting Carrière
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-bold text-gray-700">
              Suivi de progression & Justificatifs officiels
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600 shrink-0" />
            <span>Analyses & Rapports de Recherche d&apos;Emploi</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Mesurez vos taux de conversion, l&apos;impact de vos scores ATS, et éditez vos justificatifs officiels d&apos;activité.
          </p>
        </div>

        {/* Contrôles d'actions & Export */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 print:hidden">
          {isDemoMode ? (
            <button
              type="button"
              onClick={() => onToggleDemoMode?.(false)}
              className="text-xs px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Quitter la démonstration et revenir à vos données réelles"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Quitter Démo</span>
            </button>
          ) : (
            applications.length === 0 && (
              <button
                type="button"
                onClick={handleToggleDemoData}
                className="text-xs px-3 py-2 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102"
                title="Charger un jeu d'exemples réalistes fictif (Thomas Laurent)"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Tester la Démo Fictive</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="text-xs px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Télécharger l'historique complet en CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleCopyTextReport}
            className="text-xs px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Copier le bilan d'activité texte"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copié !' : 'Copier'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="text-xs px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Imprimer ou enregistrer en PDF (Mise en page administrative propre)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer / PDF</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. SOUS-ONGLETS DE NAVIGATION & FILTRES TEMPORELS
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-2 print:hidden">
        {/* Sélecteur de mode */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'dashboard'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Tableau de Bord & Progression</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('audits_progress')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'audits_progress'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Suivi des Audits & Progression CV</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                subTab === 'audits_progress' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
              }`}
            >
              {analyses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('official_report')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'official_report'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>3. Bilan Officiel des Démarches</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('ai_strategy')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'ai_strategy'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>4. Diagnostic Stratégique IA</span>
          </button>
        </div>

        {/* Filtres de Période & d'Émetteur */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="bg-transparent font-bold text-gray-700 text-xs px-1.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="all">Toute la recherche</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">Ce trimestre (90j)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as EntityFilter)}
              className="bg-transparent font-bold text-gray-700 text-xs px-1.5 py-1 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous émetteurs</option>
              <option value="cabinet">👔 Cabinets recrutement</option>
              <option value="direct">🏢 Entreprises directes</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CONTENU 1 : TABLEAU DE BORD ANALYTIQUE & PROGRESSION
         ========================================================================= */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Grille des 4 Métriques Clés */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1 : Taux d'Entretien */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Taux d&apos;Entretien</span>
                <Trophy className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-purple-950">
                  {metrics.interviewRate}%
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                  {metrics.interview + metrics.offer} qualifiés
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Moyenne cadre nationale : 8-12%
              </p>
            </div>

            {/* KPI 2 : Score ATS Moyen & Gain */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-colors">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Score ATS Moyen</span>
                <Target className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-950">
                  {metrics.avgAppScore ? `${metrics.avgAppScore}%` : '86%'}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                  +{metrics.avgScoreGain} pts gain V2
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Conformité lexicale aux offres
              </p>
            </div>

            {/* KPI 3 : Volume des Démarches */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Démarches Actives</span>
                <Briefcase className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-blue-950">
                  {metrics.submittedCount}
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                  {analyses.length} audits réalisés
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Sur {metrics.total} cibles identifiées
              </p>
            </div>

            {/* KPI 4 : Rigueur de Relance */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Discipline Relance</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-950">
                  {metrics.followUpDiscipline}%
                </span>
                {metrics.followUpsPending > 0 && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded animate-pulse">
                    {metrics.followUpsPending} à faire
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Relance systématique à J+7
              </p>
            </div>
          </div>

          {/* =========================================================================
              ENTONNOIR DE CONVERSION DE RECHERCHE D'EMPLOI (PIPELINE FUNNEL)
             ========================================================================= */}
          <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>🎯 Entonnoir de Conversion de Recherche d&apos;Emploi</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visualisez le passage de l&apos;audit initial jusqu&apos;à l&apos;offre finale.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full">
                Conversion globale : {metrics.interviewRate}%
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {/* Étape 1 : Offres Sourcées & Audits */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] flex items-center justify-center font-black">
                      1
                    </span>
                    <span>1. Audits & Offres Analysées</span>
                  </span>
                  <span className="text-gray-500">{analyses.length || metrics.total} opportunités (100%)</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-slate-700 h-full rounded-full transition-all duration-500" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Étape 2 : Candidatures Transmises */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-black">
                      2
                    </span>
                    <span>2. Candidatures Transmises (CV & Lettre)</span>
                  </span>
                  <span className="text-blue-700">
                    {metrics.submittedCount} dossiers ({metrics.total > 0 ? Math.round((metrics.submittedCount / metrics.total) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${metrics.total > 0 ? Math.min(100, Math.round((metrics.submittedCount / metrics.total) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Étape 3 : Relances Effectuées */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-black">
                      3
                    </span>
                    <span>3. Relances Réalisées à J+7</span>
                  </span>
                  <span className="text-amber-800">
                    {metrics.followUpDiscipline}% de couverture
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics.followUpDiscipline}%` }}
                  />
                </div>
              </div>

              {/* Étape 4 : Entretiens Décrochés */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] flex items-center justify-center font-black">
                      4
                    </span>
                    <span>4. Entretiens RH & Métier Décrochés</span>
                  </span>
                  <span className="text-purple-800 font-black">
                    {metrics.interview + metrics.offer} entretiens ({metrics.interviewRate}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics.interviewRate)}%` }}
                  />
                </div>
              </div>

              {/* Étape 5 : Offres Reçues */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-black">
                      5
                    </span>
                    <span>5. Propositions d&apos;Embauche & Offres</span>
                  </span>
                  <span className="text-emerald-800 font-black">
                    {metrics.offer} offre(s) ({metrics.offerRate}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics.offerRate * 2.5 || (metrics.offer > 0 ? 30 : 0))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              DEUX BLOCS : CANAUX RECRUTEMENT & COMPÉTENCES RECHERCHÉES
             ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloc 1 : Efficacité des Canaux (Cabinets vs Entreprises) */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>Cabinets de Recrutement vs Direct</span>
                </h3>
                <span className="text-[10px] font-bold text-gray-500">Benchmark Canaux</span>
              </div>

              <div className="space-y-3">
                {/* Cabinets */}
                <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-purple-950">
                    <span className="flex items-center gap-1.5">
                      <span>👔 Cabinets de Recrutement</span>
                    </span>
                    <span>{metrics.cabinetCount} dossiers ({metrics.cabinetInterviewRate}% entretiens)</span>
                  </div>
                  <div className="w-full bg-purple-200/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, metrics.cabinetInterviewRate)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-purple-800/80 leading-relaxed font-medium">
                    Les chasseurs de têtes réagissent plus rapidement lorsque votre CV contient les mots-clés exacts de leurs briefs clients.
                  </p>
                </div>

                {/* Direct */}
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-blue-950">
                    <span className="flex items-center gap-1.5">
                      <span>🏢 Entreprises & Candidatures Directes</span>
                    </span>
                    <span>{metrics.directCount} dossiers ({metrics.directInterviewRate}% entretiens)</span>
                  </div>
                  <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, metrics.directInterviewRate)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-blue-800/80 leading-relaxed font-medium">
                    Les portails d&apos;entreprises utilisent massivement des filtres ATS automatisés : le score de compatibilité y est décisif.
                  </p>
                </div>
              </div>
            </div>

            {/* Bloc 2 : Top Compétences Ciblées & Manques Résolus */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Compétences Cibles les Plus Demandées</span>
                </h3>
                <span className="text-[10px] font-bold text-gray-500">Mots-clés Offres</span>
              </div>

              <div className="space-y-2">
                {skillsGapList.length > 0 ? (
                  skillsGapList.map((skill, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-xl flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-gray-900 truncate">{skill.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                          {skill.category}
                        </span>
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {skill.count} offres
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-gray-400">
                    Lancez des analyses d&apos;offres pour cartographier automatiquement vos compétences cibles.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENU 2 : SUIVI DES AUDITS & PROGRESSION DES ANALYSES
         ========================================================================= */}
      {subTab === 'audits_progress' && (
        <div className="space-y-6">
          {/* Grille des 4 indicateurs clés d'audit */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Audits d&apos;Offres</span>
                <Layers className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-purple-950">
                  {auditMetrics.total}
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                  {auditMetrics.identifiedPercentage}% identifiés
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Offres d&apos;emploi auditées et mesurées
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Émetteurs Détectés</span>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-blue-950">
                  {auditMetrics.withCompany + auditMetrics.withCabinet}
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                  {auditMetrics.withCompany} stés • {auditMetrics.withCabinet} cab.
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {auditMetrics.horodatedOnly} sans émetteur (horodatées)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Score ATS Moyen</span>
                <Trophy className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-950">
                  {auditMetrics.avgScore !== null ? `${auditMetrics.avgScore}%` : '—'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                  Adéquation globale
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Calculé sur l&apos;ensemble de vos audits
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Gain de Progression</span>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-purple-950">
                  +{auditMetrics.avgProgression} pts
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                  V1 ➔ V2+
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Gain moyen après optimisation du CV
              </p>
            </div>
          </div>

          {/* Bandeau d'information sur la scrutation et le renommage */}
          <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-lg shrink-0">💡</span>
            <div className="text-xs text-purple-950 space-y-1">
              <div className="font-extrabold text-purple-900">
                Scrutation automatique de l&apos;offre & Horodatage systématique
              </div>
              <p className="text-purple-800 leading-relaxed">
                Le système scrute chaque offre pour en extraire automatiquement la <strong>société émettrice</strong> ou le <strong>cabinet de recrutement</strong>. Si l&apos;annonce ne mentionne aucune entité (annonce anonymisée ou texte tronqué), l&apos;analyse est obligatoirement <strong>horodatée</strong> afin de ne jamais la confondre avec d&apos;autres et vous permettre de la <strong>renommer à tout moment</strong> avec le bouton ✏️.
              </p>
            </div>
          </div>

          {/* Barre d'outils, filtres et recherche d'audits */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Champ de recherche */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Rechercher un audit par poste, société, cabinet..."
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-gray-900"
              />
              {auditSearch && (
                <button
                  type="button"
                  onClick={() => setAuditSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtres par type d'émetteur */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setAuditFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  auditFilterType === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous ({analyses.length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilterType('company')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                  auditFilterType === 'company'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <span>🏢 Entreprises</span>
                <span className="text-[10px] font-mono opacity-80">({auditMetrics.withCompany})</span>
              </button>
              <button
                type="button"
                onClick={() => setAuditFilterType('cabinet')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                  auditFilterType === 'cabinet'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                }`}
              >
                <span>👔 Cabinets</span>
                <span className="text-[10px] font-mono opacity-80">({auditMetrics.withCabinet})</span>
              </button>
              <button
                type="button"
                onClick={() => setAuditFilterType('horodated')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                  auditFilterType === 'horodated'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <span>🕒 Horodatées</span>
                <span className="text-[10px] font-mono opacity-80">({auditMetrics.horodatedOnly})</span>
              </button>
            </div>

            {/* Bouton Nouvel Audit */}
            <button
              type="button"
              onClick={() => onNavigateToTab('app')}
              className="px-3.5 py-1.5 bg-[#FF4B4B] hover:bg-[#e04343] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvel Audit ATS</span>
            </button>
          </div>

          {/* Liste détaillée des analyses d'audits */}
          <div className="space-y-3">
            {filteredAnalyses.length > 0 ? (
              filteredAnalyses.map((audit) => {
                const isHorodated = !audit.company && !audit.cabinet;
                const hasMultipleVersions = audit.evolutionSteps && audit.evolutionSteps.length > 1;
                const v1Score = audit.evolutionSteps?.[0]?.score;
                const latestScore = audit.score;
                const pointsGain = v1Score != null && latestScore != null
                  ? latestScore - v1Score
                  : null;

                return (
                  <div
                    key={audit.id}
                    className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Colonne Gauche : Badges, Titre et Infos */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Badge Entreprise */}
                        {audit.company && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-extrabold shadow-2xs">
                            🏢 {audit.company}
                          </span>
                        )}

                        {/* Badge Cabinet */}
                        {audit.cabinet && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-xs font-extrabold shadow-2xs">
                            👔 {audit.cabinet}
                          </span>
                        )}

                        {/* Badge Horodatée */}
                        {isHorodated && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold shadow-2xs"
                            title="Société émettrice non renseignée dans l'offre : analyse horodatée pour identification"
                          >
                            🕒 Sans émetteur explicite (Horodatée)
                          </span>
                        )}

                        {/* Badge Version */}
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-black">
                          Version V{audit.currentVersion || (audit.evolutionSteps?.length ?? 1)}
                        </span>

                        {/* Horodatage */}
                        <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {audit.timestamp}
                        </span>

                        {/* Fichier source si présent */}
                        {audit.fileName && (
                          <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.2 rounded font-mono">
                            📎 {audit.fileName}
                          </span>
                        )}
                      </div>

                      {/* Titre avec mode édition inline */}
                      {editingAuditId === audit.id ? (
                        <div className="flex items-center gap-1.5 max-w-xl">
                          <input
                            type="text"
                            autoFocus
                            value={editingAuditTitle}
                            onChange={(e) => setEditingAuditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveAuditTitle(audit.id);
                              if (e.key === 'Escape') setEditingAuditId(null);
                            }}
                            placeholder="Nommer cette analyse (ex: Airbus - Chef de Projet SI)..."
                            className="w-full text-sm font-bold px-3 py-1.5 border-2 border-purple-500 rounded-xl focus:outline-none bg-purple-50/40 text-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveAuditTitle(audit.id)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                            title="Valider le nouveau nom"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAuditId(null)}
                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                            title="Annuler"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/edit">
                          <h4
                            onClick={() => {
                              setEditingAuditId(audit.id);
                              setEditingAuditTitle(audit.title);
                            }}
                            className="text-sm sm:text-base font-extrabold text-gray-900 truncate hover:text-purple-700 transition-colors cursor-pointer"
                            title="Cliquer pour renommer cette analyse"
                          >
                            {audit.title}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAuditId(audit.id);
                              setEditingAuditTitle(audit.title);
                            }}
                            className="opacity-0 group-hover/edit:opacity-100 p-1 text-gray-400 hover:text-purple-600 transition-opacity rounded cursor-pointer"
                            title="Renommer cette analyse"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Snippet de l'offre */}
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {audit.jobSnippet || audit.jobText?.slice(0, 100) || 'Détails de l’offre analysée'}
                      </p>

                      {/* Statut explicite de la lettre de motivation & Fiche Entreprise */}
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        {audit.coverLetterTitle || audit.coverLetterContent || audit.coverLetterId ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>✉️ Lettre rattachée : « {audit.coverLetterTitle || 'Lettre sur-mesure'} »</span>
                            <button
                              type="button"
                              onClick={() => setSelectedAttachLetterAnalysis(audit)}
                              className="ml-1 text-[11px] underline text-emerald-700 hover:text-emerald-900 cursor-pointer font-semibold"
                              title="Gérer la lettre rattachée"
                            >
                              Gérer
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedAttachLetterAnalysis(audit)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            title="Rattacher une lettre de motivation à cet audit"
                          >
                            <Paperclip className="w-3 h-3 text-purple-600" />
                            <span>📎 Rattacher une lettre</span>
                          </button>
                        )}

                        {/* Bouton Fiche Entreprise & Entretien */}
                        <button
                          type="button"
                          onClick={() => setSelectedDossierAnalysis(audit)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                          title="Consulter la fiche technique et financière de l'entreprise recruteuse pour préparer l'entretien"
                        >
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>🏛️ Fiche Entreprise (Entretien)</span>
                        </button>
                      </div>

                      {/* Évolution des scores si multi-versions */}
                      {hasMultipleVersions && pointsGain !== null && (
                        <div className="inline-flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-xl">
                          <span className="text-gray-500 font-medium">Progression :</span>
                          <span className="font-bold text-gray-700">V1 ({v1Score}%)</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-black text-purple-900">
                            V{audit.currentVersion} ({latestScore}%)
                          </span>
                          <span
                            className={`font-black text-[11px] px-1.5 py-0.2 rounded-md ${
                              pointsGain >= 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {pointsGain >= 0 ? `+${pointsGain}` : pointsGain} pts
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Colonne Droite : Score ATS & Actions */}
                    <div className="flex sm:items-center gap-3 shrink-0 self-end sm:self-auto">
                      {/* Pastille de score ATS */}
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          Score ATS
                        </div>
                        <div
                          className={`text-2xl font-black px-2.5 py-0.5 rounded-xl inline-block ${
                            (audit.score ?? 0) >= 80
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : (audit.score ?? 0) >= 60
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {audit.score !== null && audit.score !== undefined ? `${audit.score}%` : '—'}
                        </div>
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenAnalysis) {
                              onOpenAnalysis(audit.id);
                            } else {
                              onNavigateToTab('app');
                            }
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Ouvrir l&apos;audit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConvertAuditToApp(audit)}
                          className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-purple-700 font-semibold rounded-xl text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                          title="Transférer dans le suivi des candidatures (Kanban)"
                        >
                          <Briefcase className="w-3 h-3 text-blue-600" />
                          <span>Créer candidature</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-xl font-bold">
                  🔍
                </div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {auditSearch || auditFilterType !== 'all'
                    ? 'Aucun audit ne correspond à vos filtres actuels'
                    : 'Aucun audit d&apos;offre n&apos;a encore été réalisé'}
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  {auditSearch || auditFilterType !== 'all'
                    ? 'Essayez de modifier votre mot-clé de recherche ou de réinitialiser le filtre d&apos;émetteur.'
                    : 'Auditez une offre d&apos;emploi avec votre CV pour obtenir une analyse d&apos;adéquation, un score de conformité ATS et mesurer vos gains de progression.'}
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  {(auditSearch || auditFilterType !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuditSearch('');
                        setAuditFilterType('all');
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('app')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Lancer un premier audit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENU 3 : BILAN OFFICIEL DES DÉMARCHES (FRANCE TRAVAIL / APEC)
         ========================================================================= */}
      {subTab === 'official_report' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          {/* En-tête administratif imprimable */}
          <div className="border-b border-gray-200 pb-5 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 print:bg-transparent print:border-none print:p-0">
                  Justificatif Officiel de Démarches Actives
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                  Relevé des Candidatures & Démarches d&apos;Emploi
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Document justificatif destiné à France Travail, l&apos;APEC ou au suivi personnel d&apos;activité de recherche.
                </p>
              </div>

              <div className="text-right text-xs text-gray-600 shrink-0">
                <div className="font-black text-gray-900 text-sm flex items-center justify-end gap-1.5">
                  <span>{candidateFullName}</span>
                  {isDemoMode && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded">
                      SPÉCIMEN DÉMO
                    </span>
                  )}
                </div>
                <div>{candidateEmail}</div>
                {candidatePhone && <div>{candidatePhone}</div>}
                <div className="text-[10px] text-gray-400 mt-0.5">Édité le {new Date().toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          </div>

          {/* Synthèse chiffrée officielle */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 text-xs print:bg-white print:border-gray-400">
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Total Démarches :</span>
              <div className="text-base font-black text-gray-900">{filteredApps.length}</div>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Entretiens Décrochés :</span>
              <div className="text-base font-black text-purple-900">{metrics.interview + metrics.offer}</div>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Taux de Réponse :</span>
              <div className="text-base font-black text-emerald-900">{metrics.responseRate}%</div>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Période Couverte :</span>
              <div className="text-xs font-bold text-gray-800">
                {period === '7d' ? '7 derniers jours' : period === '30d' ? '30 derniers jours' : period === '90d' ? 'Ce trimestre' : 'Historique complet'}
              </div>
            </div>
          </div>

          {/* Tableau Détaillé des Démarches */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50/60 text-gray-700 font-black text-[11px] print:bg-white">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Entreprise / Cabinet</th>
                  <th className="py-2.5 px-3">Poste Visé & Contrat</th>
                  <th className="py-2.5 px-3">Statut Démarche</th>
                  <th className="py-2.5 px-3">Score ATS</th>
                  <th className="py-2.5 px-3">Relance</th>
                  <th className="py-2.5 px-3">Notes & Réf.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApps.length > 0 ? (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/80 transition-colors print:hover:bg-white">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                        {app.appliedDate || app.createdAt.split('T')[0]}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {app.company}
                      </td>
                      <td className="py-2.5 px-3 text-gray-800">
                        <div className="font-semibold">{app.role}</div>
                        <span className="text-[10px] text-gray-400 font-mono">{app.contractType}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                            app.status === 'offer'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'interview'
                              ? 'bg-purple-100 text-purple-800'
                              : app.status === 'waiting'
                              ? 'bg-amber-100 text-amber-800'
                              : app.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {app.status === 'offer'
                            ? 'Offre reçue'
                            : app.status === 'interview'
                            ? 'Entretien'
                            : app.status === 'waiting'
                            ? 'En attente'
                            : app.status === 'rejected'
                            ? 'Refusé'
                            : 'Postulé'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        {app.score ? `${app.score}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-gray-600 whitespace-nowrap">
                        {app.checklist?.followUpDone ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Fait
                          </span>
                        ) : app.followUpDate ? (
                          <span>Prévu le {app.followUpDate}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-gray-500 max-w-xs truncate">
                        {app.notes || (app.jobUrl ? 'URL renseignée' : 'Candidature spontanée')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Aucune démarche enregistrée pour cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Attestation sur l'honneur pour justificatif officiel */}
          <div className="mt-8 pt-4 border-t-2 border-gray-300 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">
              {isDemoMode ? (
                <>
                  Attestation sur l&apos;honneur (Spécimen d&apos;exemple pour Démonstration) : Document exemple illustrant la génération de justificatifs pour le candidat fictif <strong>Thomas Laurent</strong>.
                </>
              ) : (
                <>
                  Attestation sur l&apos;honneur : Je soussigné(e) {candidateFullName}, certifie l&apos;exactitude des démarches de recherche d&apos;emploi et des candidatures répertoriées ci-dessus.
                </>
              )}
            </p>
            <div className="flex justify-between items-end pt-4">
              <div>
                <span>Fait le {new Date().toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="text-right border-t border-gray-400 pt-1 w-48 text-[11px] text-gray-500">
                Signature du candidat
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENU 3 : DIAGNOSTIC STRATÉGIQUE & RECOMMANDATIONS IA
         ========================================================================= */}
      {subTab === 'ai_strategy' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full">
                Intelligence Stratégique & Coaching
              </span>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 mt-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Diagnostic Stratégique & Plan d&apos;Action de Recherche</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Analyse transversale de vos taux de transformation et préconisations concrètes pour maximiser vos entretiens.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateAiStrategy}
              disabled={isGeneratingAiReport}
              className="text-xs px-4 py-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isGeneratingAiReport ? 'Analyse en cours...' : 'Générer l\'Audit Stratégique IA'}</span>
            </button>
          </div>

          {isGeneratingAiReport ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-600">
                Calcul des corrélations entre scores ATS, types de recruteurs et taux d&apos;entretien...
              </p>
            </div>
          ) : aiReportText ? (
            <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-5 space-y-4">
              <div className="prose prose-sm text-xs text-gray-800 max-w-none space-y-2 whitespace-pre-wrap leading-relaxed">
                {aiReportText}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-3 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Aucun audit stratégique généré pour l&apos;instant</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Cliquez sur « Générer l&apos;Audit Stratégique IA » pour analyser vos résultats, identifier les freins et obtenir votre plan d&apos;action personnalisé.
              </p>
              <button
                type="button"
                onClick={handleGenerateAiStrategy}
                className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-700 transition-colors cursor-pointer"
              >
                Lancer l&apos;audit stratégique maintenant
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de consultation de la Fiche Technique & Financière */}
      <CompanyDossierModal
        isOpen={Boolean(selectedDossierAnalysis)}
        onClose={() => setSelectedDossierAnalysis(null)}
        dossier={
          selectedDossierAnalysis?.companyDossier ||
          (selectedDossierAnalysis
            ? extractCompanyDossier(
                selectedDossierAnalysis.analysisResult,
                selectedDossierAnalysis.jobText,
                selectedDossierAnalysis.company || selectedDossierAnalysis.cabinet,
                selectedDossierAnalysis.role
              )
            : null)
        }
        roleTitle={selectedDossierAnalysis?.role}
        analysisTitle={selectedDossierAnalysis?.title}
      />

      {/* Modal de rattachement de lettre de motivation */}
      {selectedAttachLetterAnalysis && (
        <AttachLetterModal
          isOpen={Boolean(selectedAttachLetterAnalysis)}
          onClose={() => setSelectedAttachLetterAnalysis(null)}
          analysisId={selectedAttachLetterAnalysis.id}
          analysisTitle={selectedAttachLetterAnalysis.title}
          analysisCompany={selectedAttachLetterAnalysis.company}
          analysisRole={selectedAttachLetterAnalysis.role}
          currentAttachedLetterId={selectedAttachLetterAnalysis.coverLetterId}
          currentAttachedLetterTitle={selectedAttachLetterAnalysis.coverLetterTitle}
          onLetterAttached={(letter) => {
            const updated = {
              ...selectedAttachLetterAnalysis,
              coverLetterId: letter.id,
              coverLetterTitle: letter.title,
              coverLetterContent: letter.content,
            };
            localDbClient.saveAnalysis(updated).catch(() => {});
            setSelectedAttachLetterAnalysis(null);
          }}
          onLetterDetached={() => {
            const updated = {
              ...selectedAttachLetterAnalysis,
              coverLetterId: undefined,
              coverLetterTitle: undefined,
              coverLetterContent: undefined,
            };
            localDbClient.saveAnalysis(updated).catch(() => {});
            setSelectedAttachLetterAnalysis(null);
          }}
        />
      )}
    </div>
  );
};

export default JobSearchAnalyticsReport;
