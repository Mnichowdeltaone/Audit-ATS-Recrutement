export type ApplicationStatus =
  | 'to_apply'
  | 'applied'
  | 'waiting'
  | 'interview'
  | 'offer'
  | 'rejected';

export interface ApplicationItem {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate: string; // YYYY-MM-DD
  followUpDate: string; // YYYY-MM-DD
  location: string;
  contractType: 'CDI' | 'CDD' | 'Freelance' | 'Alternance' | 'Stage' | 'Autre';
  salary?: string;
  jobUrl?: string;
  contact?: string;
  notes?: string;
  score?: number | null;
  analysisId?: string | null;
  coverLetter?: string; // Contenu complet de la lettre de motivation rattachée
  coverLetterTitle?: string; // Titre ou sujet de la lettre
  checklist: {
    cvSent: boolean;
    coverLetterSent: boolean;
    portfolioSent: boolean;
    followUpDone: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export type EvolutionStepType =
  | 'initial_analysis'
  | 'recommendations_applied'
  | 're_analysis';

export interface EvolutionStep {
  id: string;
  version: number; // 1, 2, 3...
  type: EvolutionStepType;
  title: string;
  timestamp: string;
  score: number | null;
  scoreDelta?: number; // e.g. +16
  cvText: string;
  analysisResult?: string;
  changesApplied?: string[]; // e.g. ["Harmonisation titre", "Ajout mot-clé AGICAP", "STAR lettrage"]
  summaryNote?: string;
  strengthsCount?: number;
  weaknessesCount?: number;
}

export interface AnalysisHistoryItem {
  id: string;
  timestamp: string;
  title: string;
  company?: string;
  cabinet?: string;
  role?: string;
  isHorodatedOnly?: boolean;
  customTitle?: string;
  jobSnippet: string;
  cvSnippet: string;
  cvText: string;
  jobText: string;
  analysisResult: string;
  score: number | null;
  fileName?: string;
  fileType?: string;
  jobUrl?: string;
  sessionId?: string; // ID unique du fil d'évolution CV <-> Offre
  currentVersion?: number; // Version active (1, 2, 3...)
  evolutionSteps?: EvolutionStep[]; // Liste de toutes les étapes de traitement
  coverLetterId?: string; // ID de la lettre de motivation rattachée
  coverLetterTitle?: string; // Titre de la lettre de motivation
  coverLetterContent?: string; // Contenu de la lettre de motivation
  companyDossier?: CompanyFinancialTechnicalDossier; // Fiche technique et financière de l'entreprise recruteuse
}

export interface CompanyFinancialTechnicalDossier {
  companyName: string;
  sector?: string;
  businessModel?: string; // B2B, B2C, SaaS, Retail, Industrie, etc.
  estimatedSize?: string; // PME, ETI, Grand Groupe, 50-250 salariés...
  location?: string; // Siège / Implantation
  ownershipStructure?: string; // Familial, Fonds LBO/PE, VC, Cotée, etc.
  financialProfile: {
    estimatedRevenue?: string; // Ordre de grandeur CA ou croissance
    growthStage?: string; // Forte croissance, Maturité, Restructuration...
    profitabilityModel?: string; // Marge, EBITDA, BFR, optimisation trésorerie
    keyFinancialChallenges: string[]; // Enjeux financiers identifiés (cash pooling, prévisions 13 semaines, clôtures, CAC)
  };
  technicalProfile: {
    toolsAndStack: string[]; // ERP, TMS, logiciels (Pennylane, Agicap, SAP, Excel avancé...)
    methodology?: string; // Normes françaises, IFRS, clôtures rapides J+5...
    reportingLine?: string; // Reporte au DAF, DG, Fondateurs
    keyOperationalProjects: string[]; // Migration ERP/TMS, internalisation, audit
  };
  interviewStrategy: {
    pitchRecommendation: string; // Pitch d'accroche personnalisé pour l'entretien
    highImpactQuestions: { question: string; objective: string }[]; // 3 à 5 questions pointues à poser au recruteur
    strategicAdvice: string[]; // Conseils pour franchir les étapes du process
  };
  rawBriefText?: string; // Texte complet en Markdown
}

export interface ExtractedFileResult {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  text: string;
  fileSize: number;
}

export interface UserProfile {
  id: string;
  name?: string; // Nom ou étiquette du profil (ex: "Trésorier Opérationnel", "Consultant TMS")
  isDefault?: boolean; // Indique si c'est le profil actif
  associatedCvId?: string; // ID du CV lié si extrait d'un CV
  associatedCvTitle?: string; // Nom du CV ayant servi à remplir le profil
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  currentTitle: string;
  bio: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  targetRoles: string[];
  skills: string[];
  updatedAt: string;
  createdAt?: string;
}

export interface SavedCv {
  id: string;
  title: string;
  targetRole: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'manual';
  rawText: string;
  isDefault: boolean;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export type SuggestionType =
  | 'star_accomplishment'
  | 'branding_bio'
  | 'cover_letter_hook'
  | 'interview_prep'
  | 'custom';

export interface SavedSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  originalText?: string;
  generatedContent: string;
  targetRole?: string;
  createdAt: string;
}

export interface SavedCoverLetter {
  id: string;
  title: string;
  company: string;
  role: string;
  content: string;
  applicationId?: string; // ID de la candidature Kanban associée si liée
  analysisId?: string; // ID de l'audit / analyse ATS associée si liée
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  customApiKey?: string;
  selectedModel: string;
  autoSaveToDb: boolean;
  backupFrequency: 'manual' | 'daily' | 'weekly';
  lastBackupDate?: string;
}

export interface DatabaseSchema {
  version: number;
  lastUpdated: string;
  profile: UserProfile; // Profil actif
  profiles?: UserProfile[]; // Tous les profils enregistrés
  cvs: SavedCv[];
  applications: ApplicationItem[];
  analyses: AnalysisHistoryItem[];
  suggestions: SavedSuggestion[];
  coverLetters?: SavedCoverLetter[]; // Lettres de motivation enregistrées
  settings: UserSettings;
}

export interface DatabaseStats {
  cvsCount: number;
  applicationsCount: number;
  analysesCount: number;
  suggestionsCount: number;
  coverLettersCount: number;
  dbSizeBytes: number;
  lastUpdated: string;
}
