import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  User,
  FileText,
  Briefcase,
  Sparkles,
  HardDrive,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Check,
  ExternalLink,
  Plus,
  Edit3,
  Star,
  AlertTriangle,
  History,
  Lock,
  Save,
  CheckCircle2,
  Mail,
  Copy,
} from 'lucide-react';
import { parseCvFile } from '../utils/fileExtractor';
import type {
  DatabaseSchema,
  UserProfile,
  SavedCv,
  ApplicationItem,
  AnalysisHistoryItem,
  SavedSuggestion,
  SavedCoverLetter,
  DatabaseStats,
} from '../types';
import { localDbClient } from '../services/localDbClient';

interface DatabaseManagerProps {
  onLoadCvToAnalyzer: (cvText: string, cvTitle: string) => void;
  onOpenAnalysis: (analysisId: string) => void;
  onNavigateToTab: (tab: 'app' | 'tracker' | 'cv-assistant' | 'history' | 'database') => void;
  onDatabaseReset?: () => void;
  onDatabaseUpdated?: () => void;
}

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({
  onLoadCvToAnalyzer,
  onOpenAnalysis,
  onNavigateToTab,
  onDatabaseReset,
  onDatabaseUpdated,
}) => {
  const [subTab, setSubTab] = useState<'profile' | 'cvs' | 'coverLetters' | 'applications' | 'analyses' | 'suggestions' | 'backup'>('profile');
  const [dbData, setDbData] = useState<DatabaseSchema | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState<UserProfile | null>(null);
  const [skillsInput, setSkillsInput] = useState('');
  const [targetRolesInput, setTargetRolesInput] = useState('');

  // CV modal/form state
  const [isAddingCv, setIsAddingCv] = useState(false);
  const [editingCv, setEditingCv] = useState<SavedCv | null>(null);
  const [cvFormTitle, setCvFormTitle] = useState('');
  const [cvFormRole, setCvFormRole] = useState('');
  const [cvFormText, setCvFormText] = useState('');

  // Cover Letter modal/form state
  const [isAddingLetter, setIsAddingLetter] = useState(false);
  const [editingLetter, setEditingLetter] = useState<SavedCoverLetter | null>(null);
  const [letterFormTitle, setLetterFormTitle] = useState('');
  const [letterFormCompany, setLetterFormCompany] = useState('');
  const [letterFormRole, setLetterFormRole] = useState('');
  const [letterFormContent, setLetterFormContent] = useState('');
  const [letterFormAppId, setLetterFormAppId] = useState('');
  const [copiedLetterId, setCopiedLetterId] = useState<string | null>(null);
  const [confirmDeleteLetterId, setConfirmDeleteLetterId] = useState<string | null>(null);

  // Suggestion modal/filter
  const [selectedSuggestionType, setSelectedSuggestionType] = useState<string>('all');

  // Confirmation states for deletions (sans window.confirm pour compatibilité iframe)
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);
  const [confirmDeleteCvId, setConfirmDeleteCvId] = useState<string | null>(null);
  const [confirmDeleteSuggId, setConfirmDeleteSuggId] = useState<string | null>(null);
  const [confirmDeleteAppId, setConfirmDeleteAppId] = useState<string | null>(null);
  const [confirmDeleteAnalysisId, setConfirmDeleteAnalysisId] = useState<string | null>(null);

  // Import direct de fichier CV dans la bibliothèque
  const [isImportingCv, setIsImportingCv] = useState(false);
  const importCvFileRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fullDb, dbStats] = await Promise.all([
        localDbClient.fetchAll(),
        localDbClient.fetchStats(),
      ]);
      if (fullDb) {
        setDbData(fullDb);
        setProfileForm(fullDb.profile);
        setSkillsInput(fullDb.profile.skills?.join(', ') || '');
        setTargetRolesInput(fullDb.profile.targetRoles?.join(', ') || '');
      }
      setStats(dbStats);
    } catch (err) {
      console.error('Erreur chargement données BDD :', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Sauvegarde profil
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm) return;
    try {
      const updatedSkills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const updatedRoles = targetRolesInput
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const toSave: UserProfile = {
        ...profileForm,
        skills: updatedSkills,
        targetRoles: updatedRoles,
      };

      const saved = await localDbClient.saveProfile(toSave);
      setProfileForm(saved);
      if (dbData) {
        setDbData({ ...dbData, profile: saved });
      }
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      showNotification('✅ Profil personnel enregistré dans la base locale !');
    } catch {
      showNotification('❌ Erreur lors de la sauvegarde du profil.');
    }
  };

  // Sauvegarde ou modification d'un CV
  const handleSaveCv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFormTitle.trim() || !cvFormText.trim()) {
      showNotification('❌ Veuillez renseigner au moins un titre et le contenu du CV.');
      return;
    }

    try {
      const newCv: SavedCv = {
        id: editingCv ? editingCv.id : `cv-${Date.now()}`,
        title: cvFormTitle.trim(),
        targetRole: cvFormRole.trim() || 'Général',
        fileName: editingCv ? editingCv.fileName : `${cvFormTitle.replace(/\s+/g, '_')}.txt`,
        fileType: 'manual',
        rawText: cvFormText.trim(),
        isDefault: editingCv ? editingCv.isDefault : (dbData?.cvs.length === 0),
        fileSize: new Blob([cvFormText]).size,
        createdAt: editingCv ? editingCv.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDbClient.saveCv(newCv);
      await loadData();
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      setIsAddingCv(false);
      setEditingCv(null);
      setCvFormTitle('');
      setCvFormRole('');
      setCvFormText('');
      showNotification('✅ CV enregistré dans votre bibliothèque locale !');
    } catch {
      showNotification("❌ Erreur lors de l'enregistrement du CV.");
    }
  };

  // Supprimer un CV de la base locale
  const handleDeleteCv = async (id: string) => {
    try {
      await localDbClient.deleteCv(id);
      await loadData();
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      setConfirmDeleteCvId(null);
      showNotification('🗑️ CV supprimé de la base locale.');
    } catch {
      showNotification('❌ Erreur lors de la suppression.');
    }
  };

  // Définir un CV par défaut
  const handleSetDefaultCv = async (id: string) => {
    try {
      await localDbClient.setDefaultCv(id);
      await loadData();
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      showNotification('⭐ CV défini comme CV principal par défaut !');
    } catch {
      showNotification('❌ Erreur lors de la mise à jour.');
    }
  };

  // Supprimer une suggestion
  const handleDeleteSuggestion = async (id: string) => {
    try {
      await localDbClient.deleteSuggestion(id);
      await loadData();
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      setConfirmDeleteSuggId(null);
      showNotification('🗑️ Suggestion retirée de la base.');
    } catch {
      showNotification('❌ Erreur lors de la suppression.');
    }
  };

  // Supprimer une candidature de la base locale
  const handleDeleteApplication = async (id: string) => {
    try {
      await localDbClient.deleteApplication(id);
      await loadData();
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      setConfirmDeleteAppId(null);
      showNotification('🗑️ Candidature supprimée de la base locale.');
    } catch {
      showNotification('❌ Erreur lors de la suppression.');
    }
  };

  // Supprimer une analyse archivée de la base locale
  const handleDeleteAnalysis = async (id: string) => {
    try {
      await localDbClient.deleteAnalysis(id);
      await loadData();
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      setConfirmDeleteAnalysisId(null);
      showNotification('🗑️ Analyse archivée supprimée.');
    } catch {
      showNotification('❌ Erreur lors de la suppression.');
    }
  };

  // Sauvegarder ou modifier une lettre de motivation
  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterFormContent.trim()) return;
    try {
      const toSave: SavedCoverLetter = {
        id: editingLetter ? editingLetter.id : `letter-${Date.now()}`,
        title: letterFormTitle.trim() || `Lettre - ${letterFormCompany || 'Candidature'}`,
        company: letterFormCompany.trim() || 'Entreprise Cible',
        role: letterFormRole.trim() || 'Poste Cible',
        content: letterFormContent.trim(),
        applicationId: letterFormAppId || undefined,
        createdAt: editingLetter ? editingLetter.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await localDbClient.saveCoverLetter(toSave);
      await loadData();
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      setIsAddingLetter(false);
      setEditingLetter(null);
      showNotification('✅ Lettre de motivation enregistrée dans la base locale !');
    } catch {
      showNotification("❌ Erreur lors de l'enregistrement de la lettre.");
    }
  };

  // Supprimer une lettre de motivation
  const handleDeleteLetter = async (id: string) => {
    try {
      await localDbClient.deleteCoverLetter(id);
      await loadData();
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      setConfirmDeleteLetterId(null);
      showNotification('🗑️ Lettre de motivation supprimée de la base.');
    } catch {
      showNotification('❌ Erreur lors de la suppression.');
    }
  };

  const handleDownloadLetterDoc = (letter: SavedCoverLetter) => {
    const blob = new Blob([letter.content], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lettre_Motivation_${(letter.company || 'Candidature').replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('📥 Lettre téléchargée au format Word (.doc) !');
  };

  // Export complet de la BDD locale
  const handleExportDatabase = () => {
    if (!dbData) return;
    const jsonStr = JSON.stringify(dbData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv_move_personnel_local_db_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('💾 Fichier de base de données téléchargé avec succès !');
  };

  // Importation d'un backup JSON
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Fichier JSON invalide');
        }
        await localDbClient.importDatabase(parsed);
        await loadData();
        if (onDatabaseUpdated) {
          onDatabaseUpdated();
        }
        showNotification('✅ Base de données locale restaurée avec succès !');
      } catch (err) {
        showNotification(`❌ Échec de l'importation : ${err instanceof Error ? err.message : 'Fichier non reconnu'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Supprimer le profil actuellement affiché
  const handleDeleteProfile = async () => {
    if (!profileForm?.id) return;
    try {
      await localDbClient.deleteProfile(profileForm.id);
      await loadData();
      if (onDatabaseUpdated) {
        onDatabaseUpdated();
      }
      setConfirmDeleteProfile(false);
      showNotification('🗑️ Profil supprimé avec succès de la base locale.');
    } catch {
      showNotification('❌ Erreur lors de la suppression du profil.');
    }
  };

  // Import direct d'un fichier CV depuis la bibliothèque de CVs
  const handleImportCvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingCv(true);
    try {
      const result = await parseCvFile(file);
      setCvFormTitle(result.fileName.replace(/\.[^/.]+$/, ''));
      setCvFormRole(profileForm?.currentTitle || 'Général');
      setCvFormText(result.text);
      setIsAddingCv(true);
      showNotification(`📥 CV « ${result.fileName} » extrait ! Vous pouvez l'enregistrer dans votre base locale.`);
    } catch (err: unknown) {
      showNotification(`❌ Erreur lors de l'extraction : ${err instanceof Error ? err.message : 'Fichier non supporté'}`);
    } finally {
      setIsImportingCv(false);
      e.target.value = '';
    }
  };

  // Réinitialisation de la BDD
  const handleResetDatabase = async () => {
    try {
      await localDbClient.resetDatabase();
      const emptyDb: DatabaseSchema = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        profile: {
          id: 'user_profile',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          location: '',
          currentTitle: '',
          bio: '',
          linkedinUrl: '',
          githubUrl: '',
          portfolioUrl: '',
          targetRoles: [],
          skills: [],
          updatedAt: new Date().toISOString(),
          isDefault: true,
        },
        profiles: [],
        cvs: [],
        applications: [],
        analyses: [],
        suggestions: [],
        coverLetters: [],
        settings: {
          selectedModel: 'gemini-3.8-flash',
          autoSaveToDb: true,
          backupFrequency: 'weekly',
          lastBackupDate: new Date().toISOString(),
        },
      };
      setDbData(emptyDb);
      setProfileForm(emptyDb.profile);
      setSkillsInput('');
      setTargetRolesInput('');
      setStats({
        cvsCount: 0,
        applicationsCount: 0,
        analysesCount: 0,
        suggestionsCount: 0,
        coverLettersCount: 0,
        dbSizeBytes: 0,
        lastUpdated: new Date().toISOString(),
      });
      setIsAddingCv(false);
      setEditingCv(null);
      setEditingLetter(null);
      setCvFormTitle('');
      setCvFormText('');
      setCvFormRole('');
      setLetterFormTitle('');
      setLetterFormContent('');
      setConfirmReset(false);
      if (onDatabaseReset) {
        onDatabaseReset();
      }
      showNotification('🔄 Base de données réinitialisée aux paramètres initiaux. Tout est à zéro.');
    } catch {
      showNotification('❌ Erreur lors de la réinitialisation.');
    }
  };

  const filteredSuggestions = (dbData?.suggestions || []).filter((s) => {
    if (selectedSuggestionType === 'all') return true;
    return s.type === selectedSuggestionType;
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col gap-6 p-6">
      {/* =====================================================================
          EN-TÊTE DE LA BASE DE DONNÉES LOCALE
         ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>Base de Données Locale & Données Personnelles</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Stockage autonome et sécurisé de vos CVs, profils, candidatures, analyses et pépites IA sur votre appareil.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Local & Confidentiel (RGPD / No Cloud Tracking)</span>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Rafraîchir les données de la base"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message de succès temporaire */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2 transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* =====================================================================
          INDICATEURS CLÉS DE LA BDD (KPIS)
         ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl flex flex-col">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3 h-3" /> CVs Stockés
          </span>
          <span className="text-xl font-black text-purple-900 mt-1">
            {stats?.cvsCount ?? dbData?.cvs.length ?? 0}
          </span>
        </div>

        <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl flex flex-col">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <Mail className="w-3 h-3" /> Lettres Rédigées
          </span>
          <span className="text-xl font-black text-rose-900 mt-1">
            {stats?.coverLettersCount ?? dbData?.coverLetters?.length ?? 0}
          </span>
        </div>

        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-col">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Candidatures
          </span>
          <span className="text-xl font-black text-blue-900 mt-1">
            {stats?.applicationsCount ?? dbData?.applications.length ?? 0}
          </span>
        </div>

        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-col">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <History className="w-3 h-3" /> Analyses ATS
          </span>
          <span className="text-xl font-black text-emerald-900 mt-1">
            {stats?.analysesCount ?? dbData?.analyses.length ?? 0}
          </span>
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Pépites STAR
          </span>
          <span className="text-xl font-black text-amber-900 mt-1">
            {stats?.suggestionsCount ?? dbData?.suggestions.length ?? 0}
          </span>
        </div>

        <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl flex flex-col">
          <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Sync Double
          </span>
          <span className="text-xs font-bold text-teal-900 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Fichier & IDB</span>
          </span>
        </div>
      </div>

      {/* =====================================================================
          NAVIGATION PAR SOUS-ONGLETS
         ===================================================================== */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'profile'
              ? 'border-purple-600 text-purple-700 bg-purple-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <User className="w-4 h-4" />
          <span>👤 Mon Profil Personnel</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('cvs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'cvs'
              ? 'border-purple-600 text-purple-700 bg-purple-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📁 Mes CVs ({dbData?.cvs.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('coverLetters')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'coverLetters'
              ? 'border-purple-600 text-purple-700 bg-purple-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>📄 Lettres de Motivation ({dbData?.coverLetters?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('applications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'applications'
              ? 'border-purple-600 text-purple-700 bg-purple-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>💼 Candidatures ({dbData?.applications.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('analyses')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'analyses'
              ? 'border-purple-600 text-purple-700 bg-purple-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>📊 Analyses ({dbData?.analyses.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('suggestions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'suggestions'
              ? 'border-purple-600 text-purple-700 bg-purple-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>💡 Boîte STAR ({dbData?.suggestions.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'backup'
              ? 'border-purple-600 text-purple-700 bg-purple-50/30'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>⚙️ Sauvegardes & Restauration</span>
        </button>
      </div>

      {/* =====================================================================
          CONTENU DU SOUS-ONGLET 1 : PROFIL PERSONNEL
         ===================================================================== */}
      {subTab === 'profile' && profileForm && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-purple-50/50 border border-purple-200/70 p-4 rounded-xl flex items-start gap-3">
            <User className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900 leading-relaxed">
              <span className="font-bold">Profil enregistré dans votre base locale :</span> Ces informations restent strictement sur votre machine et servent à pré-remplir l&apos;Analyseur, adapter les puces STAR et personnaliser les lettres d&apos;accroche.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Prénom"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nom de famille</label>
              <input
                type="text"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Nom"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Titre professionnel recherché</label>
              <input
                type="text"
                value={profileForm.currentTitle}
                onChange={(e) => setProfileForm({ ...profileForm, currentTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Product Owner Senior / Lead Tech"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Adresse e-mail</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="alex.martin@email.fr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Numéro de téléphone</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Localisation & Mobilité</label>
              <input
                type="text"
                value={profileForm.location}
                onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Paris (Hybride / Télétravail)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Profil LinkedIn (URL)</label>
              <input
                type="url"
                value={profileForm.linkedinUrl}
                onChange={(e) => setProfileForm({ ...profileForm, linkedinUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">GitHub / Code (URL)</label>
              <input
                type="url"
                value={profileForm.githubUrl}
                onChange={(e) => setProfileForm({ ...profileForm, githubUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://github.com/..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Portfolio / Site Web</label>
              <input
                type="url"
                value={profileForm.portfolioUrl}
                onChange={(e) => setProfileForm({ ...profileForm, portfolioUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://mon-portfolio.dev"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Bio courte / Pitch d&apos;accroche
            </label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Présentez en 3 lignes votre valeur ajoutée, vos compétences phares et vos réalisations majeures..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Compétences clés (séparées par des virgules)
              </label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Agile, Jira, TypeScript, React, Roadmapping..."
              />
              <p className="text-[11px] text-gray-500 mt-1">Exemple : Scrum, Python, Figma, SQL, Leadership</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Postes cibles (séparés par des virgules)
              </label>
              <input
                type="text"
                value={targetRolesInput}
                onChange={(e) => setTargetRolesInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Product Owner, Lead PM, Chef de projet..."
              />
              <p className="text-[11px] text-gray-500 mt-1">Sert à guider les suggestions de compétences et mots-clés ATS.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-gray-200 pt-4 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                Dernière mise à jour : {new Date(profileForm.updatedAt).toLocaleString('fr-FR')}
              </span>
              <button
                type="button"
                onClick={() => setConfirmDeleteProfile(true)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Supprimer ce profil de candidat de la base locale"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer ce profil</span>
              </button>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer le Profil dans la BDD</span>
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Suppression Profil */}
      {confirmDeleteProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <span>Supprimer ce profil candidat ?</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer ce profil candidat de votre base locale ? S&apos;il s&apos;agit de votre unique profil, il sera remis à zéro.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteProfile(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteProfile}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONTENU DU SOUS-ONGLET 2 : BIBLIOTHÈQUE DE CVS
         ===================================================================== */}
      {subTab === 'cvs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Bibliothèque Multi-CVs</h3>
              <p className="text-xs text-gray-500">
                Stockez vos CVs originaux et variantes (Tech, Management, etc.). Choisissez le CV actif en 1 clic.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Input fichier masqué pour l'import de CV */}
              <input
                type="file"
                ref={importCvFileRef}
                onChange={handleImportCvFile}
                accept=".pdf,.docx,.txt"
                className="hidden"
              />

              <button
                type="button"
                disabled={isImportingCv}
                onClick={() => importCvFileRef.current?.click()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                title="Importer un fichier CV (PDF, Word DOCX ou Texte)"
              >
                {isImportingCv ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extraction...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>📥 Importer un CV (PDF/Word/TXT)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingCv(null);
                  setCvFormTitle('');
                  setCvFormRole('');
                  setCvFormText('');
                  setIsAddingCv(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>➕ Saisie manuelle</span>
              </button>
            </div>
          </div>

          {/* Formulaire Modal / En ligne d'ajout de CV */}
          {isAddingCv && (
            <form onSubmit={handleSaveCv} className="p-5 border-2 border-purple-300 bg-purple-50/20 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                <h4 className="font-bold text-sm text-purple-900 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{editingCv ? 'Modifier le CV' : 'Enregistrer un nouveau CV dans la base locale'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingCv(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Annuler
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Titre du CV *</label>
                  <input
                    type="text"
                    required
                    value={cvFormTitle}
                    onChange={(e) => setCvFormTitle(e.target.value)}
                    placeholder="Ex: CV Développeur Fullstack TypeScript"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Rôle cible</label>
                  <input
                    type="text"
                    value={cvFormRole}
                    onChange={(e) => setCvFormRole(e.target.value)}
                    placeholder="Ex: Développeur React / Node"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contenu textuel complet du CV *</label>
                <textarea
                  rows={8}
                  required
                  value={cvFormText}
                  onChange={(e) => setCvFormText(e.target.value)}
                  placeholder="Collez ici l'intégralité du texte du CV..."
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCv(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  {editingCv ? 'Mettre à jour' : 'Sauvegarder dans la BDD'}
                </button>
              </div>
            </form>
          )}

          {/* Liste des CVs enregistrés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(dbData?.cvs || []).map((cv) => (
              <div
                key={cv.id}
                className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                  cv.isDefault
                    ? 'border-purple-400 bg-purple-50/20 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-lg bg-purple-100 text-purple-700">
                        <FileText className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 leading-snug">{cv.title}</h4>
                        <span className="text-[11px] text-gray-500 font-medium">Cible : {cv.targetRole}</span>
                      </div>
                    </div>

                    {cv.isDefault ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Principal</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultCv(cv.id)}
                        className="text-[11px] text-gray-500 hover:text-purple-600 font-medium flex items-center gap-1 transition-colors"
                        title="Définir comme CV principal"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Définir par défaut</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2.5 rounded-lg border border-gray-100 line-clamp-3 my-3">
                    {cv.rawText}
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-gray-400 text-[11px]">
                    {cv.rawText.length} caractères • Mis à jour le {new Date(cv.updatedAt).toLocaleDateString('fr-FR')}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadCvToAnalyzer(cv.rawText, cv.title);
                        onNavigateToTab('app');
                      }}
                      className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Injecter dans l'analyseur ATS"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Analyser</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCv(cv);
                        setCvFormTitle(cv.title);
                        setCvFormRole(cv.targetRole);
                        setCvFormText(cv.rawText);
                        setIsAddingCv(true);
                      }}
                      className="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                      title="Éditer ce CV"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {confirmDeleteCvId === cv.id ? (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                        <span className="text-[10px] text-red-700 font-bold">Supprimer ?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCv(cv.id)}
                          className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCvId(null)}
                          className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCvId(cv.id)}
                        className="p-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Supprimer ce CV de la base locale"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          CONTENU DU SOUS-ONGLET : LETTRES DE MOTIVATION ENREGISTRÉES
         ===================================================================== */}
      {subTab === 'coverLetters' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/60 border border-rose-200/80 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-rose-600" />
                <span>Lettres de Motivation Enregistrées en BDD Locale</span>
              </h3>
              <p className="text-xs text-rose-800/80 mt-0.5">
                Consultez, retouchez, copiez ou téléchargez toutes les lettres rédigées pour vos candidatures.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setEditingLetter(null);
                  setLetterFormTitle('');
                  setLetterFormCompany('');
                  setLetterFormRole('');
                  setLetterFormContent('');
                  setLetterFormAppId('');
                  setIsAddingLetter(true);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouvelle Lettre</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToTab('cv-assistant')}
                className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                ✨ Générateur Assisté
              </button>
            </div>
          </div>

          {/* Formulaire Modal Ajouter / Éditer Lettre */}
          {isAddingLetter && (
            <div className="p-5 bg-white border border-rose-200 rounded-2xl shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-rose-600" />
                  <span>{editingLetter ? 'Modifier la Lettre de Motivation' : 'Enregistrer une Nouvelle Lettre'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingLetter(false);
                    setEditingLetter(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveLetter} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Titre de la lettre
                    </label>
                    <input
                      type="text"
                      value={letterFormTitle}
                      onChange={(e) => setLetterFormTitle(e.target.value)}
                      placeholder="ex: Lettre - Trésorier Senior"
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Entreprise ciblée
                    </label>
                    <input
                      type="text"
                      value={letterFormCompany}
                      onChange={(e) => setLetterFormCompany(e.target.value)}
                      placeholder="ex: Agicap / TotalEnergies"
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Poste visé
                    </label>
                    <input
                      type="text"
                      value={letterFormRole}
                      onChange={(e) => setLetterFormRole(e.target.value)}
                      placeholder="ex: Trésorier Opérationnel"
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {dbData?.applications && dbData.applications.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Rattacher à une candidature existante du Kanban (optionnel)
                    </label>
                    <select
                      value={letterFormAppId}
                      onChange={(e) => setLetterFormAppId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    >
                      <option value="">-- Aucune candidature rattachée pour le moment --</option>
                      {dbData.applications.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.company} — {app.role} ({app.appliedDate || 'En cours'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Texte complet de la lettre de motivation *
                    </label>
                    <span className="text-[11px] text-gray-400">
                      {letterFormContent.split(/\s+/).filter(Boolean).length} mots
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    value={letterFormContent}
                    onChange={(e) => setLetterFormContent(e.target.value)}
                    placeholder="Madame, Monsieur,..."
                    className="w-full text-xs p-3.5 border border-gray-300 rounded-xl font-sans text-gray-800 leading-relaxed focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingLetter(false);
                      setEditingLetter(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                  >
                    {editingLetter ? 'Enregistrer les modifications' : 'Sauvegarder dans la BDD'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Liste des lettres */}
          {(!dbData?.coverLetters || dbData.coverLetters.length === 0) ? (
            <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800">Aucune lettre de motivation dans votre base locale</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Générez votre première lettre sur-mesure depuis le parcours d&apos;analyse (Étape 4) ou depuis l&apos;Assistant IA, et enregistrez-la ici en 1 clic.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('cv-assistant')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  ✨ Rédiger avec l&apos;IA
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingLetter(true)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Coller une lettre existante
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dbData.coverLetters.map((letter) => {
                const associatedApp = letter.applicationId
                  ? dbData.applications.find((a) => a.id === letter.applicationId)
                  : null;
                const isCopied = copiedLetterId === letter.id;

                return (
                  <div
                    key={letter.id}
                    className="p-5 rounded-2xl border border-rose-200/80 bg-white hover:border-rose-300 shadow-2xs flex flex-col justify-between transition-all space-y-3"
                  >
                    <div>
                      {/* En-tête de la lettre */}
                      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block truncate">
                            {letter.company || 'Entreprise Cible'}
                          </span>
                          <h4 className="font-extrabold text-sm text-gray-900 leading-snug truncate mt-0.5">
                            {letter.title || `Lettre - ${letter.role}`}
                          </h4>
                          <span className="text-[11px] text-gray-500 font-medium">
                            Poste : {letter.role || 'Poste Cible'}
                          </span>
                        </div>

                        {associatedApp ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('tracker')}
                            className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold flex items-center gap-1 hover:bg-blue-100 cursor-pointer shrink-0"
                            title="Ouvrir dans le Kanban"
                          >
                            <Briefcase className="w-2.5 h-2.5" />
                            <span>Liée Kanban</span>
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium shrink-0">
                            Non liée
                          </span>
                        )}
                      </div>

                      {/* Aperçu du texte */}
                      <p className="text-xs text-gray-700 font-sans bg-rose-50/30 p-3 rounded-xl border border-rose-100/70 line-clamp-4 mt-3 leading-relaxed whitespace-pre-line">
                        {letter.content}
                      </p>
                    </div>

                    {/* Pied de carte avec actions */}
                    <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-gray-400 text-[11px]">
                        {letter.content.split(/\s+/).filter(Boolean).length} mots • {new Date(letter.updatedAt || letter.createdAt).toLocaleDateString('fr-FR')}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(letter.content);
                            setCopiedLetterId(letter.id);
                            setTimeout(() => setCopiedLetterId(null), 2000);
                            showNotification('📋 Lettre copiée dans le presse-papier !');
                          }}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Copié !' : 'Copier'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadLetterDoc(letter)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Télécharger en document Word .doc"
                        >
                          <Download className="w-3 h-3" />
                          <span>.doc</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingLetter(letter);
                            setLetterFormTitle(letter.title);
                            setLetterFormCompany(letter.company);
                            setLetterFormRole(letter.role);
                            setLetterFormContent(letter.content);
                            setLetterFormAppId(letter.applicationId || '');
                            setIsAddingLetter(true);
                          }}
                          className="p-1 rounded-md border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                          title="Modifier cette lettre"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {confirmDeleteLetterId === letter.id ? (
                          <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                            <span className="text-[10px] text-red-700 font-bold">Supprimer ?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteLetter(letter.id)}
                              className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Oui
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteLetterId(null)}
                              className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteLetterId(letter.id)}
                            className="p-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Supprimer cette lettre de la base"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          CONTENU DU SOUS-ONGLET 3 : SUGGESTIONS ET PÉPITES STAR
         ===================================================================== */}
      {subTab === 'suggestions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Boîte à Pépites & Formulations STAR Sauvegardées</span>
              </h3>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Retrouvez ici les réalisations chiffrées, bios et pitchs d&apos;accroche générés dans l&apos;Assistant et conservés dans votre base locale.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSuggestionType}
                onChange={(e) => setSelectedSuggestionType(e.target.value)}
                className="text-xs px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-medium text-gray-800"
              >
                <option value="all">Toutes les suggestions</option>
                <option value="star_accomplishment">Puces STAR chiffrées</option>
                <option value="branding_bio">Bios & Accroches</option>
                <option value="cover_letter_hook">Accroches Lettres</option>
              </select>

              <button
                type="button"
                onClick={() => onNavigateToTab('cv-assistant')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                ✨ Ouvrir l&apos;Assistant CV
              </button>
            </div>
          </div>

          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
              <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">Aucune suggestion sauvegardée pour le moment</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Dans l&apos;onglet « Assistant & Guide CV », cliquez sur le bouton « 💾 Sauvegarder dans la BDD » pour conserver vos meilleures formules.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuggestions.map((sugg) => (
                <div key={sugg.id} className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        {sugg.type === 'star_accomplishment'
                          ? 'Formule STAR'
                          : sugg.type === 'branding_bio'
                          ? 'Bio / Accroche'
                          : 'Suggestion'}
                      </span>
                      {confirmDeleteSuggId === sugg.id ? (
                        <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                          <span className="text-[10px] text-red-700 font-bold">Supprimer ?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSuggestion(sugg.id)}
                            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Oui
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSuggId(null)}
                            className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSuggId(sugg.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                          title="Supprimer cette suggestion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-gray-900 mb-1">{sugg.title}</h4>
                    {sugg.originalText && (
                      <p className="text-[11px] text-gray-500 italic mb-2">
                        Texte d&apos;origine : &quot;{sugg.originalText}&quot;
                      </p>
                    )}
                    <p className="text-xs text-gray-800 bg-amber-50/40 border border-amber-100 p-3 rounded-lg leading-relaxed">
                      {sugg.generatedContent}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Ajouté le {new Date(sugg.createdAt).toLocaleDateString('fr-FR')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(sugg.generatedContent);
                        showNotification('📋 Texte copié dans le presse-papier !');
                      }}
                      className="text-amber-700 hover:text-amber-900 font-bold transition-colors"
                    >
                      Copier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          CONTENU DU SOUS-ONGLET 4 : CANDIDATURES STOCKÉES
         ===================================================================== */}
      {subTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-blue-900">Candidatures enregistrées en BDD locale</h3>
              <p className="text-xs text-blue-800/80">
                Toutes vos opportunités et relances sont persistées dans votre base locale.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('tracker')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              💼 Ouvrir le Suivi Kanban & Relances
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Entreprise & Poste</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date candidature</th>
                  <th className="px-4 py-3">Relance prévue</th>
                  <th className="px-4 py-3">Score ATS</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(dbData?.applications || []).map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{app.company}</div>
                      <div className="text-gray-500 text-[11px]">{app.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{app.appliedDate}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{app.followUpDate}</td>
                    <td className="px-4 py-3">
                      {app.score !== null && app.score !== undefined ? (
                        <span className="font-bold text-emerald-600">{app.score}%</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigateToTab('tracker')}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          Voir
                        </button>
                        {confirmDeleteAppId === app.id ? (
                          <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            <span className="text-[10px] text-red-700 font-bold">Supprimer ?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteApplication(app.id)}
                              className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Oui
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteAppId(null)}
                              className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteAppId(app.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Supprimer cette candidature de la base locale"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONTENU DU SOUS-ONGLET 5 : ANALYSES ARCHIVÉES
         ===================================================================== */}
      {subTab === 'analyses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Analyses d&apos;adéquation ATS archivées</h3>
              <p className="text-xs text-emerald-800/80">
                Historique complet des audits réalisés, avec scores et rapports détaillés.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('history')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              📚 Ouvrir l&apos;Historique Détaillé
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(dbData?.analyses || []).map((an) => (
              <div key={an.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="font-bold text-xs text-gray-900 line-clamp-1">{an.title}</h4>
                  {an.score !== null && an.score !== undefined && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {an.score}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2 mb-3">{an.jobSnippet}</p>
                <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 pt-2">
                  <span>{an.timestamp}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAnalysis(an.id);
                        onNavigateToTab('history');
                      }}
                      className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                    >
                      Consulter le rapport
                    </button>
                    {confirmDeleteAnalysisId === an.id ? (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        <span className="text-[10px] text-red-700 font-bold">Supprimer ?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnalysis(an.id)}
                          className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteAnalysisId(null)}
                          className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAnalysisId(an.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Supprimer cette analyse archivée"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          CONTENU DU SOUS-ONGLET 6 : SAUVEGARDES, EXPORT & RESTAURATION
         ===================================================================== */}
      {subTab === 'backup' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Boîte Export */}
            <div className="p-6 border border-gray-200 rounded-xl bg-gray-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-3">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Exporter la Base de Données</h3>
                <p className="text-xs text-gray-600 leading-relaxed mt-1">
                  Téléchargez un instantané complet de votre base locale au format <code>JSON</code>. Ce fichier contient l&apos;intégralité de votre profil, de vos CVs enregistrés, de vos candidatures et de vos analyses pour sauvegarde ou migration vers un autre poste.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportDatabase}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger la Sauvegarde (.json)</span>
              </button>
            </div>

            {/* Boîte Import / Restauration */}
            <div className="p-6 border border-gray-200 rounded-xl bg-gray-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Restaurer une Sauvegarde</h3>
                <p className="text-xs text-gray-600 leading-relaxed mt-1">
                  Sélectionnez un fichier de sauvegarde <code>.json</code> préalablement exporté. Les enregistrements seront fusionnés et réinjectés dans votre base locale de manière sécurisée.
                </p>
              </div>

              <label className="w-full py-2.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-800 text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-gray-500" />
                <span>Sélectionner un fichier de sauvegarde</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportDatabase}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Boîte Réinitialisation Sécurisée */}
          <div className="p-5 border border-red-200 rounded-xl bg-red-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Zone de Réinitialisation d&apos;Usine</span>
              </div>
              <p className="text-xs text-red-700/80 mt-0.5">
                Efface les modifications et restaure la base de données locale avec les données d&apos;exemple initiales.
              </p>
            </div>

            {confirmReset ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleResetDatabase}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Confirmer la suppression
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Réinitialiser la base locale
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseManager;
