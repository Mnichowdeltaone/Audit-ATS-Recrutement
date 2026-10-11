import React, { useState, useMemo, useId, useEffect } from 'react';
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
  FileText,
  Copy,
  Check,
  TrendingUp,
  Lock,
  Unlock,
  GripVertical,
  MoveRight,
  Users,
  UserPlus,
  Mail,
  Phone,
  MessageSquare,
  Globe,
  X,
} from 'lucide-react';
import {
  ApplicationItem,
  ApplicationStatus,
  AnalysisHistoryItem,
  ApplicationContact,
  ApplicationInteraction,
  ApplicationInteractionType,
  CompanyFinancialTechnicalDossier,
} from '../types';
import { localDbClient } from '../services/localDbClient';
import CompanyDossierModal from './CompanyDossierModal';
import { extractCompanyDossier } from '../utils/companyDossierExtractor';

interface ApplicationTrackerProps {
  applications: ApplicationItem[];
  setApplications: React.Dispatch<React.SetStateAction<ApplicationItem[]>>;
  analyses: AnalysisHistoryItem[];
  onOpenAnalysis?: (analysisId: string) => void;
  onNewAnalysisWithJob?: (jobText: string, jobUrl?: string) => void;
  onNavigateToReports?: () => void;
  isDemoMode?: boolean;
  onToggleDemoMode?: (enable: boolean) => void;
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

export const INITIAL_SAMPLE_APPLICATIONS: ApplicationItem[] = [];

export default function ApplicationTracker({
  applications,
  setApplications,
  analyses,
  onOpenAnalysis,
  onNewAnalysisWithJob,
  onNavigateToReports,
  isDemoMode = false,
  onToggleDemoMode,
}: ApplicationTrackerProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ApplicationItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // États pour le déplacement à la souris et le verrouillage du Kanban
  const [isDragLocked, setIsDragLocked] = useState<boolean>(() => {
    return localStorage.getItem('cv_tracker_kanban_locked') === 'true';
  });
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);
  const [moveToast, setMoveToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [kanbanLayout, setKanbanLayout] = useState<'spacious' | 'grid'>('spacious');

  const toggleNoteExpanded = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDragLock = () => {
    setIsDragLocked((prev) => {
      const next = !prev;
      localStorage.setItem('cv_tracker_kanban_locked', String(next));
      setMoveToast({
        message: next
          ? '🔒 Déplacement des cartes verrouillé. Vos cartes sont fixées et protégées.'
          : '🔓 Déplacement activé ! Vous pouvez maintenant glisser-déposer les cartes avec la souris.',
        type: next ? 'info' : 'success',
      });
      setTimeout(() => setMoveToast(null), 3500);
      return next;
    });
  };

  const handleDropOnColumn = async (appId: string, targetStatus: ApplicationStatus) => {
    if (isDragLocked) return;
    const target = applications.find((a) => a.id === appId);
    if (!target) return;
    if (target.status === targetStatus) return;

    const sourceStatusLabel = STATUS_CONFIG[target.status]?.label || target.status;
    const destStatusLabel = STATUS_CONFIG[targetStatus]?.label || targetStatus;

    const updatedApp: ApplicationItem = {
      ...target,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) => prev.map((a) => (a.id === appId ? updatedApp : a)));

    try {
      await localDbClient.saveApplication(updatedApp);
      setMoveToast({
        message: `✅ « ${target.role} » chez ${target.company} déplacé de "${sourceStatusLabel}" vers "${destStatusLabel}" !`,
        type: 'success',
      });
      setTimeout(() => setMoveToast(null), 3500);
    } catch (err) {
      console.error('Erreur sauvegarde déplacement :', err);
      setApplications((prev) => prev.map((a) => (a.id === appId ? target : a)));
      setMoveToast({
        message: '❌ Échec de la mise à jour en base locale.',
        type: 'info',
      });
      setTimeout(() => setMoveToast(null), 3500);
    }
  };

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
  const [formCoverLetter, setFormCoverLetter] = useState('');
  const [formCoverLetterTitle, setFormCoverLetterTitle] = useState('');
  const [selectedAppForLetter, setSelectedAppForLetter] = useState<ApplicationItem | null>(null);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterModalCopied, setLetterModalCopied] = useState(false);
  const [coverLetterCopied, setCoverLetterCopied] = useState(false);

  const companyInputId = useId();
  const roleInputId = useId();

  // Nouveaux états pour suivi des contacts et annotations (Dossier de candidature enrichi)
  const [modalActiveTab, setModalActiveTab] = useState<'general' | 'contacts' | 'journal' | 'company'>('general');
  const [formContacts, setFormContacts] = useState<ApplicationContact[]>([]);
  const [formInteractions, setFormInteractions] = useState<ApplicationInteraction[]>([]);
  const [formCompanyPhone, setFormCompanyPhone] = useState('');
  const [formCompanyAddress, setFormCompanyAddress] = useState('');

  // Ajout de contact
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('Recruteur / RH');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactLinkedin, setNewContactLinkedin] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);

  // Ajout d'annotation
  const [newInteractionType, setNewInteractionType] = useState<ApplicationInteractionType>('note');
  const [newInteractionTitle, setNewInteractionTitle] = useState('');
  const [newInteractionContent, setNewInteractionContent] = useState('');
  const [newInteractionDate, setNewInteractionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);

  // Fiche Entreprise Modal
  const [viewingCompanyDossier, setViewingCompanyDossier] = useState<{
    dossier: CompanyFinancialTechnicalDossier;
    roleTitle?: string;
  } | null>(null);

  // Écouteur global pour la réinitialisation de la BDD
  useEffect(() => {
    const handleReset = () => {
      setSearchQuery('');
      setStatusFilter('all');
      setSelectedAppForLetter(null);
      setIsLetterModalOpen(false);
      setEditingApp(null);
      setIsModalOpen(false);
      setConfirmDeleteId(null);
      setFormCompany('');
      setFormRole('');
      setFormNotes('');
      setFormCoverLetter('');
      setFormCoverLetterTitle('');
      setFormContacts([]);
      setFormInteractions([]);
      setFormCompanyPhone('');
      setFormCompanyAddress('');
    };
    window.addEventListener('cv_move_database_reset', handleReset);
    return () => window.removeEventListener('cv_move_database_reset', handleReset);
  }, []);

  // Metrics (COMPTEUR DE RELANCES FIABILISÉ : dues en retard/aujourd'hui, prévues, et faites)
  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter((a) => ['applied', 'waiting', 'interview'].includes(a.status)).length;
    const interviews = applications.filter((a) => a.status === 'interview').length;
    const offers = applications.filter((a) => a.status === 'offer').length;
    const conversionRate = total > 0 ? Math.round(((interviews + offers) / total) * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    // Relances dues / en retard (non cochées comme faites, avec date <= aujourd'hui, excluant refusés/offres)
    const dueFollowUps = applications.filter(
      (a) => !a.checklist?.followUpDone && !!a.followUpDate && a.followUpDate <= today && a.status !== 'offer' && a.status !== 'rejected'
    ).length;
    // Toutes les relances planifiées non encore faites
    const pendingFollowUps = applications.filter(
      (a) => !a.checklist?.followUpDone && !!a.followUpDate && a.status !== 'offer' && a.status !== 'rejected'
    ).length;
    // Relances effectuées (cochées)
    const completedFollowUps = applications.filter(
      (a) => !!a.checklist?.followUpDone
    ).length;

    return { total, active, interviews, offers, conversionRate, dueFollowUps, pendingFollowUps, completedFollowUps };
  }, [applications]);

  // Action rapide : Marquer la relance comme faite / à refaire directement en 1 clic
  const handleToggleFollowUp = async (appId: string, markDone: boolean) => {
    const target = applications.find((a) => a.id === appId);
    if (!target) return;

    const today = new Date().toISOString().split('T')[0];
    const updatedChecklist = {
      ...(target.checklist || { cvSent: false, coverLetterSent: false, portfolioSent: false }),
      followUpDone: markDone,
    };

    const newInteractions = [...(target.interactions || [])];
    if (markDone) {
      newInteractions.unshift({
        id: `inter-${Date.now()}`,
        date: today,
        type: 'follow_up',
        title: 'Relance effectuée',
        content: `Relance enregistrée pour la candidature chez ${target.company}.`,
      });
    }

    const updatedApp: ApplicationItem = {
      ...target,
      checklist: updatedChecklist,
      followUpDoneAt: markDone ? today : undefined,
      interactions: newInteractions,
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) =>
      prev.map((item) => (item.id === appId ? updatedApp : item))
    );

    try {
      await localDbClient.saveApplication(updatedApp);
    } catch (err) {
      console.error('Erreur sauvegarde relance :', err);
    }
  };

  // Consultation de la fiche technique & financière entreprise liée
  const handleOpenCompanyDossier = (app: ApplicationItem) => {
    const matchingAnalysis = analyses.find(
      (a) =>
        (app.analysisId && a.id === app.analysisId) ||
        (a.company && a.company.toLowerCase().trim() === app.company.toLowerCase().trim())
    );
    const baseDossier =
      matchingAnalysis?.companyDossier ||
      extractCompanyDossier(
        matchingAnalysis?.analysisResult || '',
        matchingAnalysis?.jobText || '',
        app.company,
        app.role
      );

    const mergedDossier: CompanyFinancialTechnicalDossier = {
      ...baseDossier,
      customContacts: app.contacts && app.contacts.length > 0 ? app.contacts : baseDossier.customContacts,
      candidateNotes: app.interactions && app.interactions.length > 0 ? app.interactions : baseDossier.candidateNotes,
    };

    setViewingCompanyDossier({
      dossier: mergedDossier,
      roleTitle: app.role,
    });
  };

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        searchQuery === '' ||
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.location && app.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (app.notes && app.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (app.contacts && app.contacts.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.role?.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (app.interactions && app.interactions.some((i) => i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.content.toLowerCase().includes(searchQuery.toLowerCase())));

      let matchesStatus = true;
      if (statusFilter === 'all') {
        matchesStatus = true;
      } else if (statusFilter === 'follow_up_due') {
        const today = new Date().toISOString().split('T')[0];
        matchesStatus = !app.checklist?.followUpDone && !!app.followUpDate && app.followUpDate <= today && app.status !== 'offer' && app.status !== 'rejected';
      } else if (statusFilter === 'follow_up_done') {
        matchesStatus = !!app.checklist?.followUpDone;
      } else if (statusFilter === 'follow_up_pending') {
        matchesStatus = !app.checklist?.followUpDone && !!app.followUpDate && app.status !== 'offer' && app.status !== 'rejected';
      } else {
        matchesStatus = app.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchQuery, statusFilter]);

  // Open modal to create or edit
  const handleOpenCreateModal = () => {
    setEditingApp(null);
    setModalActiveTab('general');
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
    setFormCoverLetter('');
    setFormCoverLetterTitle('');
    setFormChecklist({ cvSent: false, coverLetterSent: false, portfolioSent: false, followUpDone: false });
    setFormContacts([]);
    setFormInteractions([]);
    setFormCompanyPhone('');
    setFormCompanyAddress('');
    setIsAddingContact(false);
    setIsAddingInteraction(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (app: ApplicationItem) => {
    setEditingApp(app);
    setModalActiveTab('general');
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
    setFormCoverLetter(app.coverLetter || '');
    setFormCoverLetterTitle(app.coverLetterTitle || '');
    setFormChecklist(app.checklist || {
      cvSent: false,
      coverLetterSent: !!app.coverLetter,
      portfolioSent: false,
      followUpDone: false,
    });

    // Chargement et migration transparente des contacts existants
    const existingContacts: ApplicationContact[] =
      app.contacts && app.contacts.length > 0
        ? [...app.contacts]
        : app.contact
        ? [{ id: 'c-init', name: app.contact, role: 'Contact RH / Recruteur' }]
        : [];
    setFormContacts(existingContacts);

    // Chargement et migration des interactions
    const existingInteractions: ApplicationInteraction[] =
      app.interactions && app.interactions.length > 0
        ? [...app.interactions]
        : app.notes
        ? [
            {
              id: 'i-init',
              date: app.appliedDate || new Date().toISOString().split('T')[0],
              type: 'note',
              title: 'Note initiale',
              content: app.notes,
            },
          ]
        : [];
    setFormInteractions(existingInteractions);

    setFormCompanyPhone(app.companyPhone || '');
    setFormCompanyAddress(app.companyAddress || '');
    setIsAddingContact(false);
    setIsAddingInteraction(false);
    setIsModalOpen(true);
  };

  // Gestion des contacts dans le formulaire
  const handleAddContact = () => {
    if (!newContactName.trim()) return;
    const newContact: ApplicationContact = {
      id: `c-${Date.now()}`,
      name: newContactName.trim(),
      role: newContactRole.trim() || 'Contact',
      email: newContactEmail.trim() || undefined,
      phone: newContactPhone.trim() || undefined,
      linkedinUrl: newContactLinkedin.trim() || undefined,
      notes: newContactNotes.trim() || undefined,
    };
    setFormContacts((prev) => [...prev, newContact]);
    setNewContactName('');
    setNewContactRole('Recruteur / RH');
    setNewContactEmail('');
    setNewContactPhone('');
    setNewContactLinkedin('');
    setNewContactNotes('');
    setIsAddingContact(false);
  };

  const handleDeleteContact = (contactId: string) => {
    setFormContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  // Gestion des annotations et interactions dans le formulaire
  const handleAddInteraction = () => {
    if (!newInteractionContent.trim() && !newInteractionTitle.trim()) return;
    const newInter: ApplicationInteraction = {
      id: `inter-${Date.now()}`,
      date: newInteractionDate || new Date().toISOString().split('T')[0],
      type: newInteractionType,
      title:
        newInteractionTitle.trim() ||
        (newInteractionType === 'call'
          ? 'Appel téléphonique'
          : newInteractionType === 'email'
          ? 'Email échangé'
          : newInteractionType === 'interview'
          ? 'Entretien'
          : newInteractionType === 'follow_up'
          ? 'Relance'
          : 'Annotation'),
      content: newInteractionContent.trim(),
    };
    setFormInteractions((prev) => [newInter, ...prev]);
    setNewInteractionTitle('');
    setNewInteractionContent('');
    setNewInteractionType('note');
    setNewInteractionDate(new Date().toISOString().split('T')[0]);
    setIsAddingInteraction(false);
  };

  const handleDeleteInteraction = (interId: string) => {
    setFormInteractions((prev) => prev.filter((i) => i.id !== interId));
  };

  const handleSaveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim() || !formRole.trim()) return;

    const parsedScore = formScore.trim() ? parseInt(formScore, 10) : null;
    const finalCoverLetter = formCoverLetter.trim();
    const finalChecklist = {
      ...formChecklist,
      coverLetterSent: finalCoverLetter ? true : formChecklist.coverLetterSent,
    };

    const finalContacts = formContacts;
    const finalInteractions = formInteractions;
    const primaryContactStr = formContact.trim() || (finalContacts.length > 0 ? `${finalContacts[0].name} (${finalContacts[0].role || 'Contact'})` : '');
    const primaryNotesStr = formNotes.trim() || (finalInteractions.length > 0 ? finalInteractions[0].content : '');

    if (editingApp) {
      // Update
      const updatedApp: ApplicationItem = {
        ...editingApp,
        company: formCompany.trim(),
        role: formRole.trim(),
        status: formStatus,
        appliedDate: formAppliedDate,
        followUpDate: formFollowUpDate,
        location: formLocation.trim(),
        contractType: formContractType,
        salary: formSalary.trim(),
        jobUrl: formJobUrl.trim(),
        contact: primaryContactStr,
        contacts: finalContacts,
        notes: primaryNotesStr,
        interactions: finalInteractions,
        companyPhone: formCompanyPhone.trim() || undefined,
        companyAddress: formCompanyAddress.trim() || undefined,
        score: isNaN(Number(parsedScore)) ? null : parsedScore,
        analysisId: formAnalysisId.trim() || null,
        coverLetter: finalCoverLetter || undefined,
        coverLetterTitle: formCoverLetterTitle.trim() || (finalCoverLetter ? `Lettre - ${formCompany.trim()}` : undefined),
        checklist: finalChecklist,
        followUpDoneAt: finalChecklist.followUpDone ? (editingApp.followUpDoneAt || new Date().toISOString().split('T')[0]) : undefined,
        updatedAt: new Date().toISOString(),
      };
      setApplications((prev) =>
        prev.map((item) => (item.id === editingApp.id ? updatedApp : item))
      );
      try {
        await localDbClient.saveApplication(updatedApp);
        if (finalCoverLetter) {
          await localDbClient.saveCoverLetter({
            id: `letter-${editingApp.id}`,
            title: updatedApp.coverLetterTitle || `Lettre - ${updatedApp.company}`,
            company: updatedApp.company,
            role: updatedApp.role,
            content: finalCoverLetter,
            applicationId: updatedApp.id,
            createdAt: updatedApp.createdAt,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Erreur mise à jour candidature :', err);
      }
    } else {
      // Create
      const newAppId = 'app-' + Date.now();
      const newApp: ApplicationItem = {
        id: newAppId,
        company: formCompany.trim(),
        role: formRole.trim(),
        status: formStatus,
        appliedDate: formAppliedDate,
        followUpDate: formFollowUpDate,
        location: formLocation.trim(),
        contractType: formContractType,
        salary: formSalary.trim(),
        jobUrl: formJobUrl.trim(),
        contact: primaryContactStr,
        contacts: finalContacts,
        notes: primaryNotesStr,
        interactions: finalInteractions,
        companyPhone: formCompanyPhone.trim() || undefined,
        companyAddress: formCompanyAddress.trim() || undefined,
        score: isNaN(Number(parsedScore)) ? null : parsedScore,
        analysisId: formAnalysisId.trim() || null,
        coverLetter: finalCoverLetter || undefined,
        coverLetterTitle: formCoverLetterTitle.trim() || (finalCoverLetter ? `Lettre - ${formCompany.trim()}` : undefined),
        checklist: finalChecklist,
        followUpDoneAt: finalChecklist.followUpDone ? new Date().toISOString().split('T')[0] : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setApplications((prev) => [newApp, ...prev]);
      try {
        await localDbClient.saveApplication(newApp);
        if (finalCoverLetter) {
          await localDbClient.saveCoverLetter({
            id: `letter-${newAppId}`,
            title: newApp.coverLetterTitle || `Lettre - ${newApp.company}`,
            company: newApp.company,
            role: newApp.role,
            content: finalCoverLetter,
            applicationId: newApp.id,
            createdAt: newApp.createdAt,
            updatedAt: newApp.updatedAt,
          });
        }
      } catch (err) {
        console.error('Erreur création candidature :', err);
      }
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

  const handleQuickStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    let targetApp: ApplicationItem | null = null;
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          targetApp = {
            ...app,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };
          return targetApp;
        }
        return app;
      })
    );
    if (targetApp) {
      try {
        await localDbClient.saveApplication(targetApp);
      } catch (err) {
        console.error('Erreur mise à jour statut candidature :', err);
      }
    }
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
      {/* Alerte si Mode Démonstration Actif */}
      {isDemoMode && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Kanban en Mode Démonstration :</strong> Vous consultez les 6 candidatures fictives de test de <strong>Thomas Laurent</strong>. Vos vraies candidatures personnelles sont intactes et isolées.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleDemoMode?.(false)}
            className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
          >
            Quitter la Démo & Revenir à mes candidatures
          </button>
        </div>
      )}

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
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors text-purple-700 hover:bg-purple-100/70 bg-purple-50/50 border border-purple-200 cursor-pointer"
                title="Consulter les graphiques, entonnoirs et rapports d'activité"
              >
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="hidden sm:inline">Analyses & Rapports 📈</span>
              </button>
            )}
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
          onClick={() => {
            if (statusFilter === 'follow_up_due' || statusFilter === 'follow_up_pending' || statusFilter === 'follow_up_done') {
              setStatusFilter('all');
            } else if (stats.dueFollowUps > 0) {
              setStatusFilter('follow_up_due');
            } else if (stats.pendingFollowUps > 0) {
              setStatusFilter('follow_up_pending');
            } else {
              setStatusFilter('follow_up_done');
            }
          }}
          className={`p-3.5 rounded-xl border shadow-2xs transition-all cursor-pointer hover:shadow-md ${
            stats.dueFollowUps > 0
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
              : stats.completedFollowUps > 0
              ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
              : 'bg-white border-gray-200'
          }`}
          title="Cliquer pour filtrer les candidatures selon les relances"
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-[11px] font-bold uppercase tracking-wider ${
                stats.dueFollowUps > 0 ? 'text-amber-800' : 'text-gray-500'
              }`}
            >
              Relances
            </p>
            {statusFilter.startsWith('follow_up') && (
              <span className="text-[9px] bg-gray-900 text-white px-1.5 py-0.2 rounded-full font-bold">
                Filtré ✕
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl font-black ${
                stats.dueFollowUps > 0 ? 'text-amber-900' : 'text-gray-900'
              }`}
            >
              {stats.dueFollowUps > 0 ? stats.dueFollowUps : stats.completedFollowUps}
            </span>
            <span
              className={`text-[11px] font-bold ${
                stats.dueFollowUps > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {stats.dueFollowUps > 0 ? 'à faire !' : `${stats.completedFollowUps} faite${stats.completedFollowUps > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-100">
            <span>📅 {stats.pendingFollowUps} prévue{stats.pendingFollowUps > 1 ? 's' : ''}</span>
            <span className="text-emerald-700 font-bold">✓ {stats.completedFollowUps} faite{stats.completedFollowUps > 1 ? 's' : ''}</span>
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
            placeholder="Rechercher par entreprise, poste, lieu, contact, mot-clé..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#FF4B4B] bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-xs py-2 px-3 border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-hidden focus:ring-2 focus:ring-[#FF4B4B] font-semibold"
          >
            <option value="all">Tous les statuts ({applications.length})</option>
            <option value="follow_up_due">⏰ Relances dues ({stats.dueFollowUps})</option>
            <option value="follow_up_pending">📅 Toutes relances prévues ({stats.pendingFollowUps})</option>
            <option value="follow_up_done">✅ Relances effectuées ({stats.completedFollowUps})</option>
            <option disabled>──────────</option>
            <option value="to_apply">📝 À postuler</option>
            <option value="applied">📤 Postulé</option>
            <option value="waiting">⏳ En attente</option>
            <option value="interview">🎯 Entretien</option>
            <option value="offer">🎉 Offre reçue</option>
            <option value="rejected">❌ Refusé</option>
          </select>
        </div>
      </div>

      {/* VUE KANBAN REFORMATÉE */}
      {viewMode === 'kanban' && (
        <div className="space-y-3.5">
          {/* Barre d'outils dédiée au Kanban : Verrouillage du déplacement & Largeur des colonnes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Bouton pour verrouiller / déverrouiller le déplacement des cartes à la souris */}
              <button
                type="button"
                onClick={toggleDragLock}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer border shadow-2xs ${
                  isDragLocked
                    ? 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100 ring-2 ring-amber-200/70'
                    : 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100 ring-2 ring-emerald-200/70'
                }`}
                title={
                  isDragLocked
                    ? 'Déplacement verrouillé : cliquez pour déverrouiller et déplacer les cartes avec la souris'
                    : 'Déplacement actif : cliquez pour verrouiller et protéger le tableau contre tout glissement accidentel'
                }
              >
                {isDragLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>🔒 Déplacement verrouillé (Cartes fixes)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>🔓 Déplacement actif (Glisser-déposer souris)</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-gray-500 hidden md:inline">
                {isDragLocked
                  ? 'Vos cartes sont protégées contre tout déplacement involontaire.'
                  : 'Saisissez une carte avec la souris et relâchez-la dans la colonne cible.'}
              </span>
            </div>

            {/* Sélecteur de mise en page des colonnes */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setKanbanLayout('spacious')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  kanbanLayout === 'spacious'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Colonnes spacieuses (310px) : toutes les informations, notes et lettres sont 100% lisibles sans coupure"
              >
                Colonnes larges (Lisibilité max)
              </button>
              <button
                type="button"
                onClick={() => setKanbanLayout('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  kanbanLayout === 'grid'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Grille compacte (Colonnes ajustées)"
              >
                Grille ajustée
              </button>
            </div>
          </div>

          {/* Toast de confirmation de déplacement */}
          {moveToast && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in ${
                moveToast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{moveToast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setMoveToast(null)}
                className="text-gray-500 hover:text-gray-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Conteneur des colonnes Kanban */}
          <div
            className={`w-full ${
              kanbanLayout === 'spacious'
                ? 'overflow-x-auto pb-4 pt-1 -mx-2 px-2 scrollbar-thin'
                : ''
            }`}
          >
            <div
              className={
                kanbanLayout === 'spacious'
                  ? 'flex gap-4 items-start min-w-[1440px] w-full'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start'
              }
            >
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
                const isCurrentDragTarget = dragOverColumn === statusKey && !isDragLocked;

                return (
                  <div
                    key={statusKey}
                    onDragOver={(e) => {
                      if (!isDragLocked) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverColumn !== statusKey) {
                          setDragOverColumn(statusKey);
                        }
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverColumn === statusKey) {
                        setDragOverColumn(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (isDragLocked) return;
                      const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
                      if (appId) {
                        handleDropOnColumn(appId, statusKey);
                      }
                      setDraggedAppId(null);
                      setDragOverColumn(null);
                    }}
                    className={`border rounded-2xl p-3.5 flex flex-col gap-3 min-h-[460px] transition-all ${
                      kanbanLayout === 'spacious' ? 'flex-1 min-w-[290px] sm:min-w-[310px] max-w-[350px]' : ''
                    } ${
                      isCurrentDragTarget
                        ? 'border-blue-500 bg-blue-50/80 ring-4 ring-blue-200/80 shadow-md'
                        : 'bg-gray-50/80 border-gray-200/90 shadow-2xs'
                    }`}
                  >
                    {/* En-tête de la colonne */}
                    <div className="flex items-center justify-between px-1 pb-2 border-b border-gray-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{config.icon}</span>
                        <span className="text-xs font-extrabold text-gray-900 truncate">
                          {config.label}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${config.bg} ${config.text} ${config.border}`}
                      >
                        {columnApps.length}
                      </span>
                    </div>

                    {/* Indicateur de dépôt lors du glisser-déposer */}
                    {isCurrentDragTarget && (
                      <div className="p-2 bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold text-center animate-pulse">
                        📥 Relâcher pour déposer dans « {config.label} »
                      </div>
                    )}

                    {/* Liste des cartes dans la colonne */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {columnApps.length === 0 ? (
                        <div className={`py-12 text-center border-2 border-dashed rounded-xl transition-colors ${
                          isCurrentDragTarget ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200'
                        }`}>
                          <p className="text-xs text-gray-400 font-medium">
                            {isCurrentDragTarget ? 'Déposer la carte ici' : 'Aucun dossier'}
                          </p>
                        </div>
                      ) : (
                        columnApps.map((app) => {
                          const isFollowUpDue =
                            !app.checklist?.followUpDone &&
                            app.followUpDate &&
                            app.followUpDate <= new Date().toISOString().split('T')[0] &&
                            ['applied', 'waiting'].includes(app.status);
                          const isNoteExpanded = expandedNotes.has(app.id);
                          const isBeingDragged = draggedAppId === app.id;

                          return (
                            <div
                              key={app.id}
                              draggable={!isDragLocked}
                              onDragStart={(e) => {
                                if (isDragLocked) {
                                  e.preventDefault();
                                  return;
                                }
                                e.dataTransfer.setData('text/plain', app.id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedAppId(app.id);
                              }}
                              onDragEnd={() => {
                                setDraggedAppId(null);
                                setDragOverColumn(null);
                              }}
                              className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-md transition-all space-y-3 relative group ${
                                isBeingDragged
                                  ? 'opacity-40 scale-95 border-blue-400 ring-2 ring-blue-300 shadow-lg'
                                  : 'border-gray-200 hover:border-blue-200'
                              } ${!isDragLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            >
                              {/* En-tête de la carte */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    {!isDragLocked ? (
                                      <span
                                        className="text-gray-400 hover:text-blue-600 cursor-grab p-0.5"
                                        title="Glisser-déposer cette carte avec la souris"
                                      >
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </span>
                                    ) : (
                                      <span
                                        className="text-amber-600/80 p-0.5"
                                        title="Déplacement verrouillé (cliquez sur le bouton en haut pour déverrouiller)"
                                      >
                                        <Lock className="w-3 h-3" />
                                      </span>
                                    )}
                                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1 truncate">
                                      <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span className="truncate">{app.company}</span>
                                    </span>
                                  </div>

                                  <h4 className="text-sm font-extrabold text-gray-900 leading-snug mt-1 break-words">
                                    {app.role}
                                  </h4>
                                </div>

                                {app.score !== null && app.score !== undefined && (
                                  <div
                                    title={`Score de compatibilité ATS : ${app.score}%`}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 shadow-2xs ${
                                      app.score >= 75
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                        : app.score >= 50
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                                    }`}
                                  >
                                    {app.score}% ATS
                                  </div>
                                )}
                              </div>

                              {/* Détails Contrat & Lieu & Salaire */}
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-600 flex-wrap">
                                {app.contractType && (
                                  <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded-md border border-gray-200">
                                    {app.contractType}
                                  </span>
                                )}
                                {app.location && (
                                  <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>{app.location}</span>
                                  </span>
                                )}
                                {app.salary && (
                                  <span className="bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                                    💰 {app.salary}
                                  </span>
                                )}
                              </div>

                              {/* Date de relance avec alerte et action directe 1 clic */}
                              {app.followUpDate && (
                                <div
                                  className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                                    app.checklist?.followUpDone
                                      ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                                      : isFollowUpDue
                                      ? 'bg-amber-50 text-amber-950 font-bold border-amber-300 ring-1 ring-amber-200'
                                      : 'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    {app.checklist?.followUpDone ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    ) : (
                                      <Clock className={`w-3.5 h-3.5 ${isFollowUpDue ? 'text-amber-700' : 'text-gray-500'} shrink-0`} />
                                    )}
                                    <span>Relance : <strong>{app.followUpDate}</strong></span>
                                  </span>

                                  {app.checklist?.followUpDone ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFollowUp(app.id, false);
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Relance déjà effectuée. Cliquer pour réinitialiser ou planifier une nouvelle relance"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                      <span>FAITE</span>
                                    </button>
                                  ) : isFollowUpDue ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFollowUp(app.id, true);
                                      }}
                                      className="bg-amber-600 hover:bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                      title="Cliquer pour marquer la relance comme faite"
                                    >
                                      <span>À FAIRE !</span>
                                      <Check className="w-2.5 h-2.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFollowUp(app.id, true);
                                      }}
                                      className="text-[10px] text-gray-400 hover:text-emerald-700 hover:bg-white px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                      title="Marquer la relance comme faite"
                                    >
                                      Marquer faite
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Badges résumés pour Contacts et Annotations */}
                              {((app.contacts && app.contacts.length > 0) || (app.interactions && app.interactions.length > 0)) && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  {app.contacts && app.contacts.length > 0 && (
                                    <span
                                      className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1"
                                      title={app.contacts.map((c) => `${c.name} (${c.role || 'Contact'})`).join(', ')}
                                    >
                                      <Users className="w-3 h-3 text-blue-600" />
                                      <span>{app.contacts.length} contact{app.contacts.length > 1 ? 's' : ''}</span>
                                    </span>
                                  )}
                                  {app.interactions && app.interactions.length > 0 && (
                                    <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                                      <FileText className="w-3 h-3 text-purple-600" />
                                      <span>{app.interactions.length} note{app.interactions.length > 1 ? 's' : ''}</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Note rapide sans coupure tronquée */}
                              {app.notes && (
                                <div className="bg-amber-50/60 border border-amber-200/90 rounded-lg p-2.5 text-xs text-gray-800">
                                  <div className="flex items-start justify-between gap-1">
                                    <p className={`text-xs text-gray-800 italic leading-relaxed ${
                                      isNoteExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'
                                    }`}>
                                      « {app.notes} »
                                    </p>
                                  </div>
                                  {app.notes.length > 80 && (
                                    <button
                                      type="button"
                                      onClick={(e) => toggleNoteExpanded(app.id, e)}
                                      className="text-[10px] text-blue-700 hover:text-blue-900 font-bold mt-1.5 underline cursor-pointer"
                                    >
                                      {isNoteExpanded ? '▲ Réduire la note' : '▼ Lire toute la note'}
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Lettre de motivation rattachée sans coupure */}
                              {app.coverLetter ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAppForLetter(app);
                                    setIsLetterModalOpen(true);
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                  title="Consulter et copier la lettre de motivation"
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                    <span className="truncate">
                                      Lettre de motivation ({app.coverLetter.split(/\s+/).filter(Boolean).length} mots)
                                    </span>
                                  </span>
                                  <span className="text-[11px] text-purple-700 font-extrabold bg-purple-200/80 px-2 py-0.5 rounded shrink-0 ml-1">
                                    Consulter ↗
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(app);
                                  }}
                                  className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-gray-300 text-gray-500 hover:text-purple-700 hover:border-purple-300 hover:bg-purple-50/40 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                  title="Ajouter une lettre de motivation"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Ajouter une lettre de motivation</span>
                                </button>
                              )}

                              {/* Pied de carte avec actions */}
                              <div
                                className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-1 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1">
                                  {app.jobUrl && (
                                    <a
                                      href={app.jobUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                      title="Ouvrir l'offre d'emploi"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {app.analysisId && onOpenAnalysis && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenAnalysis(app.analysisId!)}
                                      className="p-1.5 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                                      title="Consulter l'analyse ATS liée"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCompanyDossier(app)}
                                    className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                    title="Consulter la Fiche Entreprise & Stratégie"
                                  >
                                    <Building2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(app)}
                                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                                    title="Modifier cette candidature"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  {confirmDeleteId === app.id ? (
                                    <div
                                      className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-1.5 py-0.5 rounded shadow-xs"
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
                                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                      title="Supprimer cette candidature"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Sélecteur de statut rapide ou bouton d'avancement */}
                                <div className="flex items-center gap-1">
                                  {config.next && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusChange(app.id, config.next!)}
                                      className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                      title={`Avancer directement vers : ${STATUS_CONFIG[config.next].label}`}
                                    >
                                      <span>{STATUS_CONFIG[config.next].label}</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
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
          </div>
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
                      !app.checklist?.followUpDone &&
                      !!app.followUpDate &&
                      app.followUpDate <= new Date().toISOString().split('T')[0] &&
                      app.status !== 'offer' &&
                      app.status !== 'rejected';

                    return (
                      <tr key={app.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{app.company}</span>
                            <button
                              type="button"
                              onClick={() => handleOpenCompanyDossier(app)}
                              className="text-blue-600 hover:text-blue-800 p-0.5"
                              title="Consulter la Fiche Entreprise & Stratégie"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                          <div className="flex items-center gap-2">
                            {app.followUpDate ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                                  app.checklist?.followUpDone
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : isFollowUpDue
                                    ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300 ring-1 ring-amber-200'
                                    : 'text-gray-600 bg-gray-50 border border-gray-200'
                                }`}
                              >
                                <Clock className="w-3 h-3 text-gray-500" />
                                {app.followUpDate}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-[11px] italic">Non fixée</span>
                            )}

                            {/* Action rapide 1-clic pour cocher / décocher la relance */}
                            {app.checklist?.followUpDone ? (
                              <button
                                type="button"
                                onClick={() => handleToggleFollowUp(app.id, false)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Relance effectuée. Cliquer pour réinitialiser ou planifier une nouvelle relance"
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>Faite</span>
                              </button>
                            ) : isFollowUpDue ? (
                              <button
                                type="button"
                                onClick={() => handleToggleFollowUp(app.id, true)}
                                className="px-2 py-0.5 bg-amber-600 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs animate-pulse"
                                title="Relance à faire ! Cliquer pour marquer comme effectuée"
                              >
                                <span>À faire !</span>
                                <Check className="w-2.5 h-2.5" />
                              </button>
                            ) : app.followUpDate ? (
                              <button
                                type="button"
                                onClick={() => handleToggleFollowUp(app.id, true)}
                                className="px-1.5 py-0.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 border border-gray-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                title="Marquer comme faite"
                              >
                                Marquer faite
                              </button>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                          <div>{app.location || '-'}</div>
                          <div className="text-[10px] text-gray-400">{app.contractType}</div>
                        </td>

                        <td className="py-3 px-4 text-gray-600 max-w-xs">
                          <div className="space-y-1">
                            {((app.contacts && app.contacts.length > 0) || (app.interactions && app.interactions.length > 0)) && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {app.contacts && app.contacts.length > 0 && (
                                  <span
                                    className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1"
                                    title={app.contacts.map((c) => `${c.name} (${c.role || 'Contact'})`).join(', ')}
                                  >
                                    <Users className="w-2.5 h-2.5 text-blue-600" />
                                    <span>{app.contacts.length} contact{app.contacts.length > 1 ? 's' : ''}</span>
                                  </span>
                                )}
                                {app.interactions && app.interactions.length > 0 && (
                                  <span
                                    className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1"
                                    title={`${app.interactions.length} interactions/annotations`}
                                  >
                                    <FileText className="w-2.5 h-2.5 text-purple-600" />
                                    <span>{app.interactions.length} note{app.interactions.length > 1 ? 's' : ''}</span>
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-xs text-gray-700 truncate" title={app.notes}>
                              {app.notes || <span className="text-gray-300">-</span>}
                            </div>
                          </div>
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
                              onClick={() => handleOpenCompanyDossier(app)}
                              className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Consulter la Fiche Entreprise & Stratégie"
                            >
                              <Building2 className="w-4 h-4" />
                            </button>
                            {app.coverLetter && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAppForLetter(app);
                                  setIsLetterModalOpen(true);
                                }}
                                className="p-1.5 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                                title="Consulter la Lettre de motivation"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(app)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors cursor-pointer"
                              title="Modifier / Annoter cette candidature"
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

      {/* MODAL CRÉATION / MODIFICATION DE CANDIDATURE AVEC ONGLETS ENRICHIS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-6 max-h-[92vh] flex flex-col">
            {/* Entête du modal */}
            <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-[#FF4B4B]/10 text-[#FF4B4B] rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900">
                    {editingApp ? `Dossier de candidature : ${formCompany || 'Entreprise'}` : 'Nouvelle candidature'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {formRole || 'Intitulé du poste'} — Suivi complet, contacts & stratégie
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation des Onglets du Modal */}
            <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2 mb-4 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setModalActiveTab('general')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  modalActiveTab === 'general'
                    ? 'bg-[#FF4B4B] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Général & Relance</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('contacts')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  modalActiveTab === 'contacts'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Contacts & Coordonnées</span>
                {formContacts.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      modalActiveTab === 'contacts' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {formContacts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('journal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  modalActiveTab === 'journal'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Journal & Annotations</span>
                {formInteractions.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      modalActiveTab === 'journal' ? 'bg-white text-purple-700' : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {formInteractions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('company')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  modalActiveTab === 'company'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Fiche Entreprise & Stratégie</span>
              </button>
            </div>

            <form onSubmit={handleSaveApplication} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* ONGLET 1 : GÉNÉRAL & OFFRE */}
              {modalActiveTab === 'general' && (
                <div className="space-y-4">
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700">
                          Date de relance prévue
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              setFormFollowUpDate(d.toISOString().split('T')[0]);
                            }}
                            className="text-[10px] text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 px-1.5 py-0.2 rounded font-medium cursor-pointer"
                            title="Aujourd'hui"
                          >
                            Aujourd&apos;hui
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(Date.now() + 7 * 86400000);
                              setFormFollowUpDate(d.toISOString().split('T')[0]);
                            }}
                            className="text-[10px] text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 px-1.5 py-0.2 rounded font-medium cursor-pointer"
                            title="+7 jours"
                          >
                            +7j
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(Date.now() + 14 * 86400000);
                              setFormFollowUpDate(d.toISOString().split('T')[0]);
                            }}
                            className="text-[10px] text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 px-1.5 py-0.2 rounded font-medium cursor-pointer"
                            title="+14 jours"
                          >
                            +14j
                          </button>
                        </div>
                      </div>
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

                  {/* Checklist des pièces & Case à cocher Relance Fiabilisée */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Checklist des pièces & statut de la relance :
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

                      {/* Case à cocher Relance avec visuel immédiat vert / gris */}
                      <label
                        className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          formChecklist.followUpDone
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold ring-1 ring-emerald-200'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formChecklist.followUpDone}
                          onChange={(e) =>
                            setFormChecklist((p) => ({ ...p, followUpDone: e.target.checked }))
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Relance faite</span>
                      </label>
                    </div>

                    {formChecklist.followUpDone && (
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Relance validée : le compteur de relances s&apos;actualisera immédiatement à l&apos;enregistrement.
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Section Lettre de motivation rattachée */}
                  <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-700" />
                        <span>Lettre de motivation rattachée à cette candidature</span>
                      </label>
                      {formCoverLetter && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(formCoverLetter);
                              setCoverLetterCopied(true);
                              setTimeout(() => setCoverLetterCopied(false), 2000);
                            }}
                            className="text-[11px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {coverLetterCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{coverLetterCopied ? 'Copiée !' : 'Copier'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const blob = new Blob([formCoverLetter], { type: 'application/msword;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Lettre_Motivation_${(formCompany || 'Candidature').replace(/\s+/g, '_')}.doc`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
                            title="Télécharger en Word (.doc)"
                          >
                            <Download className="w-3 h-3" />
                            <span>Word (.doc)</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <textarea
                      rows={4}
                      value={formCoverLetter}
                      onChange={(e) => {
                        setFormCoverLetter(e.target.value);
                        if (e.target.value.trim() && !formChecklist.coverLetterSent) {
                          setFormChecklist((p) => ({ ...p, coverLetterSent: true }));
                        }
                      }}
                      placeholder="Collez ou rédigez ici le contenu de la lettre de motivation transmise ou préparée pour cette offre..."
                      className="w-full text-xs p-3 border border-purple-200 bg-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-sans leading-relaxed text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Note rapide
                    </label>
                    <textarea
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Remarque générale sur la candidature (pour un suivi détaillé, utilisez l'onglet Journal)..."
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4B4B] focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* ONGLET 2 : CONTACTS & COORDONNÉES */}
              {modalActiveTab === 'contacts' && (
                <div className="space-y-4">
                  {/* Coordonnées globales de l'entreprise */}
                  <div className="bg-blue-50/50 border border-blue-200 p-3.5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Coordonnées générales de l&apos;entreprise</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Standard / Téléphone accueil
                        </label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            value={formCompanyPhone}
                            onChange={(e) => setFormCompanyPhone(e.target.value)}
                            placeholder="ex: +33 1 45 67 89 00"
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Adresse physique / Siège social
                        </label>
                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={formCompanyAddress}
                            onChange={(e) => setFormCompanyAddress(e.target.value)}
                            placeholder="ex: 12 rue de la Paix, 75002 Paris"
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Liste des contacts avec bouton d'ajout */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Interlocuteurs identifiés ({formContacts.length})</span>
                      </h4>
                      {!isAddingContact && (
                        <button
                          type="button"
                          onClick={() => setIsAddingContact(true)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter un contact</span>
                        </button>
                      )}
                    </div>

                    {/* Formulaire d'ajout de contact */}
                    {isAddingContact && (
                      <div className="bg-white border-2 border-blue-300 p-4 rounded-2xl shadow-sm space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="text-xs font-bold text-blue-900">Nouveau contact</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingContact(false)}
                            className="text-gray-400 hover:text-gray-600 text-xs"
                          >
                            Annuler
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Nom et Prénom *
                            </label>
                            <input
                              type="text"
                              value={newContactName}
                              onChange={(e) => setNewContactName(e.target.value)}
                              placeholder="ex: Sophie Martin"
                              className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Rôle / Fonction
                            </label>
                            <select
                              value={newContactRole}
                              onChange={(e) => setNewContactRole(e.target.value)}
                              className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            >
                              <option value="Recruteur / RH">Recruteur / RH</option>
                              <option value="Manager N+1">Manager N+1</option>
                              <option value="Directeur Financier (DAF)">Directeur Financier (DAF)</option>
                              <option value="Directeur Général (DG)">Directeur Général (DG)</option>
                              <option value="Chasseur de têtes">Chasseur de têtes</option>
                              <option value="Pair / Équipe">Pair / Équipe</option>
                              <option value="Autre">Autre</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Email direct
                            </label>
                            <input
                              type="email"
                              value={newContactEmail}
                              onChange={(e) => setNewContactEmail(e.target.value)}
                              placeholder="ex: sophie.martin@entreprise.com"
                              className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Téléphone direct / mobile
                            </label>
                            <input
                              type="tel"
                              value={newContactPhone}
                              onChange={(e) => setNewContactPhone(e.target.value)}
                              placeholder="ex: 06 12 34 56 78"
                              className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Profil LinkedIn (URL)
                          </label>
                          <input
                            type="url"
                            value={newContactLinkedin}
                            onChange={(e) => setNewContactLinkedin(e.target.value)}
                            placeholder="https://www.linkedin.com/in/..."
                            className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Notes & observations sur ce contact
                          </label>
                          <input
                            type="text"
                            value={newContactNotes}
                            onChange={(e) => setNewContactNotes(e.target.value)}
                            placeholder="ex: Décisionnaire final, apprécie les démarches directes..."
                            className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => setIsAddingContact(false)}
                            className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleAddContact}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Enregistrer ce contact
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Liste des cartes de contacts */}
                    {formContacts.length === 0 && !isAddingContact ? (
                      <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-xs">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="font-semibold">Aucun interlocuteur enregistré</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Ajoutez les recruteurs, managers ou RH rencontrés pour faciliter vos relances.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddingContact(true)}
                          className="mt-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter le premier contact</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {formContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs hover:border-blue-300 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <h5 className="font-bold text-gray-900 text-xs">{contact.name}</h5>
                                <span className="inline-block text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.2 rounded-md font-semibold mt-0.5">
                                  {contact.role || 'Contact'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(contact.id)}
                                className="text-gray-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                                title="Supprimer ce contact"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="space-y-1 text-xs text-gray-600">
                              {contact.email && (
                                <div className="flex items-center gap-1.5 truncate">
                                  <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="text-blue-600 hover:underline truncate"
                                  >
                                    {contact.email}
                                  </a>
                                </div>
                              )}
                              {contact.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                  <a href={`tel:${contact.phone}`} className="hover:underline">
                                    {contact.phone}
                                  </a>
                                </div>
                              )}
                              {contact.linkedinUrl && (
                                <div className="flex items-center gap-1.5">
                                  <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                                  <a
                                    href={contact.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-[11px] flex items-center gap-0.5"
                                  >
                                    <span>Profil LinkedIn</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                              {contact.notes && (
                                <p className="text-[11px] text-gray-500 italic bg-gray-50 p-1.5 rounded">
                                  « {contact.notes} »
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ONGLET 3 : JOURNAL & ANNOTATIONS */}
              {modalActiveTab === 'journal' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>Journal de bord & Timeline des échanges ({formInteractions.length})</span>
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Consignez les appels, retours, entretiens, relances et impressions
                      </p>
                    </div>
                    {!isAddingInteraction && (
                      <button
                        type="button"
                        onClick={() => setIsAddingInteraction(true)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nouvelle annotation</span>
                      </button>
                    )}
                  </div>

                  {/* Formulaire d'ajout d'annotation */}
                  {isAddingInteraction && (
                    <div className="bg-white border-2 border-purple-300 p-4 rounded-2xl shadow-sm space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="text-xs font-bold text-purple-900">Nouvelle annotation / interaction</span>
                        <button
                          type="button"
                          onClick={() => setIsAddingInteraction(false)}
                          className="text-gray-400 hover:text-gray-600 text-xs"
                        >
                          Annuler
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Type d&apos;échange
                          </label>
                          <select
                            value={newInteractionType}
                            onChange={(e) => setNewInteractionType(e.target.value as ApplicationInteractionType)}
                            className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                          >
                            <option value="note">📝 Note / Réflexion</option>
                            <option value="call">📞 Appel téléphonique</option>
                            <option value="email">✉️ Email échangé</option>
                            <option value="interview">🎯 Entretien d&apos;embauche</option>
                            <option value="follow_up">⏰ Relance effectuée</option>
                            <option value="feedback">💬 Retour / Feedback</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Date de l&apos;interaction
                          </label>
                          <input
                            type="date"
                            value={newInteractionDate}
                            onChange={(e) => setNewInteractionDate(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Titre résumé
                          </label>
                          <input
                            type="text"
                            value={newInteractionTitle}
                            onChange={(e) => setNewInteractionTitle(e.target.value)}
                            placeholder="ex: Échange téléphonique avec la RH"
                            className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Contenu détaillé de l&apos;annotation *
                        </label>
                        <textarea
                          rows={3}
                          value={newInteractionContent}
                          onChange={(e) => setNewInteractionContent(e.target.value)}
                          placeholder="Questions posées, points d'accord, attentes du manager, ressentis, prochaines étapes..."
                          className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setIsAddingInteraction(false)}
                          className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleAddInteraction}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Enregistrer l&apos;annotation
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Liste chronologique des annotations */}
                  {formInteractions.length === 0 && !isAddingInteraction ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-xs">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold">Aucune annotation enregistrée</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Consignez vos échanges et impressions pour garder une trace vivante de chaque candidature.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddingInteraction(true)}
                        className="mt-3 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter la première note</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {formInteractions.map((item) => {
                        const iconMap = {
                          call: <Phone className="w-3.5 h-3.5 text-blue-600" />,
                          email: <Mail className="w-3.5 h-3.5 text-amber-600" />,
                          interview: <Award className="w-3.5 h-3.5 text-purple-600" />,
                          follow_up: <Clock className="w-3.5 h-3.5 text-emerald-600" />,
                          feedback: <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />,
                          note: <FileText className="w-3.5 h-3.5 text-gray-600" />,
                        };
                        return (
                          <div
                            key={item.id}
                            className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs hover:border-purple-200 transition-all space-y-1.5 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-gray-100 rounded-lg">
                                  {iconMap[item.type] || <FileText className="w-3.5 h-3.5 text-gray-600" />}
                                </span>
                                <div>
                                  <h5 className="font-bold text-gray-900 text-xs">{item.title}</h5>
                                  <span className="text-[10px] text-gray-400">{item.date}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteInteraction(item.id)}
                                className="text-gray-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                                title="Supprimer cette annotation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line pl-7">
                              {item.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ONGLET 4 : FICHE ENTREPRISE & STRATÉGIE */}
              {modalActiveTab === 'company' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                        Fiche Stratégique Entreprise
                      </span>
                      {editingApp && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsModalOpen(false);
                            handleOpenCompanyDossier(editingApp);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>Plein écran ↗</span>
                        </button>
                      )}
                    </div>

                    <h4 className="text-lg font-black text-white">{formCompany || 'Entreprise'}</h4>
                    <p className="text-xs text-blue-200">
                      Préparez vos échanges avec chaque interlocuteur de l&apos;entreprise (RH, Manager, DAF, DG) grâce au plan d&apos;intégration 30-60-90 jours et aux données légales vérifiables.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
                      <div className="bg-white/10 p-2 rounded-lg">
                        <span className="text-[10px] text-gray-400 block">Poste ciblé</span>
                        <span className="font-bold text-white truncate block">{formRole || 'N/A'}</span>
                      </div>
                      <div className="bg-white/10 p-2 rounded-lg">
                        <span className="text-[10px] text-gray-400 block">Lieu / Siège</span>
                        <span className="font-bold text-white truncate block">{formLocation || 'France'}</span>
                      </div>
                      <div className="bg-white/10 p-2 rounded-lg">
                        <span className="text-[10px] text-gray-400 block">Contrat</span>
                        <span className="font-bold text-white truncate block">{formContractType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-950 space-y-2">
                    <h5 className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Plan Stratégique Candidat (30-60-90 jours)</span>
                    </h5>
                    <p className="text-[11px] text-amber-900/80 leading-relaxed">
                      La fiche complète entreprise génère automatiquement un plan d&apos;intégration en 3 phases pour convaincre vos recruteurs :
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-900">
                      <li><strong>Phase 1 (J0 à J30) :</strong> Immersion, cartographie des flux et compréhension des enjeux opérationnels.</li>
                      <li><strong>Phase 2 (J31 à J60) :</strong> Quick wins, structuration des processus et premières optimisations visibles.</li>
                      <li><strong>Phase 3 (J61 à J90) :</strong> Leadership, projets structurants et contribution à la rentabilité globale.</li>
                    </ul>

                    {editingApp && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsModalOpen(false);
                            handleOpenCompanyDossier(editingApp);
                          }}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Consulter la Fiche Technique Complète & Stratégie Détaillée</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Boutons d'action du bas de modal */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 shrink-0">
                <span className="text-[11px] text-gray-400">
                  {modalActiveTab === 'general' ? 'Informations générales' : modalActiveTab === 'contacts' ? `${formContacts.length} contact(s)` : modalActiveTab === 'journal' ? `${formInteractions.length} interaction(s)` : 'Fiche entreprise'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#FF4B4B] hover:bg-[#ff3333] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    {editingApp ? 'Enregistrer les modifications' : 'Créer la candidature'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Consultation Rapide de Lettre de Motivation */}
      {isLetterModalOpen && selectedAppForLetter && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-fade-in border border-purple-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  {selectedAppForLetter.company}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Lettre de motivation — {selectedAppForLetter.role}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLetterModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 bg-gray-50/70 border border-gray-200 rounded-2xl text-xs font-sans text-gray-800 leading-relaxed whitespace-pre-line">
              {selectedAppForLetter.coverLetter || 'Aucun texte de lettre disponible.'}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {selectedAppForLetter.coverLetter ? `${selectedAppForLetter.coverLetter.split(/\s+/).filter(Boolean).length} mots` : '0 mot'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedAppForLetter.coverLetter) return;
                    navigator.clipboard.writeText(selectedAppForLetter.coverLetter);
                    setLetterModalCopied(true);
                    setTimeout(() => setLetterModalCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {letterModalCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{letterModalCopied ? 'Copié !' : 'Copier le texte'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedAppForLetter.coverLetter) return;
                    const blob = new Blob([selectedAppForLetter.coverLetter], { type: 'application/msword;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Lettre_Motivation_${selectedAppForLetter.company.replace(/\s+/g, '_')}.doc`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Word (.doc)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsLetterModalOpen(false);
                    handleOpenEditModal(selectedAppForLetter);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fiche Entreprise, Plan Stratégique & Suivi Candidat */}
      {viewingCompanyDossier && (
        <CompanyDossierModal
          isOpen={true}
          onClose={() => setViewingCompanyDossier(null)}
          dossier={viewingCompanyDossier.dossier}
          roleTitle={viewingCompanyDossier.roleTitle}
          onApplicationUpdated={(updatedApp) => {
            setApplications((prev) =>
              prev.map((item) => (item.id === updatedApp.id ? updatedApp : item))
            );
          }}
        />
      )}
    </div>
  );
}
