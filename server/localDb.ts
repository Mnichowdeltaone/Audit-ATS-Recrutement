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

// Données initiales par défaut
const DEFAULT_DATABASE: DatabaseSchema = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  profile: {
    id: 'user_profile',
    firstName: 'Alex',
    lastName: 'Martin',
    email: 'alex.martin.pro@email.fr',
    phone: '+33 6 12 34 56 78',
    location: 'Paris & Île-de-France (Hybride / Télétravail)',
    currentTitle: 'Product Owner Senior / Chef de Projet Digital',
    bio: 'Product Owner & Chef de Projet Digital avec 6 ans d\'expérience dans le pilotage de produits SaaS B2B et d\'applications web à fort trafic. Expert méthodologies Agile/Scrum et découverte utilisateur orientée données.',
    linkedinUrl: 'https://linkedin.com/in/alex-martin-pro',
    githubUrl: 'https://github.com/alex-martin',
    portfolioUrl: 'https://alex-martin.dev',
    targetRoles: [
      'Product Owner Senior',
      'Lead Product Manager',
      'Chef de Projet Digital & IT',
    ],
    skills: [
      'Agile / Scrum',
      'Jira / Confluence',
      'Roadmapping produit',
      'Product Discovery',
      'KPIs & Data Analytics',
      'Figma / UX basics',
      'API REST & Webhooks',
      'TypeScript / React notions',
    ],
    updatedAt: new Date().toISOString(),
  },
  cvs: [
    {
      id: 'cv-default-1',
      title: 'CV Principal - Product Owner & Lead Agile',
      targetRole: 'Product Owner Senior',
      fileName: 'CV_Alex_Martin_ProductOwner_2026.pdf',
      fileType: 'pdf',
      rawText: `ALEX MARTIN
Product Owner Senior & Chef de Projet Digital
Paris, France | alex.martin.pro@email.fr | +33 6 12 34 56 78 | linkedin.com/in/alex-martin-pro

RÉSUMÉ PROFESSIONNEL
Product Owner passionné par la conception de produits centrés utilisateur et la maximisation de valeur métier. Plus de 6 années d'expérience en environnements Agile Scrum/Kanban, de la découverte produit jusqu'au déploiement continu.

COMPÉTENCES CLÉS
- Méthodologies : Agile, Scrum, Kanban, Lean Startup, Design Thinking
- Outils : Jira, Confluence, Figma, Miro, Notion, Mixpanel, Google Analytics
- Technique : Spécifications fonctionnelles, API REST, SQL basique, CI/CD, Git
- Langues : Français (Natif), Anglais (Courant C1 / Bilingue professionnel)

EXPÉRIENCES PROFESSIONNELLES
2023 - Présent | Senior Product Owner | TechPulse SaaS (Paris)
- Pilotage de la roadmap d'une solution SaaS B2B utilisée par 120 000 utilisateurs actifs.
- Réduction du churn de 22% en refondant le module d'onboarding utilisateur et le tableau de bord d'analytique.
- Animation quotidienne d'une squad multidisciplinaire de 9 personnes (6 développeurs, 1 designer, 1 QA, 1 data analyst).
- Définition des OKRs trimestriels et priorisation stricte du backlog selon la méthode RICE.

2020 - 2023 | Product Owner / Chef de Projet Web | MediaNext Solutions
- Gestion de bout en bout de 4 refontes d'applications web avec architecture cloud moderne.
- Amélioration de 35% de la vélocité de l'équipe de dev via la clarification des User Stories et critères d'acceptation Gherkin.
- Réalisation d'une cinquantaine d'interviews utilisateurs pour cadrer les besoins majeurs et valider les prototypes interactifs.

FORMATION & CERTIFICATIONS
- Certification PSPO II (Professional Scrum Product Owner) - Scrum.org (2023)
- Master 2 en Management des Systèmes d'Information & Projets Numériques (2020)`,
      isDefault: true,
      fileSize: 45200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cv-tech-2',
      title: 'CV Technique - Développeur Fullstack Web',
      targetRole: 'Développeur Fullstack TypeScript / Node',
      fileName: 'CV_Alex_Martin_Fullstack_Dev.docx',
      fileType: 'docx',
      rawText: `ALEX MARTIN
Développeur Fullstack TypeScript & React
Paris / Télétravail | alex.martin.pro@email.fr | github.com/alex-martin

COMPÉTENCES TECHNIQUES
- Langages : TypeScript, JavaScript ES6+, Python, SQL
- Frontend : React, Next.js, Tailwind CSS, Redux Toolkit, Vite
- Backend : Node.js, Express, PostgreSQL, Prisma, Redis, Docker
- Outils & Pratiques : Git, GitHub Actions CI/CD, Jest, Vitest, Tests E2E Playwright

EXPÉRIENCES
2024 - Présent : Développeur Fullstack (Missions & Projets Open Source)
- Conception d'APIs REST résilientes et de dashboards interactifs sous React et Tailwind.
- Optimisation des temps de réponse backend de 40% par mise en cache Redis et requêtes SQL indexées.`,
      isDefault: false,
      fileSize: 31400,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  applications: [
    {
      id: 'app-sample-1',
      company: 'Doctolib',
      role: 'Product Owner Senior - Parcours Praticiens',
      status: 'interview',
      appliedDate: '2026-09-15',
      followUpDate: '2026-09-28',
      location: 'Nantes / Paris (Hybride)',
      contractType: 'CDI',
      salary: '62k€ - 68k€',
      jobUrl: 'https://careers.doctolib.fr/offres/product-owner-praticiens',
      notes: 'Premier tour RH validé le 18/09. Entretien technique et Product Case Study prévu jeudi prochain à 14h00.',
      score: 88,
      analysisId: 'sample-analysis-1',
      checklist: {
        cvSent: true,
        coverLetterSent: true,
        portfolioSent: true,
        followUpDone: true,
      },
      createdAt: '2026-09-15T10:00:00.000Z',
      updatedAt: '2026-09-18T16:30:00.000Z',
    },
    {
      id: 'app-sample-2',
      company: 'Mirakl',
      role: 'Lead Product Manager - Marketplaces',
      status: 'applied',
      appliedDate: '2026-09-21',
      followUpDate: '2026-09-28',
      location: 'Paris 8e (Hybride)',
      contractType: 'CDI',
      salary: '65k€ - 72k€',
      jobUrl: 'https://www.mirakl.com/careers/lead-pm',
      notes: 'Candidature spontanée via recommandation. Score ATS de 84% obtenu sur la fiche de poste.',
      score: 84,
      analysisId: null,
      checklist: {
        cvSent: true,
        coverLetterSent: true,
        portfolioSent: false,
        followUpDone: false,
      },
      createdAt: '2026-09-21T09:15:00.000Z',
      updatedAt: '2026-09-21T09:15:00.000Z',
    },
  ],
  analyses: [
    {
      id: 'sample-analysis-1',
      timestamp: '18/09/2026 14:20',
      title: 'Product Owner Senior - Doctolib',
      jobSnippet: 'Doctolib recherche un Product Owner Senior pour piloter la refonte du module de gestion de rendez-vous praticiens...',
      cvSnippet: 'Senior Product Owner chez TechPulse SaaS. Pilotage de roadmap SaaS B2B, réduction de churn...',
      cvText: 'Senior Product Owner chez TechPulse SaaS. Pilotage de roadmap SaaS B2B, réduction de churn...',
      jobText: 'Doctolib recherche un Product Owner Senior expérimenté pour piloter la roadmap produit...',
      score: 88,
      fileName: 'CV_Alex_Martin_ProductOwner_2026.pdf',
      jobUrl: 'https://careers.doctolib.fr/offres/product-owner-praticiens',
      analysisResult: `### Score d'adéquation ATS : 88/100

**Points forts :**
- Forte expérience démontrée en SaaS B2B et méthodes Scrum.
- Réalisations chiffrées très valorisantes (réduction de churn de 22%, gestion de squad de 9 personnes).
- Certification PSPO II reconnue.

**Axes d'optimisation :**
- Ajouter le mot-clé « Santé numérique / HealthTech » et les contraintes réglementaires (RGPD / HDS).`,
    },
  ],
  suggestions: [
    {
      id: 'sugg-1',
      type: 'star_accomplishment',
      title: 'Accomplissement STAR - Réduction du Churn Client',
      originalText: 'Gestion de la refonte du tableau de bord client pour améliorer la rétention.',
      generatedContent: 'Piloté la refonte intégrale du tableau de bord analytique et de l\'onboarding client (Situation/Tâche), en coordonnant une squad Agile de 9 collaborateurs et en itérant sur les retours de 50+ utilisateurs clés (Action), aboutissant à une diminution du churn de 22% et un gain de satisfaction NPS de +18 points en 6 mois (Résultat).',
      targetRole: 'Product Owner Senior',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sugg-2',
      type: 'branding_bio',
      title: 'Bio d\'Accroche CV - Style Axé Métriques & Impact',
      generatedContent: 'Product Owner Senior certifié PSPO II avec 6 ans d\'expérience dans l\'accélération de produits SaaS B2B. Spécialiste de la transformation de retours clients complexes en roadmaps à fort ROI, ayant permis jusqu\'à -22% de désabonnement et +35% de vélocité d\'équipe.',
      targetRole: 'Product Owner',
      createdAt: new Date().toISOString(),
    },
  ],
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
    // Rétrocompatibilité et fusion avec les champs manquants
    return {
      version: parsed.version || 1,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      profile: { ...DEFAULT_DATABASE.profile, ...(parsed.profile || {}) },
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
// GESTION DU PROFIL
// =============================================================================
export async function getProfile(): Promise<UserProfile> {
  const db = getDatabase();
  return db.profile;
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const db = getDatabase();
  const updatedProfile: UserProfile = {
    ...db.profile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  db.profile = updatedProfile;
  await saveDatabase(db);
  return updatedProfile;
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
