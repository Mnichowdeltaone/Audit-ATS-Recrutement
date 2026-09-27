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
  checklist: {
    cvSent: boolean;
    coverLetterSent: boolean;
    portfolioSent: boolean;
    followUpDone: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisHistoryItem {
  id: string;
  timestamp: string;
  title: string;
  jobSnippet: string;
  cvSnippet: string;
  cvText: string;
  jobText: string;
  analysisResult: string;
  score: number | null;
  fileName?: string;
  fileType?: string;
  jobUrl?: string;
}

export interface ExtractedFileResult {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  text: string;
  fileSize: number;
}

export interface UserProfile {
  id: string;
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
  profile: UserProfile;
  cvs: SavedCv[];
  applications: ApplicationItem[];
  analyses: AnalysisHistoryItem[];
  suggestions: SavedSuggestion[];
  settings: UserSettings;
}

export interface DatabaseStats {
  cvsCount: number;
  applicationsCount: number;
  analysesCount: number;
  suggestionsCount: number;
  dbSizeBytes: number;
  lastUpdated: string;
}
