import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  DatabaseSchema,
  UserProfile,
  SavedCv,
  ApplicationItem,
  AnalysisHistoryItem,
  SavedSuggestion,
  UserSettings,
  DatabaseStats,
} from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'local_database.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Données initiales par défaut (Vierge pour l'espace personnel de l'utilisateur)
const DEFAULT_DATABASE: DatabaseSchema = {
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
  },
  cvs: [],
  applications: [],
  analyses: [],
  suggestions: [],
  settings: {
    selectedModel: 'gemini-3.8-flash',
    autoSaveToDb: true,
    backupFrequency: 'weekly',
    lastBackupDate: new Date().toISOString(),
  },
};

// Vérification et initialisation synchrone du répertoire et du fichier
function ensureDbExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE_PATH)) {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(DEFAULT_DATABASE, null, 2), 'utf-8');
  }
}

// Lecture de la base de données
export function getDatabase(): DatabaseSchema {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    const profile = { ...DEFAULT_DATABASE.profile, ...(parsed.profile || {}) };

    let profiles: UserProfile[] = Array.isArray(parsed.profiles) && parsed.profiles.length > 0
      ? parsed.profiles
      : [];

    // Migration transparente si profiles est vide mais qu'un profil principal existe
    if (profiles.length === 0 && (profile.firstName || profile.currentTitle)) {
      profiles = [
        {
          ...profile,
          name: profile.name || profile.currentTitle || `${profile.firstName} ${profile.lastName}`.trim() || 'Profil Principal',
          isDefault: true,
        },
      ];
    } else if (profiles.length === 0) {
      profiles = [profile];
    }

    // Rétrocompatibilité et fusion avec les champs manquants
    return {
      version: parsed.version || 1,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      profile,
      profiles,
      cvs: Array.isArray(parsed.cvs) ? parsed.cvs : DEFAULT_DATABASE.cvs,
      applications: Array.isArray(parsed.applications) ? parsed.applications : DEFAULT_DATABASE.applications,
      analyses: Array.isArray(parsed.analyses) ? parsed.analyses : DEFAULT_DATABASE.analyses,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : DEFAULT_DATABASE.suggestions,
      settings: { ...DEFAULT_DATABASE.settings, ...(parsed.settings || {}) },
    };
  } catch (err) {
    console.error('Erreur lecture BDD locale, réinitialisation sécurisée :', err);
    return DEFAULT_DATABASE;
  }
}

// Écriture atomique avec fichier temporaire pour zéro corruption
export async function saveDatabase(data: DatabaseSchema): Promise<void> {
  ensureDbExists();
  data.lastUpdated = new Date().toISOString();
  const tempPath = `${DB_FILE_PATH}.tmp`;
  const jsonStr = JSON.stringify(data, null, 2);

  await fs.promises.writeFile(tempPath, jsonStr, 'utf-8');
  await fs.promises.rename(tempPath, DB_FILE_PATH);
}

// =============================================================================
// GESTION DES PROFILS (MULTI-PROFILS CANDIDAT)
// =============================================================================
export async function getProfile(): Promise<UserProfile> {
  const db = getDatabase();
  return db.profile;
}

export async function getProfiles(): Promise<UserProfile[]> {
  const db = getDatabase();
  return db.profiles || [db.profile];
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const db = getDatabase();
  const updatedProfile: UserProfile = {
    ...db.profile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  db.profile = updatedProfile;

  // Mettre également à jour dans la liste des profils
  if (!db.profiles) db.profiles = [];
  const idx = db.profiles.findIndex((p) => p.id === updatedProfile.id);
  if (idx >= 0) {
    db.profiles[idx] = updatedProfile;
  } else {
    db.profiles.push(updatedProfile);
  }

  await saveDatabase(db);
  return updatedProfile;
}

export async function saveProfileToDb(profileToSave: UserProfile): Promise<UserProfile> {
  const db = getDatabase();
  if (!db.profiles) db.profiles = [];

  const now = new Date().toISOString();
  const cleanProfile: UserProfile = {
    ...profileToSave,
    id: profileToSave.id || `profile-${Date.now()}`,
    name: profileToSave.name || profileToSave.currentTitle || `${profileToSave.firstName} ${profileToSave.lastName}`.trim() || 'Profil Candidat',
    updatedAt: now,
    createdAt: profileToSave.createdAt || now,
  };

  const existingIndex = db.profiles.findIndex((p) => p.id === cleanProfile.id);

  if (cleanProfile.isDefault || db.profiles.length === 0) {
    db.profiles.forEach((p) => {
      p.isDefault = false;
    });
    cleanProfile.isDefault = true;
    db.profile = cleanProfile;
  }

  if (existingIndex >= 0) {
    db.profiles[existingIndex] = cleanProfile;
  } else {
    db.profiles.unshift(cleanProfile);
  }

  // Si le profil actuel modifié correspond au profil actif, on le met à jour
  if (db.profile.id === cleanProfile.id || cleanProfile.isDefault) {
    db.profile = cleanProfile;
  }

  await saveDatabase(db);
  return cleanProfile;
}

export async function setDefaultProfile(id: string): Promise<UserProfile | null> {
  const db = getDatabase();
  if (!db.profiles) return null;

  let target: UserProfile | null = null;
  db.profiles.forEach((p) => {
    if (p.id === id) {
      p.isDefault = true;
      target = p;
    } else {
      p.isDefault = false;
    }
  });

  if (target) {
    db.profile = target;
    await saveDatabase(db);
  }

  return target;
}

export async function deleteProfileFromDb(id: string): Promise<boolean> {
  const db = getDatabase();
  if (!db.profiles || db.profiles.length <= 1) {
    return false; // Garder au moins 1 profil
  }

  const initialLen = db.profiles.length;
  db.profiles = db.profiles.filter((p) => p.id !== id);

  if (db.profiles.length < initialLen) {
    // Si on a supprimé le profil actif, désigner le premier restant
    if (db.profile.id === id && db.profiles.length > 0) {
      db.profiles[0].isDefault = true;
      db.profile = db.profiles[0];
    }
    await saveDatabase(db);
    return true;
  }

  return false;
}

// =============================================================================
// GESTION DES CVS
// =============================================================================
export async function getCvs(): Promise<SavedCv[]> {
  const db = getDatabase();
  return db.cvs;
}

export async function saveCv(cv: SavedCv): Promise<SavedCv> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existingIndex = db.cvs.findIndex((c) => c.id === cv.id);

  if (cv.isDefault) {
    // Retirer le statut isDefault des autres
    db.cvs.forEach((c) => {
      c.isDefault = false;
    });
  }

  const cvToSave: SavedCv = {
    ...cv,
    updatedAt: now,
    createdAt: cv.createdAt || now,
  };

  if (existingIndex >= 0) {
    db.cvs[existingIndex] = cvToSave;
  } else {
    // Si c'est le tout premier CV, le mettre par défaut
    if (db.cvs.length === 0) {
      cvToSave.isDefault = true;
    }
    db.cvs.unshift(cvToSave);
  }

  await saveDatabase(db);
  return cvToSave;
}

export async function deleteCv(id: string): Promise<boolean> {
  const db = getDatabase();
  const initialLen = db.cvs.length;
  db.cvs = db.cvs.filter((c) => c.id !== id);
  if (db.cvs.length < initialLen) {
    // S'il n'y a plus de CV par défaut et qu'il en reste un, le définir par défaut
    if (db.cvs.length > 0 && !db.cvs.some((c) => c.isDefault)) {
      db.cvs[0].isDefault = true;
    }
    await saveDatabase(db);
    return true;
  }
  return false;
}

export async function setDefaultCv(id: string): Promise<SavedCv | null> {
  const db = getDatabase();
  let found: SavedCv | null = null;
  db.cvs.forEach((c) => {
    if (c.id === id) {
      c.isDefault = true;
      found = c;
    } else {
      c.isDefault = false;
    }
  });
  if (found) {
    await saveDatabase(db);
  }
  return found;
}

// =============================================================================
// GESTION DES CANDIDATURES (APPLICATIONS)
// =============================================================================
export async function getApplications(): Promise<ApplicationItem[]> {
  const db = getDatabase();
  return db.applications;
}

export async function saveApplication(app: ApplicationItem): Promise<ApplicationItem> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existingIndex = db.applications.findIndex((a) => a.id === app.id);

  const appToSave: ApplicationItem = {
    ...app,
    updatedAt: now,
    createdAt: app.createdAt || now,
  };

  if (existingIndex >= 0) {
    db.applications[existingIndex] = appToSave;
  } else {
    db.applications.unshift(appToSave);
  }

  await saveDatabase(db);
  return appToSave;
}

export async function deleteApplication(id: string): Promise<boolean> {
  const db = getDatabase();
  const initialLen = db.applications.length;
  db.applications = db.applications.filter((a) => a.id !== id);
  if (db.applications.length < initialLen) {
    await saveDatabase(db);
    return true;
  }
  return false;
}

// =============================================================================
// GESTION DES ANALYSES
// =============================================================================
export async function getAnalyses(): Promise<AnalysisHistoryItem[]> {
  const db = getDatabase();
  return db.analyses;
}

export async function saveAnalysis(analysis: AnalysisHistoryItem): Promise<AnalysisHistoryItem> {
  const db = getDatabase();
  const existingIndex = db.analyses.findIndex((a) => a.id === analysis.id);

  if (existingIndex >= 0) {
    db.analyses[existingIndex] = analysis;
  } else {
    db.analyses.unshift(analysis);
  }

  await saveDatabase(db);
  return analysis;
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  const db = getDatabase();
  const initialLen = db.analyses.length;
  db.analyses = db.analyses.filter((a) => a.id !== id);
  if (db.analyses.length < initialLen) {
    await saveDatabase(db);
    return true;
  }
  return false;
}

export async function clearAnalyses(): Promise<void> {
  const db = getDatabase();
  db.analyses = [];
  await saveDatabase(db);
}

// =============================================================================
// GESTION DES SUGGESTIONS (STAR, BIOS, LETTRES)
// =============================================================================
export async function getSuggestions(): Promise<SavedSuggestion[]> {
  const db = getDatabase();
  return db.suggestions;
}

export async function saveSuggestion(suggestion: SavedSuggestion): Promise<SavedSuggestion> {
  const db = getDatabase();
  const suggestionToSave: SavedSuggestion = {
    ...suggestion,
    id: suggestion.id || `sugg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: suggestion.createdAt || new Date().toISOString(),
  };
  const existingIndex = db.suggestions.findIndex((s) => s.id === suggestionToSave.id);

  if (existingIndex >= 0) {
    db.suggestions[existingIndex] = suggestionToSave;
  } else {
    db.suggestions.unshift(suggestionToSave);
  }

  await saveDatabase(db);
  return suggestionToSave;
}

export async function deleteSuggestion(id: string): Promise<boolean> {
  const db = getDatabase();
  const initialLen = db.suggestions.length;
  db.suggestions = db.suggestions.filter((s) => s.id !== id);
  if (db.suggestions.length < initialLen) {
    await saveDatabase(db);
    return true;
  }
  return false;
}

// =============================================================================
// GESTION DES PARAMÈTRES (SETTINGS)
// =============================================================================
export async function getSettings(): Promise<UserSettings> {
  const db = getDatabase();
  return db.settings;
}

export async function updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const db = getDatabase();
  db.settings = {
    ...db.settings,
    ...settings,
  };
  await saveDatabase(db);
  return db.settings;
}

// =============================================================================
// STATISTIQUES & MAINTENANCE
// =============================================================================
export async function getDatabaseStats(): Promise<DatabaseStats> {
  ensureDbExists();
  const db = getDatabase();
  let fileSize = 0;
  try {
    const stats = fs.statSync(DB_FILE_PATH);
    fileSize = stats.size;
  } catch {
    fileSize = 0;
  }

  return {
    cvsCount: db.cvs.length,
    applicationsCount: db.applications.length,
    analysesCount: db.analyses.length,
    suggestionsCount: db.suggestions.length,
    dbSizeBytes: fileSize,
    lastUpdated: db.lastUpdated,
  };
}

export async function importDatabase(importedData: Partial<DatabaseSchema>): Promise<DatabaseSchema> {
  const currentDb = getDatabase();
  const merged: DatabaseSchema = {
    version: importedData.version || currentDb.version || 1,
    lastUpdated: new Date().toISOString(),
    profile: importedData.profile ? { ...currentDb.profile, ...importedData.profile } : currentDb.profile,
    cvs: Array.isArray(importedData.cvs) ? importedData.cvs : currentDb.cvs,
    applications: Array.isArray(importedData.applications) ? importedData.applications : currentDb.applications,
    analyses: Array.isArray(importedData.analyses) ? importedData.analyses : currentDb.analyses,
    suggestions: Array.isArray(importedData.suggestions) ? importedData.suggestions : currentDb.suggestions,
    settings: importedData.settings ? { ...currentDb.settings, ...importedData.settings } : currentDb.settings,
  };

  await saveDatabase(merged);
  return merged;
}

export async function resetDatabase(): Promise<DatabaseSchema> {
  const freshDb: DatabaseSchema = {
    ...DEFAULT_DATABASE,
    lastUpdated: new Date().toISOString(),
  };
  await saveDatabase(freshDb);
  return freshDb;
}
