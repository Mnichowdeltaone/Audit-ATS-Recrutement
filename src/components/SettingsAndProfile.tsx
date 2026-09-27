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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { localDbClient } from '../services/localDbClient';
import { UserProfile, DatabaseStats, SavedCv } from '../types';

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
  onProfileUpdated?: (profile: UserProfile) => void;
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
  onProfileUpdated,
}: SettingsAndProfileProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'api' | 'backup'>('profile');
  const [showApiKey, setShowApiKey] = useState(false);

  // Profil Utilisateur State
  const [profile, setProfile] = useState<UserProfile>({
    id: 'user-default',
    firstName: 'Alex',
    lastName: 'Martin',
    email: 'contact@alexmartin.fr',
    phone: '06 12 34 56 78',
    location: 'Paris, France',
    currentTitle: 'Product Owner Senior',
    bio: 'Product Owner passionné cumulant plus de 6 ans d\'expérience dans l\'accélération de solutions SaaS B2B complexes. Spécialiste de la transformation des retours utilisateurs en roadmaps à fort ROI, avec une maîtrise approfondie des cycles Agiles Scrum.',
    linkedinUrl: 'https://linkedin.com/in/alexmartin',
    githubUrl: 'https://github.com/alexmartin',
    portfolioUrl: 'https://alexmartin.fr',
    targetRoles: ['Product Owner Senior', 'Lead Product Manager', 'Chef de Projet Digital'],
    skills: [
      'Agile Scrum (PSPO II)',
      'Gestion de Backlog & User Stories',
      'Amplitude & Mixpanel',
      'Google Analytics 4',
      'Jira & Confluence',
      'Figma & Miro',
      'SQL & Requêtes données',
      'API REST & Webhooks',
    ],
    updatedAt: new Date().toISOString(),
  });

  const [newSkillInput, setNewSkillInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  // Charger le profil depuis la BDD locale au montage
  useEffect(() => {
    localDbClient
      .getProfile()
      .then((loaded) => {
        if (loaded) {
          setProfile((prev) => ({
            ...prev,
            ...loaded,
            targetRoles: loaded.targetRoles || prev.targetRoles,
            skills: loaded.skills || prev.skills,
          }));
        }
      })
      .catch((err) => console.warn('Erreur chargement profil :', err));
  }, []);

  // Sauvegarder le profil
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setNotice(null);
    try {
      const updated: UserProfile = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      await localDbClient.saveProfile(updated);
      setProfile(updated);
      onProfileUpdated?.(updated);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      setNotice({ type: 'success', message: 'Profil utilisateur enregistré avec succès dans la base locale !' });
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

    const header = `${fullName}\n${title}${contactParts.join(' | ')}\n\nRÉSUMÉ PROFESSIONNEL\n${profile.bio || ''}\n\nCOMPÉTENCES CLÉS\n${profile.skills.map((s) => `- ${s}`).join('\n')}\n\n`;

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
    if (trimmed && !profile.skills.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
      setNewSkillInput('');
    }
  };

  // Supprimer une compétence
  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // Ajouter un rôle ciblé
  const handleAddRole = () => {
    const trimmed = newRoleInput.trim();
    if (trimmed && !profile.targetRoles.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        targetRoles: [...prev.targetRoles, trimmed],
      }));
      setNewRoleInput('');
    }
  };

  // Supprimer un rôle ciblé
  const handleRemoveRole = (roleToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.filter((r) => r !== roleToRemove),
    }));
  };

  // Tester la connexion API en direct
  const handleTestApiKey = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      const res = await fetch('/api/test-key', {
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
      {/* Header Paramétrage */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              Paramétrage & Profil Utilisateur
            </h1>
            <span className="text-xs bg-purple-100 text-purple-800 font-semibold px-2.5 py-0.5 rounded-full">
              Configuration Centrale
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-3xl">
            Personnalisez vos informations personnelles, votre clé API Google Gemini et vos préférences d&apos;analyse. Ces données sont stockées de façon sécurisée dans votre navigateur.
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
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span>Informations Personnelles & Identité Professionnelle</span>
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
                  placeholder="Alex"
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
                  placeholder="Martin"
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
                  placeholder="Product Owner Senior | Expert SaaS & Agile"
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
                  placeholder="contact@alexmartin.fr"
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
                  placeholder="06 12 34 56 78"
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
                  placeholder="Paris, France (Télétravail partiel)"
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
                    value={profile.linkedinUrl}
                    onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/alexmartin"
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
                    value={profile.githubUrl}
                    onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                    placeholder="https://github.com/alexmartin"
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
                    value={profile.portfolioUrl}
                    onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                    placeholder="https://alexmartin.fr"
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
                  {profile.bio.length} caractères (Idéal : 250 - 450 caractères)
                </span>
              </div>
              <textarea
                rows={4}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Rédigez un résumé percutant de votre valeur ajoutée, de vos réalisations phares et de vos domaines d'excellence..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-sans text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
              />
            </div>

            {/* Compétences clés & Mots-clés ATS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Compétences Clés & Mots-clés ATS Majeurs ({profile.skills.length})
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
                {profile.skills.map((skill) => (
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
                  Postes et Métiers Recherchés ({profile.targetRoles.length})
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
                {profile.targetRoles.map((role) => (
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
            <div className="space-y-2">
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
                  onChange={(e) => setApiKey(e.target.value)}
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

              <p className="text-[11px] text-gray-500">
                Votre clé reste strictement confinée dans votre session et n&apos;est jamais partagée publiquement.
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
                  onClick={() => setSelectedModel('gemini-3.8-flash')}
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
                  onClick={() => setSelectedModel('gemini-flash-latest')}
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

    </div>
  );
}
