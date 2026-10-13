export type ApplicationStatus =
  | 'to_apply'
  | 'applied'
  | 'waiting'
  | 'interview'
  | 'offer'
  | 'rejected';

export interface ApplicationContact {
  id: string;
  name: string;
  role?: string; // ex: "DRH / Recruteur", "Directeur Financier (DAF)", "Manager N+1", "Chasseur de têtes", "Associé", "Autre"
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  notes?: string;
}

export type ApplicationInteractionType =
  | 'note'
  | 'call'
  | 'email'
  | 'interview'
  | 'follow_up'
  | 'feedback';

export interface ApplicationInteraction {
  id: string;
  date: string; // YYYY-MM-DD
  type: ApplicationInteractionType;
  title: string;
  content: string;
  contactName?: string;
}

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
  contact?: string; // Champ simple historique
  contacts?: ApplicationContact[]; // Contacts structurés multiples (RH, DAF, N+1...)
  notes?: string; // Champ note simple historique
  interactions?: ApplicationInteraction[]; // Journal des annotations et interactions horodatées
  companyPhone?: string; // Standard téléphonique ou contact entreprise
  companyAddress?: string; // Adresse physique / siège
  score?: number | null;
  analysisId?: string | null;
  coverLetter?: string; // Contenu complet de la lettre de motivation rattachée
  coverLetterTitle?: string; // Titre ou sujet de la lettre
  companyDossier?: CompanyFinancialTechnicalDossier; // Fiche technique, financière et légale d'entreprise rattachée
  checklist: {
    cvSent: boolean;
    coverLetterSent: boolean;
    portfolioSent: boolean;
    followUpDone: boolean;
  };
  followUpDoneAt?: string; // Horodatage de la relance effectuée
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

export interface CompanyExecutiveInfo {
  name: string;
  title: string;
  roleDescription?: string;
}

export interface LegalAndCorporateInfo {
  legalName?: string; // Raison sociale officielle (ex: VALORIA CAPITAL / GROUPE VALORIA)
  commercialBrand?: string; // Marque ou groupe
  siren?: string; // Numéro SIREN (9 chiffres) ou SIRET (14 chiffres)
  rcsCity?: string; // Ville d'immatriculation au RCS (ex: Paris, Nanterre, Lyon...)
  websiteUrl?: string; // Site web officiel
  headquarters?: string; // Siège social / adresse
  creationYear?: string; // Année de fondation
  legalForm?: string; // Forme juridique (SAS, SA, SARL, SASU, etc.)
  keyExecutives?: CompanyExecutiveInfo[]; // Dirigeants clés & Fondateurs
  activitiesPillars?: string[]; // Piliers d'activité réels (ex: Gestion privée, Asset Management, M&A)
  aumOrKeyMetrics?: string; // Actifs sous gestion (AUM), encours, CA
  shareholdersAndBackers?: string; // Actionnariat & fonds partenaires (ex: TA Associates, Fondateur)
  recentDealsOrNews?: string[]; // Actualités M&A récentes, acquisitions
  adHocSourceNotes?: string; // Notes et informations recueillies sur les sites ad hoc (Pappers, Société.com...)
  verifiedOnAdHocSites?: boolean; // Indicateur que les informations ont été confrontées aux registres ad hoc
  adHocVerifiedAt?: string; // Date de confrontation aux registres ad hoc
}

export interface StrategicPlanPhase {
  period: string; // Ex: "J0 - J30 : Immersion & Diagnostic"
  title: string;
  description: string;
  actions: string[];
  deliverable: string;
}

export interface CandidateStrategicPlan {
  roleTitle: string;
  executiveSummary: string;
  phases: StrategicPlanPhase[];
  quickWins: string[];
  strategicRecommendations: string[];
}

export interface CompanyStakeholderCommunication {
  roleCategory: string; // "Direction Générale & Présidence", "Direction Financière (DAF)", "Opérationnels & Associés", "RH & Recrutement"
  targetName?: string; // Ex: "Romain Lefèvre (Président)"
  keyPriorities: string[]; // Ce qui l'intéresse / ses priorités
  recommendedPosture: string; // Posture & ton recommandé
  verbalPitch: string; // Ce qu'il faut lui dire en entretien
  outreachMessageSample: string; // Modèle de message direct (LinkedIn / Email d'approche)
  questionsToAsk: string[]; // Questions ciblées à lui poser
}

export interface CompanyFinancialTechnicalDossier {
  companyName: string;
  sector?: string;
  businessModel?: string; // B2B, B2C, SaaS, Retail, Industrie, etc.
  estimatedSize?: string; // PME, ETI, Grand Groupe, 50-250 salariés...
  location?: string; // Siège / Implantation
  ownershipStructure?: string; // Familial, Fonds LBO/PE, VC, Cotée, etc.
  websiteUrl?: string; // URL officielle du site de l'entreprise
  legalInfo?: LegalAndCorporateInfo; // Informations légales et corporatives officielles
  candidateStrategicPlan?: CandidateStrategicPlan; // Plan stratégique d'intégration et feuille de route 30-60-90 jours
  stakeholdersCommunication?: CompanyStakeholderCommunication[]; // Cartographie et stratégie de communication par interlocuteur
  customContacts?: ApplicationContact[]; // Contacts ajoutés / suivis pour cette entreprise
  candidateNotes?: ApplicationInteraction[]; // Annotations, comptes-rendus et jalons du candidat
  adHocSearchQuery?: string; // Requête ou mot-clé personnalisé utilisé pour la recherche sur les sites ad hoc
  isAdHocVerified?: boolean; // Fiche confirmée et enrichie via les registres ad hoc (Pappers, Société.com...)
  adHocVerifiedAt?: string; // Date de dernière synchronisation / vérification sur sites ad hoc
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

export type CalendarEventType =
  | 'interview'
  | 'follow_up'
  | 'france_travail'
  | 'salon_forum'
  | 'webinar'
  | 'network'
  | 'test_exam'
  | 'call'
  | 'email'
  | 'feedback'
  | 'note'
  | 'other';

export type CalendarEventCategory =
  | 'application'
  | 'france_travail'
  | 'salon'
  | 'webinar'
  | 'network'
  | 'personal';

export interface CustomCalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  type: CalendarEventType;
  category: CalendarEventCategory;
  organizerOrCompany?: string; // Ex: "France Travail Paris 12", "Salon Emploi Porte de Versailles", "Bip&Go", etc.
  roleOrSubject?: string; // Ex: "Entretien Mensuel Conseiller", "Forum Recrutement", "Responsable Financier", etc.
  location?: string; // Ex: "Agence France Travail", "Paris Expo", "Visio Zoom", etc.
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string; // Notes, pièces à apporter, etc.
  applicationId?: string; // ID de la candidature rattachée si applicable
  isCompleted?: boolean;
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
  calendarEvents?: CustomCalendarEvent[]; // Rendez-vous et événements du calendrier (France Travail, Salons...)
  settings: UserSettings;
}

export interface DatabaseStats {
  cvsCount: number;
  applicationsCount: number;
  analysesCount: number;
  suggestionsCount: number;
  coverLettersCount: number;
  calendarEventsCount?: number;
  dbSizeBytes: number;
  lastUpdated: string;
}
