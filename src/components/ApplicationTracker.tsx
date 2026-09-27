import React, { useState, useMemo, useId } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Trash2,
  Edit3,
  Download,
  Upload,
  ArrowRight,
  AlertCircle,
  BarChart3,
  Award,
  Sparkles,
  LayoutGrid,
  ListFilter,
  MapPin,
  ChevronRight,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { ApplicationItem, ApplicationStatus, AnalysisHistoryItem } from '../types';
import { localDbClient } from '../services/localDbClient';

interface ApplicationTrackerProps {
  applications: ApplicationItem[];
  setApplications: React.Dispatch<React.SetStateAction<ApplicationItem[]>>;
  analyses: AnalysisHistoryItem[];
  onOpenAnalysis?: (analysisId: string) => void;
  onNewAnalysisWithJob?: (jobText: string, jobUrl?: string) => void;
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; bg: string; text: string; border: string; icon: string; next?: ApplicationStatus }
> = {
  to_apply: {
    label: 'À postuler',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: '📝',
    next: 'applied',
  },
  applied: {
    label: 'Postulé',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: '📤',
    next: 'waiting',
  },
  waiting: {
    label: 'En attente',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: '⏳',
    next: 'interview',
  },
  interview: {
    label: 'Entretien',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: '🎯',
    next: 'offer',
  },
  offer: {
    label: 'Offre reçue',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: '🎉',
  },
  rejected: {
    label: 'Refusé',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: '❌',
  },
};

export const INITIAL_SAMPLE_APPLICATIONS: ApplicationItem[] = [
  {
    id: 'app-1',
    company: 'Doctolib',
    role: 'Product Owner Senior - Santé Digitale',
    status: 'interview',
    appliedDate: '2026-09-15',
    followUpDate: '2026-09-25',
    location: 'Paris (Hybride 2j)',
    contractType: 'CDI',
    salary: '62k - 68k€',
    jobUrl: 'https://careers.doctolib.fr/offres/po-sante',
    contact: 'Sophie Martin (Talent Acquisition)',
    notes: 'Premier call RH validé ! Entretien technique avec le VP Product prévu ce jeudi à 14h. Bien revoir la méthodologie OKR.',
    score: 88,
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: true,
      followUpDone: true,
    },
    createdAt: '2026-09-15T09:30:00Z',
    updatedAt: '2026-09-20T16:45:00Z',
  },
  {
    id: 'app-2',
    company: 'Mirakl',
    role: 'Développeur Fullstack TypeScript / Python',
    status: 'applied',
    appliedDate: '2026-09-21',
    followUpDate: '2026-09-28',
    location: 'Paris ou Full Remote',
    contractType: 'CDI',
    salary: '55k - 60k€',
    jobUrl: 'https://mirakl.com/jobs/fullstack-engineer',
    contact: 'contact-recrutement@mirakl.com',
    notes: 'Candidature spontanée suite à analyse ATS (Score 84%). Relancer si pas de nouvelles d’ici lundi prochain.',
    score: 84,
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: false,
      followUpDone: false,
    },
    createdAt: '2026-09-21T11:00:00Z',
    updatedAt: '2026-09-21T11:00:00Z',
  },
  {
    id: 'app-3',
    company: 'L’Oréal',
    role: 'Chef de Projet Transformation Digitale & IA',
    status: 'to_apply',
    appliedDate: '',
    followUpDate: '2026-09-26',
    location: 'Clichy (92)',
    contractType: 'CDI',
    salary: '65k€ + prime',
    jobUrl: 'https://careers.loreal.com/global/fr/job/chef-projet-ia',
    contact: '',
    notes: 'Offre repérée sur LinkedIn. Adapter le CV avec les mots-clés ATS axés sur la gestion du changement et l’IA générative.',
    score: 79,
    checklist: {
      cvSent: false,
      coverLetterSent: false,
      portfolioSent: false,
      followUpDone: false,
    },
    createdAt: '2026-09-23T14:20:00Z',
    updatedAt: '2026-09-23T14:20:00Z',
  },
];

export default function ApplicationTracker({
  applications,
  setApplications,
  analyses,
  onOpenAnalysis,
  onNewAnalysisWithJob,
}: ApplicationTrackerProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ApplicationItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form State
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formStatus, setFormStatus] = useState<ApplicationStatus>('to_apply');
  const [formAppliedDate, setFormAppliedDate] = useState('');
  const [formFollowUpDate, setFormFollowUpDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formContractType, setFormContractType] = useState<ApplicationItem['contractType']>('CDI');
  const [formSalary, setFormSalary] = useState('');
  const [formJobUrl, setFormJobUrl] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formScore, setFormScore] = useState<string>('');
  const [formAnalysisId, setFormAnalysisId] = useState<string>('');
  const [formChecklist, setFormChecklist] = useState({
    cvSent: false,
    coverLetterSent: false,
    portfolioSent: false,
    followUpDone: false,
  });

  const companyInputId = useId();
  const roleInputId = useId();

  // Metrics
  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter((a) => ['applied', 'waiting', 'interview'].includes(a.status)).length;
    const interviews = applications.filter((a) => a.status === 'interview').length;
    const offers = applications.filter((a) => a.status === 'offer').length;
    const conversionRate = total > 0 ? Math.round(((interviews + offers) / total) * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    const dueFollowUps = applications.filter(
      (a) => a.followUpDate && a.followUpDate <= today && ['applied', 'waiting'].includes(a.status)
    ).length;

    return { total, active, interviews, offers, conversionRate, dueFollowUps };
  }, [applications]);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        searchQuery === '' ||
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.location && app.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (app.notes && app.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchQuery, statusFilter]);

  // Open modal to create or edit
  const handleOpenCreateModal = () => {
    setEditingApp(null);
    setFormCompany('');
    setFormRole('');
    setFormStatus('to_apply');
    setFormAppliedDate(new Date().toISOString().split('T')[0]);
    // Follow up in 7 days by default
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFormFollowUpDate(nextWeek);
    setFormLocation('Paris / Télétravail');
    setFormContractType('CDI');
    setFormSalary('');
    setFormJobUrl('');
    setFormContact('');
    setFormNotes('');
    setFormScore('');
    setFormAnalysisId('');
    setFormChecklist({ cvSent: false, coverLetterSent: false, portfolioSent: false, followUpDone: false });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (app: ApplicationItem) => {
    setEditingApp(app);
    setFormCompany(app.company);
    setFormRole(app.role);
    setFormStatus(app.status);
    setFormAppliedDate(app.appliedDate || '');
    setFormFollowUpDate(app.followUpDate || '');
    setFormLocation(app.location || '');
    setFormContractType(app.contractType || 'CDI');
    setFormSalary(app.salary || '');
    setFormJobUrl(app.jobUrl || '');
    setFormContact(app.contact || '');
    setFormNotes(app.notes || '');
    setFormScore(app.score !== undefined && app.score !== null ? String(app.score) : '');
    setFormAnalysisId(app.analysisId || '');
    setFormChecklist(app.checklist || { cvSent: false, coverLetterSent: false, portfolioSent: false, followUpDone: false });
    setIsModalOpen(true);
  };

  const handleSaveApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim() || !formRole.trim()) return;

    const parsedScore = formScore.trim() ? parseInt(formScore, 10) : null;

    if (editingApp) {
      // Update
      setApplications((prev) =>
        prev.map((item) =>
          item.id === editingApp.id
            ? {
                ...item,
                company: formCompany.trim(),
                role: formRole.trim(),
                status: formStatus,
                appliedDate: formAppliedDate,
                followUpDate: formFollowUpDate,
                location: formLocation.trim(),
                contractType: formContractType,
                salary: formSalary.trim(),
                jobUrl: formJobUrl.trim(),
                contact: formContact.trim(),
                notes: formNotes.trim(),
                score: isNaN(Number(parsedScore)) ? null : parsedScore,
                analysisId: formAnalysisId.trim() || null,
                checklist: formChecklist,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    } else {
      // Create
      const newApp: ApplicationItem = {
        id: 'app-' + Date.now(),
        company: formCompany.trim(),
        role: formRole.trim(),
        status: formStatus,
        appliedDate: formAppliedDate,
        followUpDate: formFollowUpDate,
        location: formLocation.trim(),
        contractType: formContractType,
        salary: formSalary.trim(),
        jobUrl: formJobUrl.trim(),
        contact: formContact.trim(),
        notes: formNotes.trim(),
        score: isNaN(Number(parsedScore)) ? null : parsedScore,
        analysisId: formAnalysisId.trim() || null,
        checklist: formChecklist,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setApplications((prev) => [newApp, ...prev]);
    }

    setIsModalOpen(false);
  };

  const executeDeleteApplication = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setApplications((prev) => prev.filter((a) => a.id !== id));
    setConfirmDeleteId(null);
    try {
      await localDbClient.deleteApplication(id);
    } catch (err) {
      console.error('Erreur suppression candidature :', err);
    }
  };

  const handleQuickStatusChange = (id: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            }
          : app
      )
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (applications.length === 0) {
      alert('Aucune candidature à exporter.');
      return;
    }

    const headers = [
      'Entreprise',
      'Poste',
      'Statut',
      'Date de candidature',
      'Date de relance',
      'Lieu',
      'Type de contrat',
      'Salaire',
      'Lien de l offre',
      'Contact',
      'Score ATS',
      'Notes',
    ];

    const rows = applications.map((app) => [
      `"${app.company.replace(/"/g, '""')}"`,
      `"${app.role.replace(/"/g, '""')}"`,
      `"${STATUS_CONFIG[app.status]?.label || app.status}"`,
      `"${app.appliedDate || ''}"`,
      `"${app.followUpDate || ''}"`,
      `"${app.location || ''}"`,
      `"${app.contractType || ''}"`,
      `"${app.salary || ''}"`,
      `"${app.jobUrl || ''}"`,
      `"${app.contact || ''}"`,
      `"${app.score || ''}"`,
      `"${(app.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cv_move_candidatures_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(applications, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cv_move_candidatures_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setApplications(imported);
          alert(`Import réussi : ${imported.length} candidatures chargées.`);
        } else {
          alert("Le fichier JSON n'est pas au format attendu.");
        }
      } catch (err) {
        alert("Erreur lors de la lecture du fichier JSON : " + String(err));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* En-tête du tableau de bord */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-[#FF4B4B]/10 text-[#FF4B4B] rounded-lg">
              <Briefcase className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              Suivi des Candidatures & Entretiens
            </h1>
            <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">
              {applications.length} suivies
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Gérez vos opportunités, vos dates de relance, vos scores d&apos;adéquation et préparez chaque entretien.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF4B4B] hover:bg-[#ff3333] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle candidature</span>
          </button>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Vue Kanban par colonnes"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Vue Tableau liste"
            >
              <ListFilter className="w-4 h-4" />
              <span className="hidden sm:inline">Liste</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              title="Exporter en CSV (Excel)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              title="Sauvegarder en JSON"
            >
              <Download className="w-4 h-4 text-blue-600" />
            </button>
            <label
              className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              title="Importer un fichier JSON"
            >
              <Upload className="w-4 h-4 text-purple-600" />
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Cartes KPI Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Total Dossiers
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-gray-900">{stats.total}</span>
            <span className="text-[11px] text-gray-400">candidatures</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs bg-blue-50/20">
          <p className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">
            En Cours
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-blue-900">{stats.active}</span>
            <span className="text-[11px] text-blue-600">actives</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs bg-purple-50/20">
          <p className="text-[11px] font-medium text-purple-700 uppercase tracking-wider">
            Entretiens
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-purple-900">{stats.interviews}</span>
            <span className="text-[11px] text-purple-600">décrochés</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
            Offres Reçues
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-emerald-900">{stats.offers}</span>
            <span className="text-[11px] text-emerald-600">propositions</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Taux Entretien
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-gray-900">{stats.conversionRate}%</span>
            <span className="text-[11px] text-emerald-600 font-semibold">conversion</span>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border shadow-2xs transition-all ${
            stats.dueFollowUps > 0
              ? 'bg-amber-50 border-amber-300'
              : 'bg-white border-gray-200'
          }`}
        >
          <p
            className={`text-[11px] font-medium uppercase tracking-wider ${
              stats.dueFollowUps > 0 ? 'text-amber-800' : 'text-gray-500'
            }`}
          >
            Relances dues
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl font-black ${
                stats.dueFollowUps > 0 ? 'text-amber-900' : 'text-gray-900'
              }`}
            >
              {stats.dueFollowUps}
            </span>
            <span
              className={`text-[11px] ${
                stats.dueFollowUps > 0 ? 'text-amber-700 font-bold' : 'text-gray-400'
              }`}
            >
              {stats.dueFollowUps > 0 ? 'à faire !' : 'à jour'}
            </span>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-gray-200">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par entreprise, poste, lieu, mots-clés..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#FF4B4B] bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-xs py-2 px-3 border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-hidden focus:ring-2 focus:ring-[#FF4B4B]"
          >
            <option value="all">Tous les statuts</option>
            <option value="to_apply">📝 À postuler</option>
            <option value="applied">📤 Postulé</option>
            <option value="waiting">⏳ En attente</option>
            <option value="interview">🎯 Entretien</option>
            <option value="offer">🎉 Offre reçue</option>
            <option value="rejected">❌ Refusé</option>
          </select>
        </div>
      </div>

      {/* VUE KANBAN */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {(
            [
              'to_apply',
              'applied',
              'waiting',
              'interview',
              'offer',
              'rejected',
            ] as ApplicationStatus[]
          ).map((statusKey) => {
            const config = STATUS_CONFIG[statusKey];
            const columnApps = filteredApps.filter((a) => a.status === statusKey);

            return (
              <div
                key={statusKey}
                className="bg-gray-50/70 border border-gray-200 rounded-2xl p-3 flex flex-col gap-3 min-h-[420px]"
              >
                {/* En-tête de la colonne */}
                <div className="flex items-center justify-between px-1 pb-1 border-b border-gray-200/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{config.icon}</span>
                    <span className="text-xs font-bold text-gray-800">
                      {config.label}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${config.bg} ${config.text} ${config.border}`}
                  >
                    {columnApps.length}
                  </span>
                </div>

                {/* Liste des cartes dans la colonne */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnApps.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                      <p className="text-[11px] text-gray-400">Aucun dossier</p>
                    </div>
                  ) : (
                    columnApps.map((app) => {
                      const isFollowUpDue =
                        app.followUpDate &&
                        app.followUpDate <= new Date().toISOString().split('T')[0] &&
                        ['applied', 'waiting'].includes(app.status);

                      return (
                        <div
                          key={app.id}
                          className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs hover:shadow-sm transition-all space-y-2.5 group relative"
                        >
                          {/* En-tête de la carte */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 truncate">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                {app.company}
                              </span>
                              <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 mt-0.5">
                                {app.role}
                              </h4>
                            </div>

                            {app.score !== null && app.score !== undefined && (
                              <div
                                title={`Score de compatibilité ATS : ${app.score}%`}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                                  app.score >= 75
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : app.score >= 50
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {app.score}%
                              </div>
                            )}
                          </div>

                          {/* Détails Contrat & Lieu */}
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                            {app.contractType && (
                              <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                {app.contractType}
                              </span>
                            )}
                            {app.location && (
                              <span className="flex items-center gap-0.5 truncate max-w-[130px]">
                                <MapPin className="w-2.5 h-2.5 text-gray-400" />
                                {app.location}
                              </span>
                            )}
                            {app.salary && (
                              <span className="text-emerald-700 font-medium">
                                {app.salary}
                              </span>
                            )}
                          </div>

                          {/* Date de relance avec alerte */}
                          {app.followUpDate && (
                            <div
                              className={`flex items-center justify-between text-[10px] px-2 py-1 rounded-md ${
                                isFollowUpDue
                                  ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                  : 'bg-gray-50 text-gray-600'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Relance : {app.followUpDate}
                              </span>
                              {isFollowUpDue && (
                                <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded font-black">
                                  DUE
                                </span>
                              )}
                            </div>
                          )}

                          {/* Note rapide */}
                          {app.notes && (
                            <p className="text-[11px] text-gray-600 line-clamp-2 bg-gray-50 p-1.5 rounded italic">
                              « {app.notes} »
                            </p>
                          )}

                          {/* Pied de carte avec actions */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1 text-[11px]">
                            <div className="flex items-center gap-1">
                              {app.jobUrl && (
                                <a
                                  href={app.jobUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                  title="Ouvrir le lien de l'offre"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {app.analysisId && onOpenAnalysis && (
                                <button
                                  type="button"
                                  onClick={() => onOpenAnalysis(app.analysisId!)}
                                  className="p-1 text-purple-600 hover:text-purple-800 rounded transition-colors"
                                  title="Consulter l'analyse ATS liée"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(app)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                                title="Modifier cette candidature"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {confirmDeleteId === app.id ? (
                                <div
                                  className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded shadow-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-[10px] text-rose-700 font-bold">Supprimer ?</span>
                                  <button
                                    type="button"
                                    onClick={(e) => executeDeleteApplication(app.id, e)}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Oui
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Non
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(app.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="Supprimer cette candidature"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Bouton rapide pour avancer d'étape */}
                            {config.next && (
                              <button
                                type="button"
                                onClick={() => handleQuickStatusChange(app.id, config.next!)}
                                className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
                                title={`Passer au statut : ${STATUS_CONFIG[config.next].label}`}
                              >
                                <span>{STATUS_CONFIG[config.next].label}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VUE TABLEAU LISTE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Entreprise & Poste</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Score ATS</th>
                  <th className="py-3 px-4">Date candidature</th>
                  <th className="py-3 px-4">Date relance</th>
                  <th className="py-3 px-4">Lieu / Contrat</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400 text-xs">
                      Aucune candidature ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => {
                    const config = STATUS_CONFIG[app.status];
                    const isFollowUpDue =
                      app.followUpDate &&
                      app.followUpDate <= new Date().toISOString().split('T')[0] &&
                      ['applied', 'waiting'].includes(app.status);

                    return (
                      <tr key={app.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{app.company}</div>
                          <div className="text-gray-500 text-[11px] line-clamp-1">
                            {app.role}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={app.status}
                            onChange={(e) =>
                              handleQuickStatusChange(app.id, e.target.value as ApplicationStatus)
                            }
                            className={`text-[11px] font-bold py-1 px-2 rounded-lg border focus:outline-hidden cursor-pointer ${config.bg} ${config.text} ${config.border}`}
                          >
                            <option value="to_apply">📝 À postuler</option>
                            <option value="applied">📤 Postulé</option>
                            <option value="waiting">⏳ En attente</option>
                            <option value="interview">🎯 Entretien</option>
                            <option value="offer">🎉 Offre reçue</option>
                            <option value="rejected">❌ Refusé</option>
                          </select>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {app.score !== null && app.score !== undefined ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                app.score >= 75
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app.score >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {app.score}%
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                          {app.appliedDate || <span className="text-gray-300">-</span>}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {app.followUpDate ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                                isFollowUpDue
                                  ? 'bg-amber-100 text-amber-900 font-bold'
                                  : 'text-gray-600'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {app.followUpDate}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                          <div>{app.location || '-'}</div>
                          <div className="text-[10px] text-gray-400">{app.contractType}</div>
                        </td>

                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                          {app.notes || <span className="text-gray-300">-</span>}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {app.jobUrl && (
                              <a
                                href={app.jobUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                title="Ouvrir l'annonce"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(app)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                              title="Modifier"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {confirmDeleteId === app.id ? (
                              <div
                                className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg shadow-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[11px] text-rose-700 font-bold">Supprimer ?</span>
                                <button
                                  type="button"
                                  onClick={(e) => executeDeleteApplication(app.id, e)}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Oui
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Non
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(app.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Supprimer cette candidature"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION / MODIFICATION DE CANDIDATURE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-[#FF4B4B]/10 text-[#FF4B4B] rounded-lg">
                  <Briefcase className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  {editingApp ? 'Modifier la candidature' : 'Ajouter une nouvelle candidature'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveApplication} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={companyInputId} className="block text-xs font-semibold text-gray-700 mb-1">
                    Nom de l&apos;entreprise *
                  </label>
                  <input
                    id={companyInputId}
                    type="text"
                    required
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="ex: Doctolib, Google, L'Oréal..."
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor={roleInputId} className="block text-xs font-semibold text-gray-700 mb-1">
                    Intitulé du poste *
                  </label>
                  <input
                    id={roleInputId}
                    type="text"
                    required
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="ex: Lead Développeur Python..."
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Statut actuel
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ApplicationStatus)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                  >
                    <option value="to_apply">📝 À postuler</option>
                    <option value="applied">📤 Postulé</option>
                    <option value="waiting">⏳ En attente</option>
                    <option value="interview">🎯 Entretien</option>
                    <option value="offer">🎉 Offre reçue</option>
                    <option value="rejected">❌ Refusé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Contrat
                  </label>
                  <select
                    value={formContractType}
                    onChange={(e) => setFormContractType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Alternance">Alternance</option>
                    <option value="Stage">Stage</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Score ATS (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formScore}
                    onChange={(e) => setFormScore(e.target.value)}
                    placeholder="ex: 85"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Date de candidature
                  </label>
                  <input
                    type="date"
                    value={formAppliedDate}
                    onChange={(e) => setFormAppliedDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Date de relance prévue
                  </label>
                  <input
                    type="date"
                    value={formFollowUpDate}
                    onChange={(e) => setFormFollowUpDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Lieu / Modalités
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="ex: Lyon, Full Remote, 2j télétravail..."
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fourchette de Salaire
                  </label>
                  <input
                    type="text"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    placeholder="ex: 50k - 55k€"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lien direct vers l&apos;annonce (URL)
                </label>
                <input
                  type="url"
                  value={formJobUrl}
                  onChange={(e) => setFormJobUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contact RH / Manager
                </label>
                <input
                  type="text"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  placeholder="ex: Marie Dupont (LinkedIn / email)"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                />
              </div>

              {/* Checklist de transmission */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Checklist des pièces transmises :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formChecklist.cvSent}
                      onChange={(e) =>
                        setFormChecklist((p) => ({ ...p, cvSent: e.target.checked }))
                      }
                      className="rounded text-[#FF4B4B] focus:ring-[#FF4B4B]"
                    />
                    <span>CV envoyé</span>
                  </label>

                  <label className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formChecklist.coverLetterSent}
                      onChange={(e) =>
                        setFormChecklist((p) => ({ ...p, coverLetterSent: e.target.checked }))
                      }
                      className="rounded text-[#FF4B4B] focus:ring-[#FF4B4B]"
                    />
                    <span>Lettre transmise</span>
                  </label>

                  <label className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formChecklist.portfolioSent}
                      onChange={(e) =>
                        setFormChecklist((p) => ({ ...p, portfolioSent: e.target.checked }))
                      }
                      className="rounded text-[#FF4B4B] focus:ring-[#FF4B4B]"
                    />
                    <span>Portfolio / GitHub</span>
                  </label>

                  <label className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formChecklist.followUpDone}
                      onChange={(e) =>
                        setFormChecklist((p) => ({ ...p, followUpDone: e.target.checked }))
                      }
                      className="rounded text-[#FF4B4B] focus:ring-[#FF4B4B]"
                    />
                    <span>Relance faite</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes & Pistes d&apos;entretien
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Questions probables, points forts à valoriser, retours du recruteur..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF4B4B] hover:bg-[#ff3333] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {editingApp ? 'Enregistrer les modifications' : 'Créer la candidature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
