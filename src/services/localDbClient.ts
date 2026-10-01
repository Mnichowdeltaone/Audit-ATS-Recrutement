import type {
  DatabaseSchema,
  UserProfile,
  SavedCv,
  ApplicationItem,
  AnalysisHistoryItem,
  SavedSuggestion,
  UserSettings,
  DatabaseStats,
} from '../types';

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

// Filtre pour éliminer toute donnée de démonstration (Thomas Dupont, Clara Martin, Alex Martin, etc.)
function filterOutDemoCv(cv: SavedCv): boolean {
  if (!cv || !cv.id) return false;
  if (cv.id === 'cv-default-1' || cv.id === 'cv-tech-2' || cv.id.startsWith('demo-')) return false;
  const raw = (cv.rawText || '').toUpperCase();
  if (raw.includes('THOMAS DUPONT') || raw.includes('CLARA MARTIN') || raw.includes('CIGDEM ROUSSEAU') || raw.includes('MAXIME LEROY')) {
    return false;
  }
  return true;
}

function filterOutDemoApp(app: ApplicationItem): boolean {
  if (!app || !app.id) return false;
  if (app.id.startsWith('app-sample-') || app.id === 'app-1' || app.id === 'app-2' || app.id === 'app-3') {
    return false;
  }
  const company = (app.company || '').toLowerCase();
  if (company.includes('technova') || company.includes('retailgroup') || company.includes('finmetrics') || company.includes('valoria capital')) {
    return false;
  }
  return true;
}

function filterOutDemoAnalysis(item: AnalysisHistoryItem): boolean {
  if (!item || !item.id) return false;
  if (item.id.startsWith('sample-')) return false;
  const cv = (item.cvText || '').toUpperCase();
  if (cv.includes('THOMAS DUPONT') || cv.includes('CLARA MARTIN') || cv.includes('MAXIME LEROY')) {
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

    return {
      cvsCount: cvs.length,
      applicationsCount: applications.length,
      analysesCount: analyses.length,
      suggestionsCount: suggestions.length,
      dbSizeBytes: JSON.stringify({ cvs, applications, analyses, suggestions }).length,
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
    const current = this.getLocalProfile() || ({ id: `profile-${Date.now()}` } as UserProfile);
    const updated: UserProfile = {
      ...current,
      ...profile,
      id: profile.id || current.id || `profile-${Date.now()}`,
      name: profile.name || profile.currentTitle || `${profile.firstName || current.firstName || ''} ${profile.lastName || current.lastName || ''}`.trim() || 'Mon Profil',
      updatedAt: new Date().toISOString(),
    };

    // 1. Sauvegarde locale synchrone immédiate (profil actif)
    setStorage('cv_move_user_profile', updated);
    await setIdbCache('user_profile', updated);

    // 2. Mise à jour de la liste multi-profils
    const allProfiles = this.getLocalProfiles();
    const existingIdx = allProfiles.findIndex((p) => p.id === updated.id);

    let updatedList: UserProfile[];
    if (existingIdx >= 0) {
      updatedList = allProfiles.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
    } else {
      updatedList = [updated, ...allProfiles];
    }

    if (updated.isDefault) {
      updatedList = updatedList.map((p) => ({
        ...p,
        isDefault: p.id === updated.id,
      }));
    }

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
    const allProfiles = this.getLocalProfiles();
    if (allProfiles.length <= 1) {
      return false; // Impossible de supprimer le dernier profil
    }

    const filtered = allProfiles.filter((p) => p.id !== id);
    let newDefault = filtered.find((p) => p.isDefault) || filtered[0];
    if (newDefault) {
      newDefault = { ...newDefault, isDefault: true };
      setStorage('cv_move_user_profile', newDefault);
      await setIdbCache('user_profile', newDefault);
    }

    setStorage('cv_move_user_profiles', filtered);
    await setIdbCache('user_profiles', filtered);

    try {
      await fetch(`/api/db/profiles/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Erreur deleteProfile serveur :', err);
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
    return raw.filter(filterOutDemoAnalysis);
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
    localStorage.removeItem('cv_move_saved_cvs');
    localStorage.removeItem('cv_move_applications');
    localStorage.removeItem('cv_move_user_profile');
    localStorage.removeItem('cv_move_history');
    localStorage.removeItem('cv_move_suggestions');
    localStorage.setItem('cv_move_apps_initialized', 'true');
    localStorage.setItem('cv_move_cvs_initialized', 'true');

    const res = await fetch('/api/db/reset', { method: 'POST' });
    if (!res.ok) {
      throw new Error('Échec de la réinitialisation');
    }
    const json = await res.json();
    return json.data;
  },
};
