import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  TrendingUp,
  Cpu,
  HelpCircle,
  Copy,
  Check,
  Download,
  Sparkles,
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
  ExternalLink,
  Globe,
  Calendar,
  ChevronRight,
  Send,
  Lightbulb,
  CheckCircle2,
  Target,
  ArrowRight,
  Search,
  UserPlus,
  Mail,
  Phone,
  Plus,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  BookmarkPlus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  CompanyFinancialTechnicalDossier,
  CompanyStakeholderCommunication,
  CandidateStrategicPlan,
  LegalAndCorporateInfo,
  ApplicationItem,
  ApplicationContact,
  ApplicationInteraction,
  ApplicationInteractionType,
} from '../types';
import { extractCompanyDossier } from '../utils/companyDossierExtractor';
import { localDbClient } from '../services/localDbClient';

interface CompanyDossierViewProps {
  dossier: CompanyFinancialTechnicalDossier;
  roleTitle?: string;
  onRefreshWithAi?: () => void;
  isRefreshing?: boolean;
  className?: string;
  onApplicationUpdated?: (app: ApplicationItem) => void;
}

type TabType = 'strategy' | 'stakeholders' | 'legal' | 'tracking' | 'interview' | 'technical';

export default function CompanyDossierView({
  dossier,
  roleTitle,
  onRefreshWithAi,
  isRefreshing = false,
  className = '',
  onApplicationUpdated,
}: CompanyDossierViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('strategy');
  const [selectedStakeholderIndex, setSelectedStakeholderIndex] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-enrichissement au cas où des champs manquent (garantit zéro blanc)
  const enrichedDossier = useMemo<CompanyFinancialTechnicalDossier>(() => {
    if (dossier.candidateStrategicPlan && dossier.stakeholdersCommunication && dossier.legalInfo) {
      return dossier;
    }
    const fallback = extractCompanyDossier(dossier.rawBriefText || '', '', dossier.companyName, roleTitle);
    return {
      ...dossier,
      sector: dossier.sector || fallback.sector,
      businessModel: dossier.businessModel || fallback.businessModel,
      estimatedSize: dossier.estimatedSize || fallback.estimatedSize,
      location: dossier.location || fallback.location,
      ownershipStructure: dossier.ownershipStructure || fallback.ownershipStructure,
      websiteUrl: dossier.websiteUrl || fallback.websiteUrl,
      legalInfo: dossier.legalInfo || fallback.legalInfo,
      candidateStrategicPlan: dossier.candidateStrategicPlan || fallback.candidateStrategicPlan,
      stakeholdersCommunication: dossier.stakeholdersCommunication || fallback.stakeholdersCommunication,
    };
  }, [dossier, roleTitle]);

  const plan: CandidateStrategicPlan | undefined = enrichedDossier.candidateStrategicPlan;
  const stakeholders: CompanyStakeholderCommunication[] = enrichedDossier.stakeholdersCommunication || [];
  const legal: LegalAndCorporateInfo | undefined = enrichedDossier.legalInfo;
  const currentStakeholder = stakeholders[selectedStakeholderIndex] || stakeholders[0];

  // Gestion du suivi de candidature liée dans l'entreprise (Onglet 4 : Suivi, Contacts & Annotations)
  const [linkedApp, setLinkedApp] = useState<ApplicationItem | null>(null);
  const [isLoadingApp, setIsLoadingApp] = useState(false);
  const [isCreatingApp, setIsCreatingApp] = useState(false);

  // Formulaire d'ajout de contact
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('Recruteur / RH');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  // Formulaire d'ajout d'annotation / interaction
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [noteType, setNoteType] = useState<ApplicationInteractionType>('note');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);

  // Chargement de la candidature correspondante
  useEffect(() => {
    let isMounted = true;
    const fetchApp = async () => {
      setIsLoadingApp(true);
      try {
        const apps = await localDbClient.getApplications();
        const targetName = enrichedDossier.companyName.toLowerCase().trim();
        const match = apps.find(
          (a) =>
            a.company.toLowerCase().trim() === targetName ||
            a.company.toLowerCase().includes(targetName) ||
            targetName.includes(a.company.toLowerCase())
        );
        if (isMounted) {
          setLinkedApp(match || null);
        }
      } catch (err) {
        console.warn('Erreur chargement candidature liée dans fiche entreprise :', err);
      } finally {
        if (isMounted) setIsLoadingApp(false);
      }
    };
    fetchApp();
    return () => {
      isMounted = false;
    };
  }, [enrichedDossier.companyName]);

  // Création d'une candidature rattachée
  const handleCreateLinkedApp = async () => {
    setIsCreatingApp(true);
    const newApp: ApplicationItem = {
      id: `app-${Date.now()}`,
      company: enrichedDossier.companyName,
      role: roleTitle || 'Poste ciblé',
      status: 'applied',
      appliedDate: new Date().toISOString().split('T')[0],
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      location: enrichedDossier.location || 'France',
      contractType: 'CDI',
      contacts: enrichedDossier.customContacts || [],
      interactions: [
        {
          id: `inter-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'note',
          title: 'Création du suivi de candidature',
          content: `Dossier de candidature initialisé depuis la fiche technique de l'entreprise ${enrichedDossier.companyName}.`,
        },
      ],
      checklist: {
        cvSent: true,
        coverLetterSent: false,
        portfolioSent: false,
        followUpDone: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = await localDbClient.saveApplication(newApp);
      setLinkedApp(saved);
      onApplicationUpdated?.(saved);
      confetti({ particleCount: 25, spread: 50 });
    } catch (err) {
      console.error('Erreur création candidature liée :', err);
    } finally {
      setIsCreatingApp(false);
    }
  };

  // Bascule de la case "Relance faite" avec mise à jour immédiate
  const handleToggleFollowUp = async (done: boolean) => {
    if (!linkedApp) return;
    const today = new Date().toISOString().split('T')[0];
    const updatedChecklist = {
      ...linkedApp.checklist,
      followUpDone: done,
    };

    const newInteractions = [...(linkedApp.interactions || [])];
    if (done) {
      newInteractions.unshift({
        id: `inter-${Date.now()}`,
        date: today,
        type: 'follow_up',
        title: 'Relance effectuée',
        content: `Relance enregistrée depuis la fiche entreprise ${enrichedDossier.companyName}.`,
      });
    }

    const updatedApp: ApplicationItem = {
      ...linkedApp,
      checklist: updatedChecklist,
      followUpDoneAt: done ? today : undefined,
      interactions: newInteractions,
      updatedAt: new Date().toISOString(),
    };

    setLinkedApp(updatedApp);
    await localDbClient.saveApplication(updatedApp);
    onApplicationUpdated?.(updatedApp);
  };

  // Ajout d'un contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !linkedApp) return;

    const newContact: ApplicationContact = {
      id: `cont-${Date.now()}`,
      name: contactName.trim(),
      role: contactRole.trim(),
      email: contactEmail.trim() || undefined,
      phone: contactPhone.trim() || undefined,
      linkedinUrl: contactLinkedin.trim() || undefined,
      notes: contactNotes.trim() || undefined,
    };

    const currentContacts = linkedApp.contacts || [];
    const updatedContacts = [...currentContacts, newContact];

    const updatedApp: ApplicationItem = {
      ...linkedApp,
      contacts: updatedContacts,
      updatedAt: new Date().toISOString(),
    };

    setLinkedApp(updatedApp);
    await localDbClient.saveApplication(updatedApp);
    onApplicationUpdated?.(updatedApp);

    // Reset formulaire
    setContactName('');
    setContactRole('Recruteur / RH');
    setContactEmail('');
    setContactPhone('');
    setContactLinkedin('');
    setContactNotes('');
    setShowAddContactForm(false);
  };

  // Suppression d'un contact
  const handleDeleteContact = async (contactId: string) => {
    if (!linkedApp) return;
    const updatedContacts = (linkedApp.contacts || []).filter((c) => c.id !== contactId);
    const updatedApp: ApplicationItem = {
      ...linkedApp,
      contacts: updatedContacts,
      updatedAt: new Date().toISOString(),
    };
    setLinkedApp(updatedApp);
    await localDbClient.saveApplication(updatedApp);
    onApplicationUpdated?.(updatedApp);
  };

  // Ajout d'une annotation / interaction
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !linkedApp) return;

    const newInteraction: ApplicationInteraction = {
      id: `inter-${Date.now()}`,
      date: noteDate || new Date().toISOString().split('T')[0],
      type: noteType,
      title: noteTitle.trim() || (noteType === 'call' ? 'Appel téléphonique' : noteType === 'interview' ? 'Entretien' : 'Note de suivi'),
      content: noteContent.trim(),
    };

    const currentInteractions = linkedApp.interactions || [];
    const updatedInteractions = [newInteraction, ...currentInteractions];

    const updatedApp: ApplicationItem = {
      ...linkedApp,
      interactions: updatedInteractions,
      notes: noteContent.trim(), // synchroniser le champ note principal
      updatedAt: new Date().toISOString(),
    };

    setLinkedApp(updatedApp);
    await localDbClient.saveApplication(updatedApp);
    onApplicationUpdated?.(updatedApp);

    setNoteTitle('');
    setNoteContent('');
    setShowAddNoteForm(false);
  };

  // Suppression d'une annotation
  const handleDeleteNote = async (noteId: string) => {
    if (!linkedApp) return;
    const updatedInteractions = (linkedApp.interactions || []).filter((i) => i.id !== noteId);
    const updatedApp: ApplicationItem = {
      ...linkedApp,
      interactions: updatedInteractions,
      updatedAt: new Date().toISOString(),
    };
    setLinkedApp(updatedApp);
    await localDbClient.saveApplication(updatedApp);
    onApplicationUpdated?.(updatedApp);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    confetti({ particleCount: 20, spread: 45 });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadDossier = () => {
    const content =
      enrichedDossier.rawBriefText ||
      `# Fiche Technique & Financière : ${enrichedDossier.companyName}\n\nPoste : ${
        roleTitle || 'Candidature'
      }\n\nSecteur : ${enrichedDossier.sector}\nModèle : ${enrichedDossier.businessModel}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fiche_Entreprise_${enrichedDossier.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Strategie_Candidat.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // URL de recherche externe vérifiable
  const companyCleanName = enrichedDossier.companyName.trim();
  const officialWebsite = legal?.websiteUrl || enrichedDossier.websiteUrl;
  const pappersUrl = `https://www.pappers.fr/recherche?q=${encodeURIComponent(legal?.legalName || companyCleanName)}`;
  const linkedinSearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
    companyCleanName
  )}`;

  const contactsList = linkedApp?.contacts || enrichedDossier.customContacts || [];
  const notesList = linkedApp?.interactions || enrichedDossier.candidateNotes || [];

  return (
    <div className={`bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* En-tête Immersif & Stratégique */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-blue-400" />
                Fiche Entreprise & Suivi Candidat
              </span>
              {enrichedDossier.sector && (
                <span className="text-[11px] bg-white/10 text-gray-200 px-2.5 py-0.5 rounded-full border border-white/10 font-medium">
                  {enrichedDossier.sector}
                </span>
              )}
              {enrichedDossier.estimatedSize && (
                <span className="text-[11px] bg-white/10 text-gray-200 px-2.5 py-0.5 rounded-full border border-white/10 font-medium">
                  {enrichedDossier.estimatedSize}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                <span>{enrichedDossier.companyName}</span>
                {roleTitle && (
                  <span className="text-sm font-semibold text-blue-200/90 hidden sm:inline">
                    • {roleTitle}
                  </span>
                )}
              </h3>

              {officialWebsite && (
                <a
                  href={officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors border border-white/10"
                  title="Visiter le site officiel de l'entreprise"
                >
                  <Globe className="w-3 h-3" />
                  <span>Site web officiel</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                </a>
              )}
            </div>

            <p className="text-xs text-blue-100/80 max-w-2xl leading-relaxed">
              Données légales & financières vérifiées, plan stratégique 30-60-90j, carnet de contacts et suivi annoté de votre candidature pour cette entreprise.
            </p>
          </div>

          {/* Actions rapides d'export */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopy(enrichedDossier.rawBriefText || '', 'all')}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
              title="Copier la fiche complète au format Markdown"
            >
              {copiedKey === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'all' ? 'Copié !' : 'Copier Markdown'}</span>
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
                <span>{isRefreshing ? 'Actualisation...' : 'Approfondir'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Métriques / Badges Clés en bandeau */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-blue-200/70 uppercase font-bold block">Business Model</span>
            <span className="text-white font-bold truncate block">{enrichedDossier.businessModel || 'B2B & Solutions'}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-blue-200/70 uppercase font-bold block">Actionnariat / Capital</span>
            <span className="text-white font-bold truncate block">{enrichedDossier.ownershipStructure || 'Privé / Indépendant'}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-blue-200/70 uppercase font-bold block">Métrique / CA</span>
            <span className="text-white font-bold truncate block">{enrichedDossier.financialProfile.estimatedRevenue || 'Consolidé Groupe'}</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 space-y-0.5">
            <span className="text-[10px] text-blue-200/70 uppercase font-bold block">Implantation</span>
            <span className="text-white font-bold truncate block">{enrichedDossier.location || 'France'}</span>
          </div>
        </div>
      </div>

      {/* Barre d'onglets de navigation moderne (6 onglets stratégiques & opérationnels) */}
      <div className="flex border-b border-gray-200 px-4 sm:px-6 bg-gray-50/70 overflow-x-auto gap-2">
        {/* Onglet 1 : Plan Stratégique Candidat */}
        <button
          type="button"
          onClick={() => setActiveTab('strategy')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'strategy'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Target className="w-4 h-4 text-indigo-600" />
          <span>1. Plan Stratégique Candidat (30-60-90j)</span>
        </button>

        {/* Onglet 2 : Communication Interlocuteurs */}
        <button
          type="button"
          onClick={() => setActiveTab('stakeholders')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'stakeholders'
              ? 'border-blue-600 text-blue-700 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>2. Interlocuteurs Cibles ({stakeholders.length})</span>
        </button>

        {/* Onglet 3 : Données Légales & Financières Vérifiées */}
        <button
          type="button"
          onClick={() => setActiveTab('legal')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'legal'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>3. Données Légales & Site Officiel</span>
        </button>

        {/* Onglet 4 : Suivi Candidature, Contacts & Annotations (NOUVEAU & DÉCISIF) */}
        <button
          type="button"
          onClick={() => setActiveTab('tracking')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tracking'
              ? 'border-rose-600 text-rose-700 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Briefcase className="w-4 h-4 text-rose-600" />
          <span>4. Mon Suivi & Contacts ({contactsList.length})</span>
          {linkedApp?.checklist?.followUpDone ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Relance à jour" />
          ) : linkedApp?.followUpDate && linkedApp.followUpDate <= new Date().toISOString().split('T')[0] ? (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Relance due !" />
          ) : null}
        </button>

        {/* Onglet 5 : Stratégie d'Entretien & Questions */}
        <button
          type="button"
          onClick={() => setActiveTab('interview')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'interview'
              ? 'border-amber-600 text-amber-700 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-amber-600" />
          <span>5. Préparation Entretien & Pitch</span>
        </button>

        {/* Onglet 6 : Stack Technique & Organisation */}
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
          <span>6. Stack & Organisation Métier</span>
        </button>
      </div>

      {/* Contenu dynamique des onglets */}
      <div className="p-5 sm:p-7 space-y-6">
        {/* ========================================================================= */}
        {/* ONGLET 1 : PLAN STRATÉGIQUE CANDIDAT (30-60-90 JOURS & QUICK WINS)       */}
        {/* ========================================================================= */}
        {activeTab === 'strategy' && (
          <div className="space-y-6 animate-fade-in">
            {/* Executive Summary */}
            <div className="p-5 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-purple-50/40 border border-indigo-200 rounded-2xl space-y-3 relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
                    <Compass className="w-4 h-4" />
                  </span>
                  <h4 className="font-extrabold text-sm text-gray-900">
                    Feuille de Route Stratégique d&apos;Intégration & Création de Valeur
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `${plan?.executiveSummary}\n\n${plan?.phases
                        .map((p) => `### ${p.period} : ${p.title}\n${p.description}\nActions :\n${p.actions.map((a) => `- ${a}`).join('\n')}\nLivrable : ${p.deliverable}`)
                        .join('\n\n')}`,
                      'plan-copy'
                    )
                  }
                  className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedKey === 'plan-copy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'plan-copy' ? 'Plan copié !' : 'Copier le plan'}</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-medium">
                {plan?.executiveSummary ||
                  `Ce plan d'action permet de vous positionner en Business Partner dès le premier entretien avec ${enrichedDossier.companyName}, en projetant une vision claire de vos livrables à 30, 60 et 90 jours.`}
              </p>

              <div className="text-[11px] text-indigo-900/80 bg-white/70 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  <strong>Atout Décisif en Entretien :</strong> Présenter ce plan structuré montre que vous maîtrisez déjà les enjeux de {enrichedDossier.companyName} et que vous serez opérationnel sans temps mort.
                </span>
              </div>
            </div>

            {/* Quick Wins (Gains Rapides Immédiats à 15 jours) */}
            {plan?.quickWins && plan.quickWins.length > 0 && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Quick Wins Immédiats à proposer aux recruteurs</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {plan.quickWins.map((qw, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-amber-200/80 rounded-xl text-xs text-gray-800 shadow-2xs flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{qw}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Les 3 Phases Chronologiques 30-60-90 Jours */}
            <div className="space-y-4">
              <h5 className="font-extrabold text-xs sm:text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Déroulement des 3 Phases Clés</span>
              </h5>

              <div className="grid grid-cols-1 gap-4">
                {plan?.phases.map((phase, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-5 bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl shadow-2xs transition-all space-y-3 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {pIdx + 1}
                        </span>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {phase.period}
                          </span>
                          <h6 className="font-extrabold text-sm text-gray-900 mt-0.5">
                            {phase.title}
                          </h6>
                        </div>
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Livrable : {phase.deliverable}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {phase.description}
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Actions concrètes à mener :</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {phase.actions.map((act, actIdx) => (
                          <div
                            key={actIdx}
                            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 flex items-start gap-2"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <span className="leading-snug">{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommandations Stratégiques Majeures */}
            {plan?.strategicRecommendations && plan.strategicRecommendations.length > 0 && (
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                  Recommandations Stratégiques pour Réussir
                </span>
                <div className="space-y-1.5">
                  {plan.strategicRecommendations.map((rec, rIdx) => (
                    <div key={rIdx} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 2 : COMMUNICATION AVEC LES DIFFÉRENTS INTERLOCUTEURS              */}
        {/* ========================================================================= */}
        {activeTab === 'stakeholders' && (
          <div className="space-y-6 animate-fade-in">
            {/* Guide introductif */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
              <span className="p-2 bg-blue-600 text-white rounded-xl shrink-0 shadow-2xs">
                <Users className="w-4 h-4" />
              </span>
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs sm:text-sm text-blue-950">
                  Cartographie & Stratégie de Communication par Décideur
                </h4>
                <p className="text-xs text-blue-900/80 leading-relaxed">
                  Chaque interlocuteur dans l&apos;entreprise a des attentes et une sensibilité différentes. Utilisez cette grille pour adapter votre posture, votre discours en entretien et vos messages d&apos;approche sur LinkedIn ou par email.
                </p>
              </div>
            </div>

            {/* Sélecteur d'interlocuteurs (Pills horizontales) */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {stakeholders.map((stk, idx) => {
                const isSelected = selectedStakeholderIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedStakeholderIndex(idx)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>{stk.roleCategory}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Fiche détaillée de l'interlocuteur sélectionné */}
            {currentStakeholder && (
              <div className="p-5 sm:p-6 bg-white border border-gray-200 rounded-3xl shadow-2xs space-y-5 animate-fade-in">
                {/* En-tête Interlocuteur */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                      Profil Interlocuteur
                    </span>
                    <h5 className="font-black text-base sm:text-lg text-gray-900">
                      {currentStakeholder.roleCategory}
                    </h5>
                    {currentStakeholder.targetName && (
                      <p className="text-xs text-gray-500 font-medium">
                        Cible représentative : {currentStakeholder.targetName}
                      </p>
                    )}
                  </div>

                  <div className="p-2.5 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs text-blue-900 max-w-sm">
                    <span className="text-[10px] font-bold uppercase text-blue-700 block mb-0.5">
                      Posture & Ton recommandé :
                    </span>
                    <span className="leading-snug">{currentStakeholder.recommendedPosture}</span>
                  </div>
                </div>

                {/* Priorités et points de sensibilité de cet interlocuteur */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase font-black tracking-wider text-gray-500 block">
                    Ce qui intéresse cet interlocuteur en priorité :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {currentStakeholder.keyPriorities.map((prio, pIdx) => (
                      <div
                        key={pIdx}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                        <span className="leading-snug font-medium">{prio}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pitch Verbal en entretien ("Ce qu'il faut lui dire") */}
                <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200 rounded-2xl space-y-2 relative">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pitch Verbal en Entretien (Face-à-face ou Visio)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentStakeholder.verbalPitch, `pitch-${selectedStakeholderIndex}`)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-blue-300 text-blue-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === `pitch-${selectedStakeholderIndex}` ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === `pitch-${selectedStakeholderIndex}` ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                  <blockquote className="text-xs sm:text-sm text-gray-800 italic leading-relaxed pl-3 border-l-3 border-blue-600 bg-white/70 p-3 rounded-r-xl">
                    {currentStakeholder.verbalPitch}
                  </blockquote>
                </div>

                {/* Modèle de message direct d'approche (LinkedIn / Email) */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Modèle de Message Direct d&apos;Approche (LinkedIn / Email)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          currentStakeholder.outreachMessageSample,
                          `outreach-${selectedStakeholderIndex}`
                        )
                      }
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === `outreach-${selectedStakeholderIndex}` ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === `outreach-${selectedStakeholderIndex}` ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                  <div className="text-xs text-gray-800 font-mono bg-white p-3 rounded-xl border border-emerald-200/80 leading-relaxed">
                    {currentStakeholder.outreachMessageSample}
                  </div>
                </div>

                {/* Questions ciblées à lui poser */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase font-black tracking-wider text-gray-500 block">
                    Questions ciblées à lui poser spécifiquement :
                  </span>
                  <div className="space-y-2">
                    {currentStakeholder.questionsToAsk.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className="p-3 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-xl text-xs text-gray-900 flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span className="font-semibold leading-relaxed">« {q} »</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(q, `q-${selectedStakeholderIndex}-${qIdx}`)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                          title="Copier la question"
                        >
                          {copiedKey === `q-${selectedStakeholderIndex}-${qIdx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 3 : DONNÉES LÉGALES & SITE OFFICIEL                                */}
        {/* ========================================================================= */}
        {activeTab === 'legal' && (
          <div className="space-y-6 animate-fade-in">
            {/* Barre de Liens Directs Vérifiés */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-emerald-950">
                    Informations Juridiques & Institutionnelles Vérifiables
                  </h4>
                  <p className="text-[11px] text-emerald-900/80">
                    Consultez directement le site de l&apos;entreprise ou les registres officiels pour vérifier les chiffres réels.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {officialWebsite && (
                  <a
                    href={officialWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Site Officiel</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <a
                  href={pappersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Registre Pappers</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <a
                  href={linkedinSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>LinkedIn Entreprise</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Cartouche d'identité Juridique & Métier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Raison Sociale Officielle</span>
                <h5 className="font-extrabold text-sm text-gray-900">
                  {legal?.legalName || enrichedDossier.companyName}
                </h5>
                <p className="text-[11px] text-gray-500">Nom au registre du commerce</p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Forme Juridique & Statut</span>
                <h5 className="font-extrabold text-sm text-gray-900">
                  {legal?.legalForm || 'Société commerciale (SAS / SA)'}
                </h5>
                <p className="text-[11px] text-gray-500">
                  {legal?.creationYear ? `Créée en ${legal.creationYear}` : 'Entreprise établie'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Siège Social & Implantation</span>
                <h5 className="font-extrabold text-sm text-gray-900">
                  {legal?.headquarters || enrichedDossier.location || 'France'}
                </h5>
                <p className="text-[11px] text-gray-500">Périmètre géographique principal</p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Secteur Réel & Vérifié</span>
                <h5 className="font-extrabold text-sm text-gray-900">
                  {enrichedDossier.sector || 'Secteur d’activité'}
                </h5>
                <p className="text-[11px] text-gray-500">Classification économique officielle</p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Chiffre d&apos;Affaires / Taille</span>
                <h5 className="font-extrabold text-sm text-gray-900">
                  {legal?.aumOrKeyMetrics || enrichedDossier.financialProfile.estimatedRevenue || 'Consolidé'}
                </h5>
                <p className="text-[11px] text-gray-500">{enrichedDossier.estimatedSize || 'PME / ETI'}</p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Actionnariat & Capital</span>
                <h5 className="font-extrabold text-sm text-gray-900">
                  {legal?.shareholdersAndBackers || enrichedDossier.ownershipStructure || 'Actionnariat indépendant'}
                </h5>
                <p className="text-[11px] text-gray-500">Structure de gouvernance financière</p>
              </div>
            </div>

            {/* Piliers d'Activité Réels (issus du site web officiel) */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                  <Layers className="w-4 h-4" />
                </span>
                <h4 className="font-extrabold text-sm text-gray-900">
                  Piliers d&apos;Activité & Métiers Réels de l&apos;Entreprise
                </h4>
              </div>

              <p className="text-xs text-gray-600">
                Ces activités réelles proviennent directement des offres et de la documentation officielle de {enrichedDossier.companyName} :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {legal?.activitiesPillars && legal.activitiesPillars.length > 0 ? (
                  legal.activitiesPillars.map((pillar, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-blue-50/40 border border-blue-200 rounded-xl text-xs text-blue-950 font-medium flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{pillar}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3.5 bg-blue-50/40 border border-blue-200 rounded-xl text-xs text-blue-950 font-medium">
                    Activités industrielles et de services spécialisés en {enrichedDossier.sector}.
                  </div>
                )}
              </div>
            </div>

            {/* Dirigeants Clés & Gouvernance */}
            {legal?.keyExecutives && legal.keyExecutives.length > 0 && (
              <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <Users className="w-4 h-4" />
                  </span>
                  <h4 className="font-extrabold text-sm text-gray-900">
                    Dirigeants & Équipe de Direction Identifiés
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {legal.keyExecutives.map((exec, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-gray-900 font-bold">{exec.name}</strong>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                          {exec.title}
                        </span>
                      </div>
                      {exec.roleDescription && (
                        <p className="text-gray-600 text-[11px] leading-relaxed">
                          {exec.roleDescription}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profil Financier & Trésorerie */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
                <h4 className="font-extrabold text-sm text-gray-900">
                  Enjeux Financiers, Rentabilité & Trésorerie
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Dynamique / Croissance</span>
                  <p className="text-xs font-bold text-gray-900">
                    {enrichedDossier.financialProfile.growthStage || 'Expansion'}
                  </p>
                </div>
                <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-teal-800">Modèle de Marge</span>
                  <p className="text-xs font-bold text-gray-900">
                    {enrichedDossier.financialProfile.profitabilityModel || 'Marge opérationnelle & BFR'}
                  </p>
                </div>
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-800">Chiffre d&apos;Affaires</span>
                  <p className="text-xs font-bold text-gray-900">
                    {enrichedDossier.financialProfile.estimatedRevenue || 'Consolidé'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Enjeux prioritaires identifiés :</span>
                {enrichedDossier.financialProfile.keyFinancialChallenges.map((ch, idx) => (
                  <div key={idx} className="p-2.5 bg-emerald-50/30 border border-emerald-200 rounded-xl text-xs text-gray-800 flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{ch}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 4 : MON SUIVI CANDIDATURE, CONTACTS & ANNOTATIONS (INTERACTIF)    */}
        {/* ========================================================================= */}
        {activeTab === 'tracking' && (
          <div className="space-y-6 animate-fade-in">
            {/* Si aucune candidature n'est encore liée à cette entreprise */}
            {!linkedApp ? (
              <div className="p-6 bg-gradient-to-r from-rose-50/70 via-indigo-50/50 to-blue-50/40 border border-rose-200 rounded-3xl space-y-4 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="p-1.5 bg-rose-600 text-white rounded-lg">
                        <BookmarkPlus className="w-4 h-4" />
                      </span>
                      <h4 className="font-extrabold text-base text-gray-900">
                        Suivi de candidature non initialisé pour {enrichedDossier.companyName}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
                      Liez cette entreprise à votre tableau de bord de candidatures pour enregistrer vos contacts RH, noter vos comptes-rendus d&apos;entretiens et programmer vos relances.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateLinkedApp}
                    disabled={isCreatingApp}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isCreatingApp ? 'Création...' : 'Lier à mon suivi de candidatures'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Bandeau d'état de la candidature */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-md">
                        Candidature active
                      </span>
                      <span className="text-xs font-bold text-gray-300">
                        {linkedApp.role} • Statut : <strong className="text-white capitalize">{linkedApp.status}</strong>
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Postulé le {linkedApp.appliedDate || 'récemment'} • Suivi synchronisé avec votre tableau de bord.
                    </p>
                  </div>

                  {/* Bloc Relance avec case à cocher active */}
                  <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-xl border border-white/10 self-start md:self-auto">
                    <div className="text-left text-xs">
                      <span className="text-[10px] uppercase font-bold text-gray-300 block">Prochaine Relance</span>
                      <span className="font-extrabold text-white flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{linkedApp.followUpDate || 'Non définie'}</span>
                      </span>
                    </div>

                    <label className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg cursor-pointer border border-white/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={linkedApp.checklist?.followUpDone || false}
                        onChange={(e) => handleToggleFollowUp(e.target.checked)}
                        className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-white">
                        {linkedApp.checklist?.followUpDone ? 'Relance faite ✓' : 'Marquer relancé'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Section Contacts dans l'entreprise */}
                <div className="p-5 bg-white border border-gray-200 rounded-3xl space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                        <Users className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900">
                          Mes Contacts Réels dans l&apos;Entreprise ({contactsList.length})
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Recruteurs, DAF, N+1, opérationnels avec qui vous échangez directement.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddContactForm(!showAddContactForm)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{showAddContactForm ? 'Fermer' : '+ Ajouter un contact'}</span>
                    </button>
                  </div>

                  {/* Formulaire d'ajout de contact */}
                  {showAddContactForm && (
                    <form onSubmit={handleAddContact} className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3 animate-fade-in">
                      <h5 className="font-extrabold text-xs text-blue-950 uppercase tracking-wider">
                        Nouveau contact chez {enrichedDossier.companyName}
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">Nom & Prénom *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Sophie Martin"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1">Fonction / Rôle</label>
                          <select
                            value={contactRole}
                            onChange={(e) => setContactRole(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Recruteur / RH">Recruteur / RH</option>
                            <option value="Responsable Recrutement / Talent Acquisition">Responsable Recrutement</option>
                            <option value="Manager N+1 / Responsable Équipe">Manager N+1 / Opérationnel</option>
                            <option value="Directeur Administratif & Financier (DAF)">Directeur Financier (DAF)</option>
                            <option value="Direction Générale / Présidence">Direction Générale / DG</option>
                            <option value="Chasseur de Têtes / Cabinet">Chasseur de Têtes / Cabinet</option>
                            <option value="Collaborateur / Pair">Collaborateur / Pair</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1">Email</label>
                          <input
                            type="email"
                            placeholder="prenom.nom@entreprise.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1">Téléphone</label>
                          <input
                            type="tel"
                            placeholder="06 12 34 56 78"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-gray-700 font-bold mb-1">Lien Profil LinkedIn</label>
                          <input
                            type="url"
                            placeholder="https://www.linkedin.com/in/..."
                            value={contactLinkedin}
                            onChange={(e) => setContactLinkedin(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-gray-700 font-bold mb-1">Notes personnelles sur ce contact</label>
                          <input
                            type="text"
                            placeholder="Ex: Premier contact cordial, a posé des questions sur Agicap et le BFR..."
                            value={contactNotes}
                            onChange={(e) => setContactNotes(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddContactForm(false)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-white cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Enregistrer le contact
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Liste des contacts */}
                  {contactsList.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center text-xs text-gray-500">
                      Aucun contact enregistré pour l&apos;instant chez {enrichedDossier.companyName}. Cliquez sur <strong>+ Ajouter un contact</strong> pour noter les coordonnées de votre recruteur ou manager.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {contactsList.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 bg-gray-50/80 hover:bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs relative group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="text-gray-900 font-bold text-sm block">{c.name}</strong>
                              <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                {c.role || 'Contact'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(c.id)}
                              className="text-gray-400 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Supprimer ce contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1 pt-1 text-[11px] text-gray-700">
                            {c.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline truncate">
                                  {c.email}
                                </a>
                              </div>
                            )}
                            {c.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                <a href={`tel:${c.phone}`} className="text-gray-800 hover:underline font-mono">
                                  {c.phone}
                                </a>
                              </div>
                            )}
                            {c.linkedinUrl && (
                              <div className="flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-blue-500 shrink-0" />
                                <a
                                  href={c.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <span>Profil LinkedIn</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                            {c.notes && (
                              <div className="p-2 bg-white rounded-lg border border-gray-200/80 text-gray-600 italic mt-1">
                                « {c.notes} »
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section Journal de Bord & Annotations */}
                <div className="p-5 bg-white border border-gray-200 rounded-3xl space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-purple-600 text-white rounded-lg">
                        <FileText className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900">
                          Journal des Échanges & Annotations ({notesList.length})
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Comptes-rendus d&apos;appels, questions posées, impressions et jalons clés.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddNoteForm(!showAddNoteForm)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddNoteForm ? 'Fermer' : '+ Ajouter une note'}</span>
                    </button>
                  </div>

                  {/* Formulaire d'ajout d'annotation */}
                  {showAddNoteForm && (
                    <form onSubmit={handleAddNote} className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3 animate-fade-in text-xs">
                      <h5 className="font-extrabold text-purple-950 uppercase tracking-wider">
                        Nouvelle annotation pour {enrichedDossier.companyName}
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-gray-700 font-bold mb-1">Type d&apos;échange</label>
                          <select
                            value={noteType}
                            onChange={(e) => setNoteType(e.target.value as ApplicationInteractionType)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="note">📝 Note interne</option>
                            <option value="call">📞 Appel téléphonique</option>
                            <option value="interview">🤝 Entretien (RH / DAF / DG)</option>
                            <option value="email">✉️ Email envoyé / reçu</option>
                            <option value="follow_up">⏰ Relance effectuée</option>
                            <option value="feedback">💬 Retour / Feedback</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1">Date</label>
                          <input
                            type="date"
                            value={noteDate}
                            onChange={(e) => setNoteDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 font-bold mb-1">Titre du sujet</label>
                          <input
                            type="text"
                            placeholder="Ex: Entretien DAF n°1"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Détail du compte-rendu ou de la note *</label>
                        <textarea
                          rows={3}
                          required
                          placeholder="Points abordés, questions sur le progiciel, prétentions salariales mentionnées, prochaine étape..."
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddNoteForm(false)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg font-semibold hover:bg-white cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                        >
                          Ajouter la note
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Liste des annotations */}
                  {notesList.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center text-xs text-gray-500">
                      Aucune note ou compte-rendu pour le moment. Utilisez <strong>+ Ajouter une note</strong> pour consigner vos impressions et l&apos;avancée de vos échanges.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {notesList.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs space-y-1.5 relative group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                                {item.type === 'call'
                                  ? '📞 Appel'
                                  : item.type === 'interview'
                                  ? '🤝 Entretien'
                                  : item.type === 'email'
                                  ? '✉️ Email'
                                  : item.type === 'follow_up'
                                  ? '⏰ Relance'
                                  : item.type === 'feedback'
                                  ? '💬 Feedback'
                                  : '📝 Note'}
                              </span>
                              <strong className="text-gray-900 font-bold">{item.title}</strong>
                              <span className="text-[11px] text-gray-400 font-mono">• {item.date}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteNote(item.id)}
                              className="text-gray-400 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Supprimer cette note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap pl-1">
                            {item.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONGLET 5 : PRÉPARATION ENTRETIEN & PITCH D'ACCROCHE                       */}
        {/* ========================================================================= */}
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
                  onClick={() => handleCopy(enrichedDossier.interviewStrategy.pitchRecommendation, 'pitch')}
                  className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-blue-300 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedKey === 'pitch' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pitch' ? 'Copié !' : 'Copier le pitch'}</span>
                </button>
              </div>

              <blockquote className="text-xs sm:text-sm text-gray-800 italic leading-relaxed pl-3 border-l-3 border-blue-500 bg-white/60 p-3 rounded-r-xl">
                {enrichedDossier.interviewStrategy.pitchRecommendation}
              </blockquote>

              <p className="text-[11px] text-gray-500">
                💡 <strong>Conseil :</strong> Utilisez ce pitch en introduction lors de la classique question <em>« Parlez-moi de vous »</em> pour créer immédiatement un écho avec les priorités de {enrichedDossier.companyName}.
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
                  {enrichedDossier.interviewStrategy.highImpactQuestions.length} questions ciblées
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {enrichedDossier.interviewStrategy.highImpactQuestions.map((q, idx) => (
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
                {enrichedDossier.interviewStrategy.strategicAdvice.map((advice, i) => (
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

        {/* ========================================================================= */}
        {/* ONGLET 6 : STACK TECHNIQUE & ORGANISATION MÉTIER                          */}
        {/* ========================================================================= */}
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
                {enrichedDossier.technicalProfile.toolsAndStack.map((tool, idx) => (
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
                  <span>{enrichedDossier.technicalProfile.reportingLine || 'Direction Administrative & Financière (DAF)'}</span>
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Interlocuteurs clés : Direction Générale, CAC, équipes comptables et opérationnelles.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">Méthodologie & Cadre Normatif</span>
                <h5 className="font-extrabold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{enrichedDossier.technicalProfile.methodology || 'Normes françaises & Fast Close'}</span>
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Respect des procédures de contrôle interne, audit légal et reporting périodique.
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
                {enrichedDossier.technicalProfile.keyOperationalProjects.map((proj, idx) => (
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
      </div>

      {/* Pied de carte avec rappel de révision */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>Fiche entreprise & plan stratégique candidat • Données légales et financières vérifiables</span>
        </div>

        <button
          type="button"
          onClick={() => handleCopy(enrichedDossier.rawBriefText || '', 'all-footer')}
          className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold text-xs cursor-pointer flex items-center gap-1 self-start sm:self-auto"
        >
          <Copy className="w-3 h-3 text-gray-500" />
          <span>{copiedKey === 'all-footer' ? 'Copié !' : 'Copier tout le dossier'}</span>
        </button>
      </div>
    </div>
  );
}
