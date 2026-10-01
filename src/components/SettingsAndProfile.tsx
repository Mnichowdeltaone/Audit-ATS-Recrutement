import React, { useState, useEffect } from 'react';
import {
  User,
  Key,
  Database,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Github,
  Plus,
  X,
  FileText,
  ShieldCheck,
  Zap,
  HelpCircle,
  ExternalLink,
  FileCode,
  BookOpen,
  Terminal,
  Check,
  Copy,
  Code2,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { localDbClient } from '../services/localDbClient';
import { UserProfile, DatabaseStats, SavedCv } from '../types';
import { PYTHON_APP_CODE, REQUIREMENTS_TXT } from '../utils/pythonCode';
import { extractProfileFromCv } from '../utils/profileExtractor';

const API_BASE_URL =
  typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

interface SettingsAndProfileProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  selectedModel: 'gemini-3.8-flash' | 'gemini-flash-latest';
  setSelectedModel: (model: 'gemini-3.8-flash' | 'gemini-flash-latest') => void;
  hasServerKey: boolean;
  onInjectProfileToCv: (headerText: string) => void;
  onNavigateToTab: (tab: string) => void;
  dbStats: DatabaseStats | null;
  onRefreshDbStats: () => Promise<void>;
  savedCvs: SavedCv[];
  currentCvText?: string;
  activeCvTitle?: string;
  userProfiles?: UserProfile[];
  onProfileUpdated?: (profile: UserProfile) => void;
  onProfilesUpdated?: (profiles: UserProfile[]) => void;
  onSelectProfile?: (profileId: string) => void;
  initialSubTab?: 'profile' | 'api' | 'backup' | 'tech';
}

function normalizeProfile(profile?: Partial<UserProfile> | null): UserProfile {
  const source = profile || {};

  return {
    ...source,
    id: source.id || `profile-${Date.now()}`,
    name: source.name || 'Profil Principal',
    isDefault: source.isDefault ?? true,
    firstName: source.firstName || '',
    lastName: source.lastName || '',
    email: source.email || '',
    phone: source.phone || '',
    location: source.location || '',
    currentTitle: source.currentTitle || '',
    bio: source.bio || '',
    linkedinUrl: source.linkedinUrl || '',
    githubUrl: source.githubUrl || '',
    portfolioUrl: source.portfolioUrl || '',
    targetRoles: Array.isArray(source.targetRoles) ? source.targetRoles : [],
    skills: Array.isArray(source.skills) ? source.skills : [],
    updatedAt: source.updatedAt || new Date().toISOString(),
  } as UserProfile;
}

export default function SettingsAndProfile({
  apiKey,
  setApiKey,
  selectedModel,
  setSelectedModel,
  hasServerKey,
  onInjectProfileToCv,
  onNavigateToTab,
  dbStats,
  onRefreshDbStats,
  savedCvs,
  currentCvText = '',
  activeCvTitle = '',
  userProfiles,
  onProfileUpdated,
  onProfilesUpdated,
  onSelectProfile,
  initialSubTab = 'profile',
}: SettingsAndProfileProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'api' | 'backup' | 'tech'>(initialSubTab);
  const [techView, setTechView] = useState<'code' | 'guide'>('code');
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [isKeySavedInStorage, setIsKeySavedInStorage] = useState<boolean>(() => {
    return !!localDbClient.getSavedApiKey();
  });

  // Liste Multi-Profils synchronisée
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    if (userProfiles && userProfiles.length > 0) return userProfiles.map(normalizeProfile);
    return localDbClient.getLocalProfiles().map(normalizeProfile);
  });

  useEffect(() => {
    if (userProfiles && userProfiles.length > 0) {
      setProfiles(userProfiles.map(normalizeProfile));
    }
  }, [userProfiles]);

  // Profil Utilisateur Actif
  const [profile, setProfile] = useState<UserProfile>(() => {
    const local = localDbClient.getLocalProfile();
    if (local && (local.firstName || local.lastName)) {
      return normalizeProfile(local);
    }
    return normalizeProfile();
  });

  const [newSkillInput, setNewSkillInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isExtractingFromCv, setIsExtractingFromCv] = useState(false);

  // Test de connexion API
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    model?: string;
  } | null>(null);

  // Notification Toast
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Charger les profils depuis la BDD locale au montage
  useEffect(() => {
    localDbClient
      .getProfiles()
      .then((loadedList) => {
        if (loadedList && loadedList.length > 0) {
          const normalizedList = loadedList.map(normalizeProfile);
          setProfiles(normalizedList);
          onProfilesUpdated?.(normalizedList);
          const active = normalizedList.find((p) => p.isDefault) || normalizedList[0];
          if (active) {
            const normalizedActive = normalizeProfile(active);
            setProfile(normalizedActive);
            onProfileUpdated?.(normalizedActive);
          }
        }
      })
      .catch((err) => console.warn('Erreur chargement profils :', err));
  }, []);

  // Changer de profil actif
  const handleSelectProfile = async (targetId: string) => {
    try {
      const switched = await localDbClient.setDefaultProfile(targetId);
      if (switched) {
        const normalizedSwitched = normalizeProfile(switched);
        setProfile(normalizedSwitched);
        setProfiles((prev) =>
          prev.map((p) => ({
            ...p,
            isDefault: p.id === targetId,
          }))
        );
        onProfileUpdated?.(normalizedSwitched);
        setNotice({
          type: 'success',
          message: `Profil actif basculé sur « ${normalizedSwitched.name || normalizedSwitched.currentTitle || 'Profil'} » !`,
        });
        setTimeout(() => setNotice(null), 3000);
      }
    } catch {
      setNotice({ type: 'error', message: 'Erreur lors du changement de profil.' });
      setTimeout(() => setNotice(null), 3000);
    }
  };

  // Créer un nouveau profil
  const handleCreateNewProfile = async (populateFromCv = false) => {
    setIsSavingProfile(true);
    setNotice(null);
    try {
      let initialData: Partial<UserProfile> = {
        name: `Profil ${profiles.length + 1}`,
        isDefault: true,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        currentTitle: '',
        bio: '',
        targetRoles: [],
        skills: [],
      };

      if (populateFromCv) {
        const textToUse = currentCvText.trim() || (savedCvs[0]?.rawText || '');
        if (textToUse) {
          const extracted = await extractProfileFromCv(textToUse, apiKey, selectedModel);
          initialData = {
            ...initialData,
            ...extracted,
            name: extracted.currentTitle || `Profil CV (${new Date().toLocaleDateString('fr-FR')})`,
          };
        }
      }

      const newP = normalizeProfile(await localDbClient.saveProfile(initialData));
      setProfile(newP);
      const updatedList = (await localDbClient.getProfiles()).map(normalizeProfile);
      setProfiles(updatedList);
      onProfileUpdated?.(newP);
      onProfilesUpdated?.(updatedList);

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      setNotice({
        type: 'success',
        message: `Nouveau profil « ${newP.name} » créé et activé !`,
      });
      setTimeout(() => setNotice(null), 3500);
    } catch {
      setNotice({ type: 'error', message: 'Erreur lors de la création du profil.' });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Écouteur global pour la réinitialisation de la BDD
  useEffect(() => {
    const handleReset = () => {
      const blankProfile: UserProfile = {
        id: `profile-${Date.now()}`,
        name: 'Profil Personnel',
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
      };
      setProfile(blankProfile);
      setProfiles([]);
      setNewSkillInput('');
      setNewRoleInput('');
      setNotice(null);
    };
    window.addEventListener('cv_move_database_reset', handleReset);
    return () => window.removeEventListener('cv_move_database_reset', handleReset);
  }, []);

  // Supprimer un profil
  const handleDeleteProfile = async (idToDelete: string) => {
    try {
      await localDbClient.deleteProfile(idToDelete);
      const updatedList = (await localDbClient.getProfiles()).map(normalizeProfile);
      const cleanList = updatedList.length > 0 ? updatedList : [];
      setProfiles(cleanList);
      onProfilesUpdated?.(cleanList);
      const fallbackProfile = normalizeProfile({
        id: `profile-${Date.now()}`,
        name: 'Nouveau Profil',
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
      });
      const newActive = cleanList.find((p) => p.isDefault) || cleanList[0] || fallbackProfile;
      const normalizedActive = normalizeProfile(newActive);
      setProfile(normalizedActive);
      onProfileUpdated?.(normalizedActive);
      setNotice({ type: 'success', message: '🗑️ Profil supprimé avec succès.' });
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setNotice({ type: 'error', message: 'Erreur lors de la suppression du profil.' });
      setTimeout(() => setNotice(null), 3000);
    }
  };

  // Remplir le profil sélectionné avec le CV actuel
  const handlePopulateFromCurrentCv = async () => {
    const textToUse = currentCvText.trim() || (savedCvs.find((c) => c.isDefault)?.rawText || savedCvs[0]?.rawText || '');
    if (!textToUse) {
      setNotice({
        type: 'error',
        message: 'Aucun CV texte trouvé. Veuillez d’abord charger ou importer un CV dans l’analyseur.',
      });
      setTimeout(() => setNotice(null), 3500);
      return;
    }

    setIsExtractingFromCv(true);
    setNotice(null);

    try {
      const extracted = await extractProfileFromCv(textToUse, apiKey, selectedModel);

      const mergedProfile = normalizeProfile({
        ...profile,
        firstName: extracted.firstName || profile.firstName,
        lastName: extracted.lastName || profile.lastName,
        email: extracted.email || profile.email,
        phone: extracted.phone || profile.phone,
        location: extracted.location || profile.location,
        currentTitle: extracted.currentTitle || profile.currentTitle,
        bio: extracted.bio || profile.bio || '',
        linkedinUrl: extracted.linkedinUrl || profile.linkedinUrl || '',
        githubUrl: extracted.githubUrl || profile.githubUrl || '',
        targetRoles:
          extracted.targetRoles && extracted.targetRoles.length > 0
            ? extracted.targetRoles
            : profile.targetRoles || [],
        skills: extracted.skills && extracted.skills.length > 0 ? extracted.skills : profile.skills || [],
        name: profile.name && !profile.name.startsWith('Profil ') ? profile.name : extracted.currentTitle || profile.name || 'Profil Candidat',
        updatedAt: new Date().toISOString(),
      });

      const savedProfile = normalizeProfile(await localDbClient.saveProfile(mergedProfile));
      setProfile(savedProfile);
      const updatedList = (await localDbClient.getProfiles()).map(normalizeProfile);
      setProfiles(updatedList);
      onProfileUpdated?.(savedProfile);
      onProfilesUpdated?.(updatedList);

      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      setNotice({
        type: 'success',
        message: `✅ Profil mis à jour et rempli avec succès à partir du CV actuel (${mergedProfile.firstName} ${mergedProfile.lastName}, ${mergedProfile.currentTitle}) !`,
      });
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error('Erreur extraction CV :', err);
      setNotice({ type: 'error', message: 'Erreur lors de l’extraction des données du CV.' });
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setIsExtractingFromCv(false);
    }
  };

  // Sauvegarder le profil
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setNotice(null);
    try {
      const updated = normalizeProfile({
        ...profile,
        updatedAt: new Date().toISOString(),
      });
      const savedProfile = normalizeProfile(await localDbClient.saveProfile(updated));
      setProfile(savedProfile);
      const updatedList = (await localDbClient.getProfiles()).map(normalizeProfile);
      setProfiles(updatedList);
      onProfileUpdated?.(savedProfile);
      onProfilesUpdated?.(updatedList);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      setNotice({ type: 'success', message: `Profil « ${updated.name || 'Candidat'} » enregistré avec succès dans la base locale !` });
      setTimeout(() => setNotice(null), 3500);
    } catch {
      setNotice({ type: 'error', message: 'Erreur lors de la sauvegarde du profil.' });
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Injecter le profil dans le CV actif
  const handleInjectToActiveCv = () => {
    const fullName = `${profile.firstName} ${profile.lastName}`.trim().toUpperCase() || 'CANDIDAT';
    const title = profile.currentTitle ? `${profile.currentTitle}\n` : '';
    
    const contactParts = [
      profile.location,
      profile.phone,
      profile.email,
      profile.linkedinUrl ? profile.linkedinUrl.replace(/^https?:\/\//, '') : '',
      profile.githubUrl ? profile.githubUrl.replace(/^https?:\/\//, '') : '',
      profile.portfolioUrl ? profile.portfolioUrl.replace(/^https?:\/\//, '') : '',
    ].filter(Boolean);

    const header = `${fullName}\n${title}${contactParts.join(' | ')}\n\nRÉSUMÉ PROFESSIONNEL\n${profile.bio || ''}\n\nCOMPÉTENCES CLÉS\n${(profile.skills || []).map((s) => `- ${s}`).join('\n')}\n\n`;

    onInjectProfileToCv(header);
    setNotice({ type: 'success', message: 'Coordonnées & résumé injectés avec succès en en-tête de votre CV actif !' });
    setTimeout(() => {
      setNotice(null);
      onNavigateToTab('app');
    }, 1500);
  };

  // Ajouter une compétence
  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !(profile.skills || []).includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        skills: [...(prev.skills || []), trimmed],
      }));
      setNewSkillInput('');
    }
  };

  // Supprimer une compétence
  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((s) => s !== skillToRemove),
    }));
  };

  // Ajouter un rôle ciblé
  const handleAddRole = () => {
    const trimmed = newRoleInput.trim();
    if (trimmed && !(profile.targetRoles || []).includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        targetRoles: [...(prev.targetRoles || []), trimmed],
      }));
      setNewRoleInput('');
    }
  };

  // Supprimer un rôle ciblé
  const handleRemoveRole = (roleToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      targetRoles: (prev.targetRoles || []).filter((r) => r !== roleToRemove),
    }));
  };

  // Tester la connexion API en direct
  const handleTestApiKey = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/test-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setApiTestResult({
          success: false,
          message: data.error || 'Échec du test de connexion à l\'API Google Gemini.',
        });
      } else {
        setApiTestResult({
          success: true,
          message: `Connexion établie avec succès avec le modèle ${data.model} !`,
          latencyMs: data.latencyMs,
          model: data.model,
        });
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      }
    } catch (err: unknown) {
      setApiTestResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Sauvegarde explicite de la clé API avec retour visuel immédiat
  const handleSaveApiKey = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setNotice({ type: 'error', message: 'Veuillez saisir une clé API valide avant d\'enregistrer.' });
      setTimeout(() => setNotice(null), 3500);
      return;
    }
    localDbClient.saveApiKey(trimmed);
    localDbClient.saveModel(selectedModel);
    setIsKeySavedInStorage(true);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    setNotice({
      type: 'success',
      message: '✅ Clé API Google Gemini sauvegardée avec succès ! Elle restera mémorisée à chaque nouveau démarrage.',
    });
    setTimeout(() => setNotice(null), 4500);
  };

  // Suppression de la clé sauvegardée
  const handleClearApiKey = () => {
    setApiKey('');
    localDbClient.saveApiKey('');
    setIsKeySavedInStorage(false);
    setApiTestResult(null);
    setNotice({
      type: 'success',
      message: 'Clé API supprimée de la mémoire locale du navigateur.',
    });
    setTimeout(() => setNotice(null), 3500);
  };

  // Changement de clé API avec sauvegarde continue
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    localDbClient.saveApiKey(val);
    setIsKeySavedInStorage(!!val.trim());
  };

  // Changement de modèle avec persistance
  const handleSelectModel = (model: 'gemini-3.8-flash' | 'gemini-flash-latest') => {
    setSelectedModel(model);
    localDbClient.saveModel(model);
  };

  // Copie de snippets dans le presse-papier
  const handleCopyCode = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSnippet(label);
      setTimeout(() => setCopiedSnippet(null), 2500);
    } catch {
      // Ignorer
    }
  };

  // Téléchargement du script app.py
  const handleDownloadAppPy = () => {
    const blob = new Blob([PYTHON_APP_CODE], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotice({ type: 'success', message: 'Fichier app.py téléchargé avec succès !' });
    setTimeout(() => setNotice(null), 3000);
  };

  // Exporter la base locale
  const handleExportBackup = async () => {
    try {
      const fullDb = await localDbClient.fetchAll();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullDb, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `cv_move_personnel_sauvegarde_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setNotice({ type: 'success', message: 'Sauvegarde complète exportée en fichier JSON !' });
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setNotice({ type: 'error', message: 'Erreur lors de l\'exportation de la sauvegarde.' });
      setTimeout(() => setNotice(null), 3000);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header Espace Personnel & Technique */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              Espace Personnel & Technique
            </h1>
            <span className="text-xs bg-purple-100 text-purple-800 font-semibold px-2.5 py-0.5 rounded-full">
              Configuration & Documentation
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-3xl">
            Gérez votre profil candidat, sauvegardez durablement votre clé API Google Gemini, administrez votre base locale et consultez la documentation technique complète.
          </p>
        </div>

        {/* Sous-onglets de navigation */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('profile')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'profile'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-purple-600" />
            <span>Profil Candidat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('api')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'api'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-indigo-600" />
            <span>Clé API & Modèle IA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('backup')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'backup'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Données & Sauvegardes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('tech')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'tech'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Documentation Technique</span>
          </button>
        </div>
      </div>

      {/* Notifications Toast */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* =========================================================================
          SOUS-ONGLET 1 : PROFIL CANDIDAT (INFOS PERSONNELLES)
         ========================================================================= */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6">

          {/* 1. GESTIONNAIRE MULTI-PROFILS */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                    <User className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-bold text-gray-900">
                    Mes Profils Candidat ({profiles.length})
                  </h2>
                  <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                    Multi-Profils
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Gérez plusieurs profils candidats ciblés et basculez d&apos;un profil à l&apos;autre en un clic.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleCreateNewProfile(false)}
                  disabled={isSavingProfile}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 text-gray-800 hover:text-purple-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Créer un nouveau profil vierge"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-600" />
                  <span>Nouveau profil vierge</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateNewProfile(true)}
                  disabled={isSavingProfile || (!currentCvText.trim() && savedCvs.length === 0)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  title="Créer un nouveau profil directement pré-rempli à partir du CV actuel"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>✨ Nouveau profil depuis CV</span>
                </button>
              </div>
            </div>

            {/* Liste des profils sous forme de cartes cliquables */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {profiles.map((p) => {
                const isActive = p.id === profile.id || p.isDefault;
                const pInitials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase() || 'CV';
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProfile(p.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isActive
                        ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-200 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            isActive
                              ? 'bg-linear-to-tr from-purple-600 to-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pInitials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-gray-900 truncate">
                              {p.name || p.currentTitle || `${p.firstName} ${p.lastName}` || 'Profil sans nom'}
                            </span>
                            {isActive && (
                              <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                Actif
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">
                            {p.currentTitle || (p.firstName ? `${p.firstName} ${p.lastName}` : 'Titre à définir')}
                          </p>
                        </div>
                      </div>

                      {profiles.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Supprimer définitivement le profil « ${p.name || 'ce profil'} » ?`)) {
                              handleDeleteProfile(p.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer ce profil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                      <span>{p.skills?.length || 0} compétences</span>
                      {p.associatedCvTitle && (
                        <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded truncate max-w-[140px]" title={p.associatedCvTitle}>
                          📄 {p.associatedCvTitle}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. BANNIÈRE PROMINENTE : REMPLIR LE PROFIL ACTUEL DEPUIS LE CV */}
          <div className="p-5 rounded-2xl bg-linear-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-lg shadow-2xs">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </span>
                <h3 className="text-sm font-bold text-gray-900">
                  Remplir le profil « {profile.name || profile.currentTitle || 'Actif'} » avec le CV actuel
                </h3>
              </div>
              <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
                Le CV actuellement ouvert dans l&apos;analyseur remplit automatiquement ce profil : votre nom, prénom, email, téléphone, localisation, titre professionnel, bio/résumé, compétences et rôles cibles sont extraits et synchronisés en 1 clic.
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-900 font-medium">
                {currentCvText.trim() ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span>
                      CV actuel détecté : <strong>{activeCvTitle || (savedCvs[0]?.title) || 'Texte dans l\'analyseur'}</strong> ({currentCvText.trim().length} caractères)
                    </span>
                  </>
                ) : savedCvs.length > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    <span>
                      CV en base prêt : <strong>{savedCvs[0].title}</strong> ({savedCvs[0].rawText.length} caractères)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                    <span className="text-gray-500">
                      Aucun CV texte chargé pour le moment.
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={handlePopulateFromCurrentCv}
                disabled={isExtractingFromCv || (!currentCvText.trim() && savedCvs.length === 0)}
                className="px-4 py-2.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:shadow-md"
                title="Remplir et synchroniser automatiquement ce profil avec le CV actuel"
              >
                {isExtractingFromCv ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Extraction en cours...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>⚡ Remplir ce profil avec le CV actuel</span>
                  </>
                )}
              </button>

              {(!currentCvText.trim() && savedCvs.length === 0) && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('app')}
                  className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>Importer un CV</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. FORMULAIRE D'ÉDITION DU PROFIL ACTIF */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span>Édition du profil : « {profile.name || profile.currentTitle || 'Actif'} »</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ces informations servent de base au générateur de CV, à la lettre de motivation et à l&apos;alignement des mots-clés.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleInjectToActiveCv}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Injecter le nom, le titre et les coordonnées en haut de votre CV actif"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>Injecter dans le CV actif</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="px-4 py-1.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  {isSavingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Enregistrer mon profil</span>
                </button>
              </div>
            </div>

            {/* Nom du profil et CV source */}
            <div className="p-3.5 bg-purple-50/50 border border-purple-200/70 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Nom / Libellé de ce Profil
                </label>
                <input
                  type="text"
                  value={profile.name || ''}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Ex: Trésorier Opérationnel, Consultant TMS, Direction Financière..."
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Ce nom vous permet d&apos;identifier ce profil dans vos candidatures et dans le menu latéral.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  CV source associé
                </label>
                <input
                  type="text"
                  value={profile.associatedCvTitle || 'Non associé (saisie manuelle)'}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-xs cursor-not-allowed"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Indique quel CV a été utilisé pour alimenter automatiquement les champs de ce profil.
                </p>
              </div>
            </div>

            {/* Grille des coordonnées */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  placeholder="Ex: François"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Nom de famille
                </label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  placeholder="Ex: Delrieu"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Titre professionnel actuel / visé
                </label>
                <input
                  type="text"
                  value={profile.currentTitle}
                  onChange={(e) => setProfile({ ...profile, currentTitle: e.target.value })}
                  placeholder="Ex: Trésorier Opérationnel | Cash Manager"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>Email professionnel</span>
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="Ex: delrieu.fra@gmail.com"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>Téléphone</span>
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Ex: 06 72 42 88 93"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>Localisation & Mobilité</span>
                </label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="Ex: Montrouge (92120), Île-de-France"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Liens professionnels */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Liens professionnels & Réseaux
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Profil LinkedIn</span>
                  </label>
                  <input
                    type="url"
                    value={profile.linkedinUrl || ''}
                    onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/mon-profil"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Github className="w-3.5 h-3.5 text-gray-800" />
                    <span>GitHub ou Répertoire</span>
                  </label>
                  <input
                    type="url"
                    value={profile.githubUrl || ''}
                    onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                    placeholder="https://github.com/mon-profil"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Portfolio ou Site personnel</span>
                  </label>
                  <input
                    type="url"
                    value={profile.portfolioUrl || ''}
                    onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                    placeholder="https://mon-portfolio.fr"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Résumé Professionnel / Pitch d'accroche */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Résumé Professionnel & Pitch d&apos;accroche
                </label>
                <span className="text-[11px] text-gray-400">
                  {(profile.bio || '').length} caractères (Idéal : 250 - 450 caractères)
                </span>
              </div>
              <textarea
                rows={4}
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Rédigez un résumé percutant de votre valeur ajoutée, de vos réalisations phares et de vos domaines d'excellence..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-sans text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
              />
            </div>

            {/* Compétences clés & Mots-clés ATS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Compétences Clés & Mots-clés ATS Majeurs ({(profile.skills || []).length})
                </label>
                <span className="text-[11px] text-gray-500">
                  Appuyez sur Entrée ou cliquez sur Ajouter
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="Ajouter une compétence (ex: React, SQL, Management, Scrum, Python...)"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              {/* Tags de compétences */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(profile.skills || []).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-xs px-2.5 py-1 rounded-lg font-medium"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-purple-400 hover:text-purple-700 cursor-pointer"
                      title="Supprimer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Métiers et rôles ciblés */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Postes et Métiers Recherchés ({(profile.targetRoles || []).length})
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRole();
                    }
                  }}
                  placeholder="Ajouter un intitulé de poste cible (ex: Lead Tech, Data Analyst, Directeur Financier...)"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {(profile.targetRoles || []).map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs px-2.5 py-1 rounded-lg font-medium"
                  >
                    <span>{role}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
                      title="Supprimer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SOUS-ONGLET 2 : CONFIGURATION API & MODÈLE IA GEMINI
         ========================================================================= */}
      {activeSubTab === 'api' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                <span>Configuration de la Clé API Google Gemini</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cette clé permet d&apos;interroger les modèles d&apos;intelligence artificielle Google Generative AI (Gemini 3.8-Flash) pour l&apos;analyse d&apos;adéquation, l&apos;optimisation ATS et la rédaction assistée.
              </p>
            </div>

            {/* Statut de clé serveur / personnalisée */}
            {apiKey.trim() ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-800">
                    Clé API personnalisée active
                  </div>
                  <p className="text-emerald-700">
                    Votre clé personnalisée est enregistrée localement dans la base IndexedDB de votre navigateur. Elle sera prioritaire pour toutes vos analyses.
                  </p>
                </div>
              </div>
            ) : hasServerKey ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-blue-800">
                    ⚡ Clé Google Studio pré-configurée active
                  </div>
                  <p className="text-blue-700">
                    L&apos;application est immédiatement prête à l&apos;emploi grâce à la clé fournie par l&apos;environnement. Vous n&apos;avez aucune configuration obligatoire à faire. Si vous le souhaitez, vous pouvez renseigner votre propre clé ci-dessous.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-800">
                    Aucune clé API active détectée
                  </div>
                  <p className="text-amber-700">
                    Pour utiliser les fonctionnalités complètes d&apos;analyse et de génération, vous pouvez obtenir une clé d&apos;accès gratuite sur Google AI Studio en quelques secondes.
                  </p>
                </div>
              </div>
            )}

            {/* Champ de saisie de la clé */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  Clé API Google Gemini Personnalisée
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 underline"
                >
                  <span>Obtenir une clé gratuite sur Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="ex: AIzaSyD..."
                  className="w-full text-xs font-mono px-3.5 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title={showApiKey ? 'Masquer la clé' : 'Afficher la clé'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Bouton de sauvegarde explicite demandé par l'utilisateur */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-4 py-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Sauvegarder la clé API</span>
                  </button>

                  {apiKey.trim() && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Supprimer la clé de la mémoire"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Effacer</span>
                    </button>
                  )}
                </div>

                {isKeySavedInStorage ? (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clé mémorisée (chargée automatiquement au démarrage)</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500">
                    Cliquez sur &quot;Sauvegarder la clé API&quot; pour la conserver au prochain démarrage.
                  </span>
                )}
              </div>

              <p className="text-[11px] text-gray-500">
                Votre clé reste strictement confinée dans le stockage local de votre navigateur et n&apos;est jamais partagée publiquement.
              </p>
            </div>

            {/* Sélection du modèle Gemini */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700">
                Sélection du Modèle d&apos;IA Google
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectModel('gemini-3.8-flash')}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedModel === 'gemini-3.8-flash'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                      : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold font-mono">gemini-3.8-flash</span>
                    <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded">
                      Recommandé
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug">
                    Modèle de dernière génération, ultra-rapide et optimisé pour le raisonnement textuel, la méthode STAR et le matching ATS.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectModel('gemini-flash-latest')}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedModel === 'gemini-flash-latest'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                      : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold font-mono">gemini-flash-latest</span>
                    <span className="text-[10px] bg-gray-200 text-gray-700 font-medium px-1.5 py-0.2 rounded">
                      Alias stable
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug">
                    Pointe en permanence vers la révision Flash la plus récente déployée sur les serveurs Google.
                  </p>
                </button>
              </div>
            </div>

            {/* Outil de Test de Connexion en direct */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Test de connectivité en temps réel</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Vérifiez immédiatement la validité de la clé et la latence du modèle sélectionné.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestApiKey}
                  disabled={isTestingApi}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isTestingApi ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Test en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>🧪 Tester la connexion API</span>
                    </>
                  )}
                </button>
              </div>

              {/* Résultat du test */}
              {apiTestResult && (
                <div
                  className={`p-3 rounded-lg border text-xs font-medium flex items-start gap-2.5 animate-fade-in ${
                    apiTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {apiTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-bold">{apiTestResult.message}</div>
                    {apiTestResult.latencyMs && (
                      <div className="text-[11px] text-emerald-700">
                        Temps de réponse du serveur Google : <span className="font-bold font-mono">{apiTestResult.latencyMs} ms</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SOUS-ONGLET 3 : DONNÉES LOCALES & SAUVEGARDES
         ========================================================================= */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span>Base de Données Locale & Sauvegardes Autonomes</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Consultez les métriques de votre base de données locale, exportez une sauvegarde complète au format JSON ou réinitialisez vos données.
              </p>
            </div>

            {/* Statistiques en direct */}
            {dbStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100">
                  <div className="text-2xl font-black text-purple-900">{dbStats.cvsCount}</div>
                  <div className="text-xs text-purple-700 font-semibold mt-0.5">CVs enregistrés</div>
                </div>
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                  <div className="text-2xl font-black text-blue-900">{dbStats.applicationsCount}</div>
                  <div className="text-xs text-blue-700 font-semibold mt-0.5">Candidatures suivies</div>
                </div>
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                  <div className="text-2xl font-black text-emerald-900">{dbStats.analysesCount}</div>
                  <div className="text-xs text-emerald-700 font-semibold mt-0.5">Analyses archivées</div>
                </div>
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100">
                  <div className="text-2xl font-black text-amber-900">{dbStats.suggestionsCount}</div>
                  <div className="text-xs text-amber-700 font-semibold mt-0.5">Suggestions IA</div>
                </div>
              </div>
            )}

            {/* Actions d'export & d'import */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Exporter une sauvegarde complète</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Générez un fichier JSON contenant votre profil candidat, l&apos;intégralité de vos CVs, vos candidatures et vos analyses.
                </p>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger la sauvegarde JSON</span>
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>Accéder au gestionnaire détaillé</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Retrouvez la liste complète de vos CVs enregistrés, vos accomplissements STAR et vos candidatures dans l&apos;onglet Données.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('database')}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Ouvrir l&apos;onglet Données & BDD</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SOUS-ONGLET 4 : DOCUMENTATION TECHNIQUE & CODE PYTHON
         ========================================================================= */}
      {activeSubTab === 'tech' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  <span>Documentation Technique, Code Source & Déploiement</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Consultez et téléchargez le script Python Streamlit autonome (app.py), ses dépendances et le guide d&apos;hébergement.
                </p>
              </div>

              {/* Bascule Code Python / Guide */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTechView('code')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    techView === 'code'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Code Python (app.py)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTechView('guide')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    techView === 'guide'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Guide Déploiement</span>
                </button>
              </div>
            </div>

            {/* Vue 1 : Code Python (app.py & requirements.txt) */}
            {techView === 'code' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-600" />
                      <span>Script Python Streamlit complet (app.py)</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Application Python 3.9+ autonome incluant extraction PDF/DOCX, scraping web d&apos;annonces et audit d&apos;adéquation ATS via l&apos;API Gemini.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(PYTHON_APP_CODE, 'app_py')}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedSnippet === 'app_py' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Copier app.py</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadAppPy}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger app.py</span>
                    </button>
                  </div>
                </div>

                {/* Prévisualisation code app.py */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                    <span className="font-bold text-gray-700">📄 app.py</span>
                    <span>Python 3.9+ • Streamlit & Google GenAI</span>
                  </div>
                  <pre className="bg-gray-950 text-gray-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[460px] leading-relaxed border border-gray-800 shadow-inner">
                    <code>{PYTHON_APP_CODE}</code>
                  </pre>
                </div>

                {/* Prévisualisation requirements.txt */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                    <span className="font-bold text-gray-700">📦 requirements.txt</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(REQUIREMENTS_TXT, 'requirements')}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {copiedSnippet === 'requirements' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="font-bold">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copier requirements.txt</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-gray-950 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-gray-800">
                    <code>{REQUIREMENTS_TXT}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* Vue 2 : Guide Déploiement & ATS */}
            {techView === 'guide' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Terminal className="w-4 h-4 text-emerald-600" />
                      <span>1. Exécution locale (Terminal)</span>
                    </div>
                    <ol className="list-decimal list-inside text-xs text-gray-700 space-y-2 leading-relaxed">
                      <li>
                        Placez <code>app.py</code> et <code>requirements.txt</code> dans un même dossier de votre machine.
                      </li>
                      <li>
                        Ouvrez un terminal et installez les dépendances :
                        <pre className="bg-gray-950 text-gray-100 p-2 rounded mt-1 font-mono text-[11px]">
                          pip install -r requirements.txt
                        </pre>
                      </li>
                      <li>
                        Lancez l&apos;application Streamlit :
                        <pre className="bg-gray-950 text-emerald-400 p-2 rounded mt-1 font-mono text-[11px]">
                          streamlit run app.py
                        </pre>
                      </li>
                      <li>
                        Votre navigateur ouvre l&apos;application à l&apos;adresse <code>http://localhost:8501</code>.
                      </li>
                    </ol>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900">
                    💡 <strong>Pré-requis :</strong> Python 3.9 ou version supérieure installé.
                  </div>
                </div>

                <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <span>2. Déploiement gratuit Streamlit Cloud</span>
                    </div>
                    <ol className="list-decimal list-inside text-xs text-gray-700 space-y-2 leading-relaxed">
                      <li>Déposez <code>app.py</code> et <code>requirements.txt</code> sur un dépôt GitHub.</li>
                      <li>
                        Rendez-vous sur <a href="https://share.streamlit.io" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">share.streamlit.io</a> et connectez-vous avec GitHub.
                      </li>
                      <li>Sélectionnez votre dépôt, la branche principale et le fichier <code>app.py</code>.</li>
                      <li>Cliquez sur <strong>Deploy</strong> : votre application sera en ligne 24h/24 avec URL HTTPS.</li>
                    </ol>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900">
                    🔒 <strong>Sécurité API :</strong> Dans les paramètres Streamlit Cloud, ajoutez votre clé dans <em>Secrets</em> (<code>GEMINI_API_KEY</code>) pour un fonctionnement 100% autonome.
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
