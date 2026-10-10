import type {
  DatabaseSchema,
  UserProfile,
  SavedCv,
  ApplicationItem,
  AnalysisHistoryItem,
  SavedSuggestion,
  SavedCoverLetter,
  UserSettings,
  DatabaseStats,
} from '../types';
import { extractCompanyDossier } from '../utils/companyDossierExtractor';

const IDB_NAME = 'cv_move_personnel_local_db';
const IDB_VERSION = 1;
const IDB_STORE = 'app_state';

// Helper pour ouvrir IndexedDB côté navigateur
function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non supporté'));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setIdbCache(key: string, value: unknown): Promise<void> {
  try {
    const db = await openIndexedDb();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ key, value, timestamp: Date.now() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch {
    // Fallback localStorage
  }
}

async function clearIdbCache(): Promise<void> {
  try {
    const db = await openIndexedDb();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch {
    // Fallback
  }
}

async function getIdbCache<T>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDb();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Helpers directs et synchrones pour le stockage local du navigateur
function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item !== null && item.trim() !== '' && item !== 'undefined' && item !== 'null') {
      return JSON.parse(item) as T;
    }
  } catch (err) {
    console.warn(`Erreur lecture ${key} :`, err);
  }
  return defaultValue;
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Erreur écriture ${key} :`, err);
  }
}

// Filtre pour éliminer toute donnée de démonstration (Thomas Laurent, Alexandre Laurent, demo-app, etc.)
function filterOutDemoCv(cv: SavedCv): boolean {
  if (!cv || !cv.id) return false;
  if (cv.id === 'cv-default-1' || cv.id === 'cv-tech-2' || cv.id.startsWith('demo-') || (cv as any).isDemo) return false;
  const raw = (cv.rawText || '').toUpperCase();
  if (
    raw.includes('THOMAS DUPONT') ||
    raw.includes('CLARA MARTIN') ||
    raw.includes('MAXIME LEROY') ||
    raw.includes('THOMAS LAURENT') ||
    raw.includes('ALEXANDRE LAURENT') ||
    raw.includes('PROFIL CANDIDAT FICTIF')
  ) {
    return false;
  }
  return true;
}

function filterOutDemoApp(app: ApplicationItem): boolean {
  if (!app || !app.id) return false;
  if (
    app.id.startsWith('demo-') ||
    app.id.startsWith('app-sample-') ||
    app.id.startsWith('sample-') ||
    app.id === 'app-1' ||
    app.id === 'app-2' ||
    app.id === 'app-3' ||
    (app as any).isDemo === true
  ) {
    return false;
  }
  return true;
}

function filterOutDemoAnalysis(item: AnalysisHistoryItem): boolean {
  if (!item || !item.id) return false;
  if (item.id.startsWith('sample-') || item.id.startsWith('demo-') || (item as any).isDemo) return false;
  const cv = (item.cvText || '').toUpperCase();
  if (
    cv.includes('THOMAS DUPONT') ||
    cv.includes('CLARA MARTIN') ||
    cv.includes('MAXIME LEROY') ||
    cv.includes('THOMAS LAURENT') ||
    cv.includes('ALEXANDRE LAURENT') ||
    cv.includes('PROFIL CANDIDAT FICTIF')
  ) {
    return false;
  }
  return true;
}

export const localDbClient = {
  // CLÉ API & MODÈLE IA (PERSISTANTS DANS LE NAVIGATEUR)
  getSavedApiKey(): string {
    try {
      return (
        localStorage.getItem('cv_move_gemini_api_key') ||
        localStorage.getItem('gemini_api_key') ||
        ''
      );
    } catch {
      return '';
    }
  },

  saveApiKey(key: string): void {
    try {
      const clean = (key || '').trim();
      if (clean) {
        localStorage.setItem('cv_move_gemini_api_key', clean);
        localStorage.setItem('gemini_api_key', clean);
      } else {
        localStorage.removeItem('cv_move_gemini_api_key');
        localStorage.removeItem('gemini_api_key');
      }
    } catch (e) {
      console.warn('Erreur sauvegarde clé API :', e);
    }
  },

  getSavedModel(): string {
    try {
      return localStorage.getItem('cv_move_selected_model') || 'gemini-3.8-flash';
    } catch {
      return 'gemini-3.8-flash';
    }
  },

  saveModel(model: string): void {
    try {
      if (model) {
        localStorage.setItem('cv_move_selected_model', model);
      }
    } catch (e) {
      console.warn('Erreur sauvegarde modèle :', e);
    }
  },

  // STATISTIQUES EN DIRECT
  async fetchStats(): Promise<DatabaseStats> {
    const cvs = this.getLocalCvs();
    const applications = this.getLocalApplications();
    const analyses = this.getLocalAnalyses();
    const suggestions = getStorage<SavedSuggestion[]>('cv_move_suggestions', []);
    const coverLetters = this.getLocalCoverLetters();

    return {
      cvsCount: cvs.length,
      applicationsCount: applications.length,
      analysesCount: analyses.length,
      suggestionsCount: suggestions.length,
      coverLettersCount: coverLetters.length,
      dbSizeBytes: JSON.stringify({ cvs, applications, analyses, suggestions, coverLetters }).length,
      lastUpdated: new Date().toISOString(),
    };
  },

  // BASE DE DONNÉES COMPLÈTE
  async fetchAll(): Promise<DatabaseSchema | null> {
    const profile = await this.getProfile();
    const cvs = await this.getCvs();
    const applications = await this.getApplications();
    const analyses = await this.getAnalyses();
    const suggestions = await this.getSuggestions();
    const coverLetters = await this.getCoverLetters();
    const settings = await this.getSettings();

    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      profile: profile || {
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
      },
      cvs,
      applications,
      analyses,
      suggestions,
      coverLetters,
      settings,
    };
  },

  // ==========================================
  // MULTI-PROFILS UTILISATEUR
  // ==========================================
  getLocalProfile(): UserProfile | null {
    const p = getStorage<UserProfile | null>('cv_move_user_profile', null);
    if (p && p.firstName === 'Alex' && p.lastName === 'Martin' && p.email?.includes('alex.martin')) {
      return null;
    }
    return p;
  },

  getLocalProfiles(): UserProfile[] {
    const list = getStorage<UserProfile[]>('cv_move_user_profiles', []);
    return list.filter((p) => !(p.firstName === 'Alex' && p.lastName === 'Martin'));
  },

  async getProfile(): Promise<UserProfile | null> {
    const local = this.getLocalProfile();
    if (local && (local.firstName || local.lastName)) {
      return local;
    }

    try {
      const res = await fetch('/api/db/profile');
      if (res.ok) {
        const serverProfile = (await res.json()) as UserProfile;
        if (serverProfile && (serverProfile.firstName || serverProfile.lastName) && serverProfile.firstName !== 'Alex') {
          setStorage('cv_move_user_profile', serverProfile);
          await setIdbCache('user_profile', serverProfile);
          return serverProfile;
        }
      }
    } catch (err) {
      console.warn('Erreur getProfile serveur :', err);
    }

    return local;
  },

  async getProfiles(): Promise<UserProfile[]> {
    const localList = this.getLocalProfiles();

    try {
      const res = await fetch('/api/db/profiles');
      if (res.ok) {
        const serverProfiles = (await res.json()) as UserProfile[];
        const cleanServer = serverProfiles.filter((p) => !(p.firstName === 'Alex' && p.lastName === 'Martin'));

        const map = new Map<string, UserProfile>();
        for (const p of cleanServer) {
          map.set(p.id, p);
        }
        for (const p of localList) {
          if (!map.has(p.id)) {
            map.set(p.id, p);
            fetch('/api/db/profiles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p),
            }).catch(() => {});
          }
        }

        const merged = Array.from(map.values());
        setStorage('cv_move_user_profiles', merged);
        await setIdbCache('user_profiles', merged);

        // Assurer qu'il y a un profil actif synchronisé
        const defaultProfile = merged.find((p) => p.isDefault) || merged[0];
        if (defaultProfile) {
          setStorage('cv_move_user_profile', defaultProfile);
          await setIdbCache('user_profile', defaultProfile);
        }

        return merged;
      }
    } catch (err) {
      console.warn('Erreur getProfiles serveur :', err);
    }

    if (localList.length === 0) {
      const single = this.getLocalProfile();
      if (single) return [single];
    }

    return localList;
  },

  async saveProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const allProfiles = this.getLocalProfiles();
    const existing = profile.id ? allProfiles.find((p) => p.id === profile.id) : null;

    const base: UserProfile = existing || {
      id: profile.id || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: profile.name || profile.currentTitle || 'Nouveau Profil',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
    };

    const updated: UserProfile = {
      ...base,
      ...profile,
      id: profile.id || base.id || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: profile.name || base.name || profile.currentTitle || 'Mon Profil',
      updatedAt: new Date().toISOString(),
    };

    // Mise à jour de la liste multi-profils
    const existingIdx = allProfiles.findIndex((p) => p.id === updated.id);

    let updatedList: UserProfile[];
    if (existingIdx >= 0) {
      updatedList = allProfiles.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
    } else {
      updatedList = [updated, ...allProfiles];
    }

    if (updated.isDefault || updatedList.length === 1) {
      updated.isDefault = true;
      updatedList = updatedList.map((p) => ({
        ...p,
        isDefault: p.id === updated.id,
      }));
    }

    // 1. Sauvegarde locale synchrone immédiate (profil actif si par défaut ou s'il correspond au profil actif actuel)
    const currentActive = this.getLocalProfile();
    if (updated.isDefault || !currentActive || currentActive.id === updated.id) {
      setStorage('cv_move_user_profile', updated);
      await setIdbCache('user_profile', updated);
    }

    // 2. Mise à jour de la liste
    setStorage('cv_move_user_profiles', updatedList);
    await setIdbCache('user_profiles', updatedList);

    // 3. Synchronisation serveur
    try {
      await fetch('/api/db/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.warn('Erreur saveProfile serveur :', err);
    }

    return updated;
  },

  async setDefaultProfile(id: string): Promise<UserProfile | null> {
    const allProfiles = this.getLocalProfiles();
    let target: UserProfile | null = null;

    const updatedList = allProfiles.map((p) => {
      const isDef = p.id === id;
      if (isDef) target = { ...p, isDefault: true };
      return { ...p, isDefault: isDef };
    });

    if (target) {
      setStorage('cv_move_user_profile', target);
      setStorage('cv_move_user_profiles', updatedList);
      await setIdbCache('user_profile', target);
      await setIdbCache('user_profiles', updatedList);

      try {
        await fetch(`/api/db/profiles/${id}/set-default`, { method: 'POST' });
      } catch (err) {
        console.warn('Erreur setDefaultProfile serveur :', err);
      }
    }

    return target;
  },

  async deleteProfile(id: string): Promise<boolean> {
    // 1. Suppression serveur en premier pour éviter que getProfiles() ne le ressuscite
    try {
      await fetch(`/api/db/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Erreur deleteProfile serveur :', err);
    }

    // 2. Filtrage local
    const allProfiles = this.getLocalProfiles();
    const filtered = allProfiles.filter((p) => p.id !== id);

    let newDefault: UserProfile;
    if (filtered.length > 0) {
      newDefault = filtered.find((p) => p.isDefault) || filtered[0];
      newDefault = { ...newDefault, isDefault: true };
      const finalizedList = filtered.map((p) => ({
        ...p,
        isDefault: p.id === newDefault.id,
      }));
      setStorage('cv_move_user_profile', newDefault);
      setStorage('cv_move_user_profiles', finalizedList);
      await setIdbCache('user_profile', newDefault);
      await setIdbCache('user_profiles', finalizedList);
    } else {
      newDefault = {
        id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      };
      setStorage('cv_move_user_profile', newDefault);
      setStorage('cv_move_user_profiles', [newDefault]);
      await setIdbCache('user_profile', newDefault);
      await setIdbCache('user_profiles', [newDefault]);
    }

    return true;
  },

  // ==========================================
  // CVS ENREGISTRÉS
  // ==========================================
  getLocalCvs(): SavedCv[] {
    const raw = getStorage<SavedCv[]>('cv_move_saved_cvs', []);
    return raw.filter(filterOutDemoCv);
  },

  async getCvs(): Promise<SavedCv[]> {
    const localCvs = this.getLocalCvs();

    try {
      const res = await fetch('/api/db/cvs');
      if (res.ok) {
        const serverCvs = (await res.json()) as SavedCv[];
        const cleanServer = serverCvs.filter(filterOutDemoCv);

        const map = new Map<string, SavedCv>();
        for (const cv of cleanServer) {
          map.set(cv.id, cv);
        }
        for (const cv of localCvs) {
          if (!map.has(cv.id)) {
            map.set(cv.id, cv);
            fetch('/api/db/cvs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cv),
            }).catch(() => {});
          }
        }

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
        );

        setStorage('cv_move_saved_cvs', merged);
        localStorage.setItem('cv_move_cvs_initialized', 'true');
        await setIdbCache('saved_cvs', merged);
        return merged;
      }
    } catch (err) {
      console.warn('Erreur getCvs serveur :', err);
    }

    return localCvs;
  },

  async saveCv(cv: SavedCv): Promise<SavedCv> {
    const current = this.getLocalCvs();
    const filtered = current.filter((c) => c.id !== cv.id);
    const updated = [cv, ...filtered];

    setStorage('cv_move_saved_cvs', updated);
    localStorage.setItem('cv_move_cvs_initialized', 'true');
    await setIdbCache('saved_cvs', updated);

    try {
      await fetch('/api/db/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cv),
      });
    } catch (err) {
      console.warn('Erreur saveCv serveur :', err);
    }

    return cv;
  },

  async deleteCv(id: string): Promise<boolean> {
    const current = this.getLocalCvs();
    const updated = current.filter((c) => c.id !== id);

    setStorage('cv_move_saved_cvs', updated);
    localStorage.setItem('cv_move_cvs_initialized', 'true');
    await setIdbCache('saved_cvs', updated);

    try {
      await fetch(`/api/db/cvs/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Erreur deleteCv serveur :', err);
    }

    return true;
  },

  async setDefaultCv(id: string): Promise<SavedCv | null> {
    const current = this.getLocalCvs();
    let target: SavedCv | null = null;
    const updated = current.map((c) => {
      const isDef = c.id === id;
      if (isDef) target = { ...c, isDefault: true };
      return { ...c, isDefault: isDef };
    });

    setStorage('cv_move_saved_cvs', updated);
    await setIdbCache('saved_cvs', updated);

    try {
      await fetch(`/api/db/cvs/${id}/set-default`, { method: 'POST' });
    } catch (err) {
      console.warn('Erreur setDefaultCv serveur :', err);
    }

    return target;
  },

  // ==========================================
  // CANDIDATURES
  // ==========================================
  getLocalApplications(): ApplicationItem[] {
    const raw = getStorage<ApplicationItem[]>('cv_move_applications', []);
    return raw.filter(filterOutDemoApp);
  },

  async getApplications(): Promise<ApplicationItem[]> {
    const localApps = this.getLocalApplications();

    try {
      const res = await fetch('/api/db/applications');
      if (res.ok) {
        const serverApps = (await res.json()) as ApplicationItem[];
        const cleanServer = serverApps.filter(filterOutDemoApp);

        // Fusionner sans doublons
        const map = new Map<string, ApplicationItem>();
        for (const app of cleanServer) {
          map.set(app.id, app);
        }
        for (const app of localApps) {
          if (!map.has(app.id)) {
            map.set(app.id, app);
            // Sauvegarder sur le serveur les candidatures locales manquantes
            fetch('/api/db/applications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(app),
            }).catch(() => {});
          }
        }

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
        );

        setStorage('cv_move_applications', merged);
        localStorage.setItem('cv_move_apps_initialized', 'true');
        await setIdbCache('applications', merged);
        return merged;
      }
    } catch (err) {
      console.warn('Erreur getApplications serveur :', err);
    }

    // Par défaut, retourner les candidatures réelles locales
    setStorage('cv_move_applications', localApps);
    localStorage.setItem('cv_move_apps_initialized', 'true');
    return localApps;
  },

  async saveApplication(app: ApplicationItem): Promise<ApplicationItem> {
    if (!filterOutDemoApp(app)) {
      return app;
    }
    const current = this.getLocalApplications();
    const filtered = current.filter((a) => a.id !== app.id);
    const updated = [app, ...filtered];

    setStorage('cv_move_applications', updated);
    localStorage.setItem('cv_move_apps_initialized', 'true');
    await setIdbCache('applications', updated);

    try {
      await fetch('/api/db/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app),
      });
    } catch (err) {
      console.warn('Erreur saveApplication serveur :', err);
    }

    return app;
  },

  async deleteApplication(id: string): Promise<boolean> {
    const current = this.getLocalApplications();
    const updated = current.filter((a) => a.id !== id);

    setStorage('cv_move_applications', updated);
    localStorage.setItem('cv_move_apps_initialized', 'true');
    await setIdbCache('applications', updated);

    try {
      await fetch(`/api/db/applications/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Erreur deleteApplication serveur :', err);
    }

    return true;
  },

  // ==========================================
  // HISTORIQUE DES ANALYSES
  // ==========================================
  getLocalAnalyses(): AnalysisHistoryItem[] {
    const raw = getStorage<AnalysisHistoryItem[]>('cv_move_history', []);
    const clean = raw.filter(filterOutDemoAnalysis);
    return clean.map((item) => {
      if (!item.companyDossier && (item.analysisResult || item.jobText)) {
        item.companyDossier = extractCompanyDossier(
          item.analysisResult,
          item.jobText,
          item.company || item.cabinet,
          item.role
        );
      }
      return item;
    });
  },

  async getAnalyses(): Promise<AnalysisHistoryItem[]> {
    const local = this.getLocalAnalyses();

    try {
      const res = await fetch('/api/db/analyses');
      if (res.ok) {
        const serverList = (await res.json()) as AnalysisHistoryItem[];
        const cleanServer = serverList.filter(filterOutDemoAnalysis);

        const map = new Map<string, AnalysisHistoryItem>();
        for (const item of cleanServer) {
          map.set(item.id, item);
        }
        for (const item of local) {
          if (!map.has(item.id)) {
            map.set(item.id, item);
            fetch('/api/db/analyses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            }).catch(() => {});
          }
        }

        const merged = Array.from(map.values());
        setStorage('cv_move_history', merged);
        localStorage.setItem('cv_move_history_initialized', 'true');
        return merged;
      }
    } catch (err) {
      console.warn('Erreur getAnalyses serveur :', err);
    }

    setStorage('cv_move_history', local);
    localStorage.setItem('cv_move_history_initialized', 'true');
    return local;
  },

  async saveAnalysis(item: AnalysisHistoryItem): Promise<AnalysisHistoryItem> {
    const current = this.getLocalAnalyses();
    const filtered = current.filter((a) => a.id !== item.id);
    const updated = [item, ...filtered];

    setStorage('cv_move_history', updated);
    localStorage.setItem('cv_move_history_initialized', 'true');

    try {
      await fetch('/api/db/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    } catch (err) {
      console.warn('Erreur saveAnalysis serveur :', err);
    }

    return item;
  },

  async renameAnalysis(id: string, newTitle: string): Promise<AnalysisHistoryItem | null> {
    const current = this.getLocalAnalyses();
    const item = current.find((a) => a.id === id);
    if (!item) return null;

    const updatedItem: AnalysisHistoryItem = {
      ...item,
      title: newTitle.trim(),
      customTitle: newTitle.trim(),
    };

    await this.saveAnalysis(updatedItem);
    return updatedItem;
  },

  async deleteAnalysis(id: string): Promise<boolean> {
    const current = this.getLocalAnalyses();
    const updated = current.filter((a) => a.id !== id);

    setStorage('cv_move_history', updated);
    localStorage.setItem('cv_move_history_initialized', 'true');

    try {
      await fetch(`/api/db/analyses/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Erreur deleteAnalysis serveur :', err);
    }

    return true;
  },

  async clearAnalyses(): Promise<boolean> {
    setStorage('cv_move_history', []);
    localStorage.setItem('cv_move_history_initialized', 'true');

    try {
      await fetch('/api/db/analyses', { method: 'DELETE' });
    } catch (err) {
      console.warn('Erreur clearAnalyses serveur :', err);
    }

    return true;
  },

  // ==========================================
  // SUGGESTIONS
  // ==========================================
  async getSuggestions(): Promise<SavedSuggestion[]> {
    const local = getStorage<SavedSuggestion[]>('cv_move_suggestions', []);
    try {
      const res = await fetch('/api/db/suggestions');
      if (res.ok) {
        const serverList = (await res.json()) as SavedSuggestion[];
        if (serverList.length > 0 && local.length === 0) {
          setStorage('cv_move_suggestions', serverList);
          return serverList;
        }
      }
    } catch {
      // Ignorer
    }
    return local;
  },

  async saveSuggestion(sugg: SavedSuggestion): Promise<SavedSuggestion> {
    const current = getStorage<SavedSuggestion[]>('cv_move_suggestions', []);
    const filtered = current.filter((s) => s.id !== sugg.id);
    const updated = [sugg, ...filtered];

    setStorage('cv_move_suggestions', updated);

    try {
      await fetch('/api/db/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sugg),
      });
    } catch {
      // Ignorer
    }

    return sugg;
  },

  async deleteSuggestion(id: string): Promise<boolean> {
    const current = getStorage<SavedSuggestion[]>('cv_move_suggestions', []);
    const updated = current.filter((s) => s.id !== id);
    setStorage('cv_move_suggestions', updated);

    try {
      await fetch(`/api/db/suggestions/${id}`, { method: 'DELETE' });
    } catch {
      // Ignorer
    }
    return true;
  },

  // ==========================================
  // LETTRES DE MOTIVATION (COVER LETTERS)
  // ==========================================
  getLocalCoverLetters(): SavedCoverLetter[] {
    return getStorage<SavedCoverLetter[]>('cv_move_cover_letters', []);
  },

  async getCoverLetters(): Promise<SavedCoverLetter[]> {
    const local = this.getLocalCoverLetters();
    try {
      const res = await fetch('/api/db/cover-letters');
      if (res.ok) {
        const serverList = (await res.json()) as SavedCoverLetter[];
        const map = new Map<string, SavedCoverLetter>();
        for (const l of serverList) map.set(l.id, l);
        for (const l of local) {
          if (!map.has(l.id)) {
            map.set(l.id, l);
            fetch('/api/db/cover-letters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(l),
            }).catch(() => {});
          }
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
        );
        setStorage('cv_move_cover_letters', merged);
        await setIdbCache('cover_letters', merged);
        return merged;
      }
    } catch (err) {
      console.warn('Erreur getCoverLetters serveur :', err);
    }
    return local;
  },

  async saveCoverLetter(letter: SavedCoverLetter): Promise<SavedCoverLetter> {
    const current = this.getLocalCoverLetters();
    const filtered = current.filter((l) => l.id !== letter.id);
    const updated = [letter, ...filtered];

    setStorage('cv_move_cover_letters', updated);
    await setIdbCache('cover_letters', updated);

    // Si rattachée à un audit, synchroniser l'analyse correspondante
    if (letter.analysisId) {
      const analyses = this.getLocalAnalyses();
      let targetAnalysis: AnalysisHistoryItem | null = null;
      const updatedAnalyses = analyses.map((a) => {
        if (a.id === letter.analysisId) {
          const synced: AnalysisHistoryItem = {
            ...a,
            coverLetterId: letter.id,
            coverLetterTitle: letter.title,
            coverLetterContent: letter.content,
          };
          targetAnalysis = synced;
          return synced;
        }
        return a;
      });
      setStorage('cv_move_history', updatedAnalyses);
      await setIdbCache('analyses', updatedAnalyses);

      if (targetAnalysis) {
        fetch('/api/db/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetAnalysis),
        }).catch((e) => console.warn('Erreur synchro analyse serveur :', e));
      }

      try {
        window.dispatchEvent(
          new CustomEvent('cv_move_analysis_updated', {
            detail: { analysisId: letter.analysisId, letter },
          })
        );
      } catch {}
    }

    // Si rattachée à une candidature, synchroniser la candidature Kanban correspondante
    if (letter.applicationId) {
      const apps = this.getLocalApplications();
      const updatedApps = apps.map((app) => {
        if (app.id === letter.applicationId) {
          return {
            ...app,
            coverLetter: letter.content,
            coverLetterTitle: letter.title,
            checklist: { ...app.checklist, coverLetterSent: true },
          };
        }
        return app;
      });
      setStorage('cv_move_applications', updatedApps);
      await setIdbCache('applications', updatedApps);
    }

    try {
      await fetch('/api/db/cover-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letter),
      });
    } catch (err) {
      console.warn('Erreur saveCoverLetter serveur :', err);
    }

    return letter;
  },

  // Trouver la lettre rattachée à un audit (par son ID d'audit ou par correspondance d'entreprise)
  getCoverLetterForAnalysis(analysisId?: string | null, companyName?: string | null): SavedCoverLetter | null {
    // 1. Recherche directe dans l'analyse elle-même si elle stocke déjà la lettre
    if (analysisId) {
      const analyses = this.getLocalAnalyses();
      const matchedAnalysis = analyses.find((a) => a.id === analysisId);
      if (matchedAnalysis && matchedAnalysis.coverLetterContent) {
        return {
          id: matchedAnalysis.coverLetterId || `letter-${matchedAnalysis.id}`,
          title: matchedAnalysis.coverLetterTitle || `Lettre - ${matchedAnalysis.company || matchedAnalysis.title}`,
          company: matchedAnalysis.company || companyName || 'Entreprise Cible',
          role: matchedAnalysis.role || 'Poste Cible',
          content: matchedAnalysis.coverLetterContent,
          analysisId: matchedAnalysis.id,
          createdAt: matchedAnalysis.timestamp,
          updatedAt: matchedAnalysis.timestamp,
        };
      }
    }

    const list = this.getLocalCoverLetters();

    // 2. Recherche par ID direct de l'audit dans les lettres
    if (analysisId && list && list.length > 0) {
      const directMatch = list.find((l) => l.analysisId === analysisId);
      if (directMatch) return directMatch;
    }

    // 3. Recherche par correspondance d'entreprise / intitulé si pas de lien direct explicite
    if (companyName && companyName.trim() && list && list.length > 0) {
      const normalizedTarget = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedTarget.length > 2) {
        const companyMatch = list.find((l) => {
          const lCompany = (l.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const lTitle = (l.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return (
            (lCompany.length > 2 && (lCompany.includes(normalizedTarget) || normalizedTarget.includes(lCompany))) ||
            (lTitle.length > 2 && lTitle.includes(normalizedTarget))
          );
        });
        if (companyMatch) return companyMatch;
      }
    }

    // 4. Recherche dans les candidatures Kanban si une lettre existe pour cette entreprise
    if (companyName && companyName.trim()) {
      const apps = this.getLocalApplications();
      const normalizedTarget = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedApp = apps.find((app) => {
        if (!app.coverLetter || !app.coverLetter.trim()) return false;
        const appCompany = (app.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return appCompany.length > 2 && (appCompany.includes(normalizedTarget) || normalizedTarget.includes(appCompany));
      });
      if (matchedApp && matchedApp.coverLetter) {
        return {
          id: `letter-app-${matchedApp.id}`,
          title: matchedApp.coverLetterTitle || `Lettre - ${matchedApp.company}`,
          company: matchedApp.company,
          role: matchedApp.role,
          content: matchedApp.coverLetter,
          applicationId: matchedApp.id,
          analysisId: analysisId || undefined,
          createdAt: matchedApp.appliedDate || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return null;
  },

  // Récupérer l'ensemble exhaustif des lettres disponibles (BDD locale + Candidatures Kanban + Analyses + Modèles)
  getAllAvailableCoverLetters(): SavedCoverLetter[] {
    const list = this.getLocalCoverLetters();
    const map = new Map<string, SavedCoverLetter>();

    // 1. Lettres de la table coverLetters
    for (const l of list) {
      if (l.content && l.content.trim()) {
        map.set(l.id, l);
      }
    }

    // 2. Lettres associées aux candidatures Kanban
    const apps = this.getLocalApplications();
    for (const app of apps) {
      if (app.coverLetter && app.coverLetter.trim()) {
        const id = `letter-app-${app.id}`;
        if (!map.has(id)) {
          map.set(id, {
            id,
            title: app.coverLetterTitle || `Lettre - ${app.company} (${app.role})`,
            company: app.company,
            role: app.role,
            content: app.coverLetter.trim(),
            applicationId: app.id,
            createdAt: app.appliedDate || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    // 3. Lettres associées aux analyses passées
    const analyses = this.getLocalAnalyses();
    for (const an of analyses) {
      if (an.coverLetterContent && an.coverLetterContent.trim()) {
        const id = an.coverLetterId || `letter-an-${an.id}`;
        if (!map.has(id)) {
          map.set(id, {
            id,
            title: an.coverLetterTitle || `Lettre - ${an.company || an.title}`,
            company: an.company || 'Entreprise Cible',
            role: an.role || 'Poste Cible',
            content: an.coverLetterContent.trim(),
            analysisId: an.id,
            createdAt: an.timestamp || new Date().toISOString(),
            updatedAt: an.timestamp || new Date().toISOString(),
          });
        }
      }
    }

    // 4. Modèle dédié pour Valoria Capital (si aucune lettre n'existe pour Valoria)
    const hasValoria = Array.from(map.values()).some(
      (l) => l.company && l.company.toLowerCase().includes('valoria')
    );
    if (!hasValoria) {
      const valoriaTemplate: SavedCoverLetter = {
        id: 'letter-template-valoria',
        title: 'Lettre de Motivation - Valoria Capital (Responsable Financier / Trésorier)',
        company: 'Valoria Capital',
        role: 'Responsable Financier / Trésorier Opérationnel',
        content: `Madame, Monsieur,\n\nC’est avec un vif intérêt que je vous adresse ma candidature pour le poste de Responsable Financier / Trésorier au sein de Valoria Capital.\n\nFort de plus de 14 années d'expérience en gestion de trésorerie opérationnelle, cash pooling et déploiement de solutions TMS (Agicap, Pennylane), j'ai développé une expertise solide pour structurer les prévisions de cash, fiabiliser les arrêtés périodiques et sécuriser l'ensemble des flux bancaires (EBICS, SEPA).\n\nRejoindre Valoria Capital représente pour moi l'opportunité de mettre mon sens de l'analyse, ma rigueur technique et ma posture « business partner » au service de votre croissance et de vos participations.\n\nJe reste à votre entière disposition pour échanger lors d'un entretien.\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      map.set(valoriaTemplate.id, valoriaTemplate);
    }

    return Array.from(map.values());
  },

  // Rattacher formellement une lettre existante à un audit
  async linkCoverLetterToAnalysis(
    letterOrId: string | SavedCoverLetter,
    analysisId: string
  ): Promise<SavedCoverLetter | null> {
    let letterToLink: SavedCoverLetter | null = null;

    if (typeof letterOrId === 'string') {
      const allLetters = this.getAllAvailableCoverLetters();
      letterToLink = allLetters.find((l) => l.id === letterOrId) || null;
      if (!letterToLink) return null;
    } else {
      letterToLink = letterOrId;
    }

    const updatedLetter: SavedCoverLetter = {
      ...letterToLink,
      id: letterToLink.id.startsWith('letter-template-') ? `letter-${Date.now()}` : letterToLink.id,
      analysisId,
      updatedAt: new Date().toISOString(),
    };

    return await this.saveCoverLetter(updatedLetter);
  },

  // Détacher une lettre d'un audit
  async unlinkCoverLetterFromAnalysis(analysisId: string): Promise<boolean> {
    // 1. Mettre à jour l'analyse
    const analyses = this.getLocalAnalyses();
    let updatedAnalysis: AnalysisHistoryItem | null = null;
    const cleanAnalyses = analyses.map((a) => {
      if (a.id === analysisId) {
        const cleaned: AnalysisHistoryItem = {
          ...a,
          coverLetterId: undefined,
          coverLetterTitle: undefined,
          coverLetterContent: undefined,
        };
        updatedAnalysis = cleaned;
        return cleaned;
      }
      return a;
    });

    setStorage('cv_move_history', cleanAnalyses);
    await setIdbCache('analyses', cleanAnalyses);

    if (updatedAnalysis) {
      fetch('/api/db/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAnalysis),
      }).catch((e) => console.warn('Erreur unlink analyse serveur :', e));
    }

    // 2. Mettre à jour la lettre de motivation correspondante si présente
    const letters = this.getLocalCoverLetters();
    const updatedLetters = letters.map((l) => {
      if (l.analysisId === analysisId) {
        return {
          ...l,
          analysisId: undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return l;
    });
    setStorage('cv_move_cover_letters', updatedLetters);
    await setIdbCache('cover_letters', updatedLetters);

    try {
      window.dispatchEvent(
        new CustomEvent('cv_move_analysis_updated', {
          detail: { analysisId, letter: null },
        })
      );
    } catch {}

    return true;
  },

  async deleteCoverLetter(id: string): Promise<boolean> {
    const current = this.getLocalCoverLetters();
    const target = current.find((l) => l.id === id);
    const updated = current.filter((l) => l.id !== id);
    setStorage('cv_move_cover_letters', updated);
    await setIdbCache('cover_letters', updated);

    // Si cette lettre était rattachée à un audit, nettoyer l'analyse
    if (target && target.analysisId) {
      await this.unlinkCoverLetterFromAnalysis(target.analysisId);
    }

    try {
      await fetch(`/api/db/cover-letters/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Erreur deleteCoverLetter serveur :', err);
    }

    return true;
  },

  // ==========================================
  // PARAMÈTRES
  // ==========================================
  async getSettings(): Promise<UserSettings> {
    const local = getStorage<UserSettings | null>('cv_move_user_settings', null);
    if (local) return local;

    try {
      const res = await fetch('/api/db/settings');
      if (res.ok) {
        const s = (await res.json()) as UserSettings;
        setStorage('cv_move_user_settings', s);
        return s;
      }
    } catch {
      // Ignorer
    }

    return {
      selectedModel: 'gemini-3.8-flash',
      autoSaveToDb: true,
      backupFrequency: 'weekly',
    };
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    setStorage('cv_move_user_settings', updated);

    try {
      await fetch('/api/db/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      // Ignorer
    }

    return updated;
  },

  // IMPORT / RESTORE / RESET
  async importDatabase(data: Partial<DatabaseSchema>): Promise<DatabaseSchema> {
    if (data.cvs) setStorage('cv_move_saved_cvs', data.cvs);
    if (data.applications) setStorage('cv_move_applications', data.applications);
    if (data.profile) setStorage('cv_move_user_profile', data.profile);
    if (data.analyses) setStorage('cv_move_history', data.analyses);
    if (data.suggestions) setStorage('cv_move_suggestions', data.suggestions);
    if (data.coverLetters) setStorage('cv_move_cover_letters', data.coverLetters);

    const res = await fetch('/api/db/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error("Échec de l'importation");
    }
    const json = await res.json();
    return json.data;
  },

  async resetDatabase(): Promise<DatabaseSchema> {
    // 1. Vider le cache IndexedDB
    await clearIdbCache();

    // 2. Vider toutes les clés localStorage
    const keysToRemove = [
      'cv_move_gemini_api_key',
      'gemini_api_key',
      'cv_move_saved_cvs',
      'cv_move_applications',
      'cv_move_user_profile',
      'cv_move_user_profiles',
      'cv_move_history',
      'cv_move_suggestions',
      'cv_move_cover_letters',
      'cv_move_current_cv_text',
      'cv_move_current_job_text',
      'cv_move_current_job_url',
      'cv_move_interactive_checklist',
      'cv_move_apps_initialized',
      'cv_move_cvs_initialized',
      'cv_move_history_initialized',
    ];
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }

    // 3. Forcer les collections locales à un tableau vide synchrone
    setStorage('cv_move_saved_cvs', []);
    setStorage('cv_move_applications', []);
    setStorage('cv_move_history', []);
    setStorage('cv_move_suggestions', []);
    setStorage('cv_move_cover_letters', []);
    setStorage('cv_move_user_profiles', []);
    setStorage('cv_move_user_profile', null);

    // 4. Appel serveur pour réinitialiser la BDD persistée
    const res = await fetch('/api/db/reset', { method: 'POST' });
    if (!res.ok) {
      throw new Error('Échec de la réinitialisation');
    }
    const json = await res.json();

    // 5. Diffuser l'événement global pour avertir tous les composants
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cv_move_database_reset'));
    }

    return json.data;
  },
};
