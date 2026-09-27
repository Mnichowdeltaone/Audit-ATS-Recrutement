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
    // Fallback localStorage si indisponible
    try {
      localStorage.setItem(`idb_cache_${key}`, JSON.stringify(value));
    } catch {
      // Ignorer dépassement quota
    }
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
    try {
      const raw = localStorage.getItem(`idb_cache_${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
}

export const localDbClient = {
  // Récupérer l'état de la base
  async fetchStats(): Promise<DatabaseStats> {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const json = await res.json();
        return json.stats;
      }
    } catch (err) {
      console.warn('Erreur fetchStats serveur, calcul local :', err);
    }
    // Fallback local
    return {
      cvsCount: 0,
      applicationsCount: 0,
      analysesCount: 0,
      suggestionsCount: 0,
      dbSizeBytes: 0,
      lastUpdated: new Date().toISOString(),
    };
  },

  // Récupérer toute la BDD
  async fetchAll(): Promise<DatabaseSchema | null> {
    try {
      const res = await fetch('/api/db/all');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          await setIdbCache('full_database', json.data);
          return json.data as DatabaseSchema;
        }
      }
    } catch (err) {
      console.warn('Mode hors-ligne ou erreur serveur, utilisation du cache local :', err);
    }
    return await getIdbCache<DatabaseSchema>('full_database');
  },

  // PROFIL
  async getProfile(): Promise<UserProfile | null> {
    try {
      const res = await fetch('/api/db/profile');
      if (res.ok) {
        const data = await res.json();
        await setIdbCache('user_profile', data);
        return data as UserProfile;
      }
    } catch (err) {
      console.warn('Erreur getProfile serveur :', err);
    }
    return await getIdbCache<UserProfile>('user_profile');
  },

  async saveProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const res = await fetch('/api/db/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const json = await res.json();
        await setIdbCache('user_profile', json.profile);
        return json.profile;
      }
    } catch (err) {
      console.warn('Erreur saveProfile serveur :', err);
    }
    // Mise en cache locale
    const cached = (await getIdbCache<UserProfile>('user_profile')) || ({} as UserProfile);
    const updated = { ...cached, ...profile, updatedAt: new Date().toISOString() } as UserProfile;
    await setIdbCache('user_profile', updated);
    return updated;
  },

  // CVS
  async getCvs(): Promise<SavedCv[]> {
    try {
      const res = await fetch('/api/db/cvs');
      if (res.ok) {
        const data = await res.json();
        await setIdbCache('saved_cvs', data);
        return data as SavedCv[];
      }
    } catch (err) {
      console.warn('Erreur getCvs serveur :', err);
    }
    const cached = await getIdbCache<SavedCv[]>('saved_cvs');
    return cached || [];
  },

  async saveCv(cv: SavedCv): Promise<SavedCv> {
    try {
      const res = await fetch('/api/db/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cv),
      });
      if (res.ok) {
        const json = await res.json();
        const list = await this.getCvs();
        await setIdbCache('saved_cvs', list);
        return json.cv;
      }
    } catch (err) {
      console.warn('Erreur saveCv serveur :', err);
    }
    return cv;
  },

  async deleteCv(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/db/cvs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        return json.success;
      }
    } catch (err) {
      console.warn('Erreur deleteCv serveur :', err);
    }
    return false;
  },

  async setDefaultCv(id: string): Promise<SavedCv | null> {
    try {
      const res = await fetch(`/api/db/cvs/${id}/set-default`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        return json.cv;
      }
    } catch (err) {
      console.warn('Erreur setDefaultCv serveur :', err);
    }
    return null;
  },

  // CANDIDATURES
  async getApplications(): Promise<ApplicationItem[]> {
    try {
      const res = await fetch('/api/db/applications');
      if (res.ok) {
        const data = await res.json();
        await setIdbCache('applications', data);
        return data as ApplicationItem[];
      }
    } catch (err) {
      console.warn('Erreur getApplications serveur :', err);
    }
    const cached = await getIdbCache<ApplicationItem[]>('applications');
    return cached || [];
  },

  async saveApplication(app: ApplicationItem): Promise<ApplicationItem> {
    try {
      const res = await fetch('/api/db/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app),
      });
      if (res.ok) {
        const json = await res.json();
        return json.application;
      }
    } catch (err) {
      console.warn('Erreur saveApplication serveur :', err);
    }
    return app;
  },

  async deleteApplication(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/db/applications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        return json.success;
      }
    } catch (err) {
      console.warn('Erreur deleteApplication serveur :', err);
    }
    return false;
  },

  // ANALYSES
  async getAnalyses(): Promise<AnalysisHistoryItem[]> {
    try {
      const res = await fetch('/api/db/analyses');
      if (res.ok) {
        const data = await res.json();
        await setIdbCache('analyses', data);
        return data as AnalysisHistoryItem[];
      }
    } catch (err) {
      console.warn('Erreur getAnalyses serveur :', err);
    }
    const cached = await getIdbCache<AnalysisHistoryItem[]>('analyses');
    return cached || [];
  },

  async saveAnalysis(analysis: AnalysisHistoryItem): Promise<AnalysisHistoryItem> {
    try {
      const res = await fetch('/api/db/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysis),
      });
      if (res.ok) {
        const json = await res.json();
        return json.analysis;
      }
    } catch (err) {
      console.warn('Erreur saveAnalysis serveur :', err);
    }
    return analysis;
  },

  async deleteAnalysis(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/db/analyses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        return json.success;
      }
    } catch (err) {
      console.warn('Erreur deleteAnalysis serveur :', err);
    }
    return false;
  },

  async clearAnalyses(): Promise<boolean> {
    try {
      const res = await fetch('/api/db/analyses', { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        return json.success;
      }
    } catch (err) {
      console.warn('Erreur clearAnalyses serveur :', err);
    }
    return false;
  },

  // SUGGESTIONS
  async getSuggestions(): Promise<SavedSuggestion[]> {
    try {
      const res = await fetch('/api/db/suggestions');
      if (res.ok) {
        const data = await res.json();
        await setIdbCache('suggestions', data);
        return data as SavedSuggestion[];
      }
    } catch (err) {
      console.warn('Erreur getSuggestions serveur :', err);
    }
    const cached = await getIdbCache<SavedSuggestion[]>('suggestions');
    return cached || [];
  },

  async saveSuggestion(suggestion: SavedSuggestion): Promise<SavedSuggestion> {
    try {
      const res = await fetch('/api/db/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suggestion),
      });
      if (res.ok) {
        const json = await res.json();
        return json.suggestion;
      }
    } catch (err) {
      console.warn('Erreur saveSuggestion serveur :', err);
    }
    return suggestion;
  },

  async deleteSuggestion(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/db/suggestions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        return json.success;
      }
    } catch (err) {
      console.warn('Erreur deleteSuggestion serveur :', err);
    }
    return false;
  },

  // PARAMÈTRES
  async getSettings(): Promise<UserSettings> {
    try {
      const res = await fetch('/api/db/settings');
      if (res.ok) {
        return (await res.json()) as UserSettings;
      }
    } catch (err) {
      console.warn('Erreur getSettings serveur :', err);
    }
    return {
      selectedModel: 'gemini-3.8-flash',
      autoSaveToDb: true,
      backupFrequency: 'weekly',
    };
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const res = await fetch('/api/db/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const json = await res.json();
        return json.settings;
      }
    } catch (err) {
      console.warn('Erreur updateSettings serveur :', err);
    }
    return settings as UserSettings;
  },

  // IMPORT / RESTORE / RESET
  async importDatabase(data: Partial<DatabaseSchema>): Promise<DatabaseSchema> {
    const res = await fetch('/api/db/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error("Échec de l'importation de la base de données");
    }
    const json = await res.json();
    await setIdbCache('full_database', json.data);
    return json.data;
  },

  async resetDatabase(): Promise<DatabaseSchema> {
    const res = await fetch('/api/db/reset', { method: 'POST' });
    if (!res.ok) {
      throw new Error('Échec de la réinitialisation');
    }
    const json = await res.json();
    await setIdbCache('full_database', json.data);
    return json.data;
  },
};
