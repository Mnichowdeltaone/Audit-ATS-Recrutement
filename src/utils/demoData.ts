import type { ApplicationItem, UserProfile, AnalysisHistoryItem } from '../types';

/**
 * JEU DE DONNÉES DE DÉMONSTRATION 100% FICTIF & ISOLÉ
 * 
 * Ce jeu de données permet de tester et explorer toutes les fonctionnalités
 * de l'application sans JAMAIS afficher, mélanger ni écraser les données
 * personnelles réelles de l'utilisateur.
 */

// Candidat fictif de référence pour la démonstration
export const DEMO_FICTITIOUS_PROFILE: UserProfile = {
  id: 'demo-profile-thomas-laurent',
  name: 'Thomas Laurent (Profil Démo Fictif)',
  firstName: 'Thomas',
  lastName: 'Laurent',
  email: 'thomas.laurent.demo@exemple.fr',
  phone: '06 00 00 00 00',
  location: 'Paris (75008)',
  currentTitle: 'Responsable Trésorerie & Finance',
  bio: "Professionnel de la finance d'entreprise avec 8 ans d'expérience dans la gestion opérationnelle de trésorerie, l'optimisation du cash pooling et le déploiement de Treasury Management Systems (TMS). Alliant maîtrise des processus financiers et appétence pour la digitalisation, j'accompagne les directions financières dans l'automatisation des flux et la fiabilité des prévisions de trésorerie.",
  linkedinUrl: 'https://linkedin.com/in/thomas-laurent-demo-fictif',
  githubUrl: '',
  portfolioUrl: '',
  targetRoles: [
    'Responsable Trésorerie & Outils Financiers',
    'Trésorier Groupe & Cash Manager',
    'Responsable Trésorerie Opérationnelle',
  ],
  skills: [
    'Gestion de trésorerie opérationnelle',
    'Cash pooling & arbitrage',
    'TMS (AGICAP, Kyriba)',
    'Sage FRP Treasury',
    'Protocoles EBICS & SEPA',
    'Forecast financier glissant à 13 semaines',
    'Excel avancé (VBA)',
    'Power BI & Dashboards Cash',
    'Rapprochements bancaires & Lettrage',
  ],
  updatedAt: new Date().toISOString(),
  isDefault: false,
};

// CV brut de démonstration fictif
export const DEMO_FICTITIOUS_CV = `THOMAS LAURENT
Paris (75008) | 06 00 00 00 00 | thomas.laurent.demo@exemple.fr
[Profil Candidat Fictif - Démonstration ATS]

RESPONSABLE TRÉSORERIE & CASH MANAGEMENT

RÉSUMÉ PROFESSIONNEL
Professionnel de la finance d'entreprise avec 8 ans d'expérience dans la gestion opérationnelle de trésorerie, l'optimisation du cash pooling et le déploiement de Treasury Management Systems (TMS). Alliant maîtrise des processus financiers et appétence pour la digitalisation, j'accompagne les directions financières dans l'automatisation des flux, la fiabilité des prévisions de trésorerie (forecast) et la sécurisation des protocoles bancaires (SEPA, EBICS).

COMPÉTENCES CLÉS
• Trésorerie & Finance : Gestion quotidienne des flux, Cash pooling, Analyse des positions bancaires, Prévisions et modélisations budgétaires (forecast à 13 semaines), Rapprochements bancaires, Lettrage.
• Protocoles bancaires : Échanges télématiques, Normes EBICS T / TS, Échanges SEPA, Sécurité des paiements.
• Outils TMS & ERP : AGICAP, Pennylane, Kyriba, Sage FRP Treasury, SAP FI-CO.
• Outils techniques : Excel avancé (modélisation financière, macros VBA), Power BI, Tableaux de bord de cash.
• Langues : Français (langue maternelle), Anglais (professionnel courant).

EXPÉRIENCES PROFESSIONNELLES
Responsable Trésorerie Opérationnelle | Groupe Helios Finance, Paris | 2022 – Présent
- Pilotage quotidien de la trésorerie opérationnelle et modélisation des prévisions de cash glissantes à 13 semaines pour 6 filiales.
- Déploiement et paramétrage du TMS AGICAP : automatisation des remontées de flux bancaires et synchronisation comptable.
- Mise en place d'une politique de cash pooling centralisée ayant permis d'optimiser les équilibrages de trésorerie de 20%.

Gestionnaire de Trésorerie & Cash Pooling | Société NovaTech Solutions, Lyon | 2018 – 2022
- Suivi quotidien des flux bancaires et arbitrage de trésorerie sur comptes multi-devises (EUR, USD, GBP).
- Élaboration des reportings hebdomadaires de position de trésorerie consolidée pour la Direction Financière.
- Exécution et sécurisation des campagnes de règlements fournisseurs nationaux et internationaux.
- Automatisation des rapprochements bancaires sous Excel, réduisant le temps de traitement de 4h par semaine.

FORMATION & DIPLÔMES
- Master 2 Finance d'Entreprise & Trésorerie | IAE (2018)
- Licence Économie et Gestion | Université Paris 1 (2016)`;

// Annonce d'emploi de démonstration fictive
export const DEMO_FICTITIOUS_JOB = `Intitulé du poste : Responsable Trésorerie & Outils Financiers (H/F)
Entreprise : InnovFinance Group - Paris (Télétravail 2j/semaine)
Contrat : CDI

À propos du poste :
Dans le cadre de notre forte croissance, nous recherchons notre futur Responsable Trésorerie pour piloter les flux quotidiens du groupe et mener la digitalisation de nos outils financiers.

Missions principales :
- Gérer la trésorerie opérationnelle quotidienne du groupe et optimiser les équilibrages (cash pooling).
- Construire et animer le prévisionnel de trésorerie (forecast glissant à court et moyen terme).
- Administrer et paramétrer notre progiciel de trésorerie (TMS AGICAP / Kyriba).
- Assurer la conformité et la sécurité des protocoles d'échanges bancaires (EBICS, SEPA, virements internationaux).
- Collaborer avec la Direction Financière pour la mise en place de KPIs et dashboards financiers.

Profil recherché :
- De formation Bac+4/5 en Finance, Gestion ou Comptabilité.
- Minimum 4 à 8 ans d'expérience réussie en trésorerie d'entreprise.
- Excellente maîtrise des outils TMS (AGICAP, Kyriba ou Sage) et d'Excel avancé.
- Rigueur, esprit d'analyse et force de proposition dans l'automatisation des processus.`;

// Liste des candidatures fictives de référence
export const DEMO_FICTITIOUS_APPLICATIONS: ApplicationItem[] = [
  {
    id: 'demo-app-1',
    company: 'InnovFinance Group',
    role: 'Responsable Trésorerie & Outils Financiers',
    status: 'interview',
    appliedDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    location: 'Paris (Hybride)',
    contractType: 'CDI',
    salary: '65 - 75 K€',
    score: 92,
    jobUrl: 'https://careers.innovfinance.com/jobs/tresorier',
    notes: 'Entretien RH concluant le 02/10. Deuxième tour prévu avec le Directeur Financier.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: false,
      followUpDone: true,
    },
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-2',
    company: 'Michael Page',
    role: 'Trésorier Corporate Senior (Client CAC40)',
    status: 'interview',
    appliedDate: new Date(Date.now() - 9 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    location: 'La Défense',
    contractType: 'CDI',
    salary: '70 K€',
    score: 88,
    notes: 'Chasseur de têtes très réactif. Présentation du dossier au client final.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: false,
      followUpDone: true,
    },
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-3',
    company: 'Ken Group Finance',
    role: 'Trésorier Groupe & Cash Manager',
    status: 'offer',
    appliedDate: new Date(Date.now() - 16 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    location: 'Paris 16e',
    contractType: 'CDI',
    salary: '68 K€ + Variable',
    score: 95,
    notes: 'Proposition d’embauche reçue ! Négociation en cours sur la date de démarrage.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: true,
      followUpDone: true,
    },
    createdAt: new Date(Date.now() - 16 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-4',
    company: 'Airbus DS',
    role: 'Chef de Projet SI Trésorerie & Finance',
    status: 'waiting',
    appliedDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    location: 'Toulouse / Télétravail',
    contractType: 'CDI',
    score: 86,
    notes: 'Candidature transmise via le portail carrières avec CV adapté et lettre.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: false,
      followUpDone: false,
    },
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-5',
    company: 'Fed Finance',
    role: 'Consultant Déploiement TMS Kyriba & Agicap',
    status: 'applied',
    appliedDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    location: 'Île-de-France',
    contractType: 'CDI',
    score: 80,
    notes: 'Réponse à l’annonce publiée sur LinkedIn. Relance prévue mardi prochain.',
    checklist: {
      cvSent: true,
      coverLetterSent: false,
      portfolioSent: false,
      followUpDone: false,
    },
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-app-6',
    company: 'TotalEnergies',
    role: 'Analyste Cash Management & Forecast',
    status: 'rejected',
    appliedDate: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
    followUpDate: new Date(Date.now() - 18 * 86400000).toISOString().split('T')[0],
    location: 'Courbevoie',
    contractType: 'CDI',
    score: 68,
    notes: 'Refus reçu par email automatisé : profil trop orienté PME/ETI plutôt que dérivés pétroliers.',
    checklist: {
      cvSent: true,
      coverLetterSent: true,
      portfolioSent: false,
      followUpDone: true,
    },
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
];

// Analyse ATS fictive pré-calculée
export const DEMO_FICTITIOUS_ANALYSIS: AnalysisHistoryItem = {
  id: 'demo-analysis-innovfinance-1',
  timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
  title: 'Audit ATS Démo : Responsable Trésorerie (InnovFinance)',
  company: 'InnovFinance Group',
  role: 'Responsable Trésorerie & Outils Financiers',
  cvSnippet: 'THOMAS LAURENT - RESPONSABLE TRÉSORERIE & CASH MANAGEMENT',
  jobSnippet: 'InnovFinance Group - Responsable Trésorerie & Outils Financiers (H/F)',
  cvText: DEMO_FICTITIOUS_CV,
  jobText: DEMO_FICTITIOUS_JOB,
  score: 89,
  fileName: 'cv_thomas_laurent_demo.txt',
  fileType: 'text/plain',
  jobUrl: 'https://careers.innovfinance.com/jobs/tresorier',
  analysisResult: `### SCORE GLOBAL D'ADÉQUATION ATS : 89/100

#### 1. Mots-clés Maîtrisés (Points Forts)
- **TMS & Outils** : Maîtrise attestée d'AGICAP et Kyriba, parfaitement en phase avec l'annonce.
- **Protocoles bancaires** : EBICS, SEPA et sécurité des règlements validés.
- **Forecast de trésorerie** : Expérience solide sur les prévisions glissantes à 13 semaines.
- **Cash pooling** : Optimisation des équilibrages éprouvée sur plusieurs filiales.

#### 2. Axes d'Amélioration Recommandés
- Préciser la volumétrie des flux quotidiens (nombre de comptes et transactions).
- Mettre en avant le rôle de chef de projet lors de l'intégration du progiciel financier.

#### 3. Conseils pour l'Entretien avec le DAF
- Valoriser l'autonomie sur les arbitrages de trésorerie multi-devises.
- Préparer un exemple concret de résolution de litige bancaire ou d'optimisation de BFR.`,
};

/**
 * Fonctions de filtrage pour garantir que les données de démo ne sont
 * JAMAIS sauvegardées ni mélangées dans les données réelles de l'utilisateur.
 */
export function isDemoId(id?: string | null): boolean {
  if (!id) return false;
  return (
    id.startsWith('demo-') ||
    id.startsWith('app-sample-') ||
    id.startsWith('sample-') ||
    id === 'app-1' ||
    id === 'app-2' ||
    id === 'app-3' ||
    id === 'cv-default-1' ||
    id === 'cv-tech-2'
  );
}

export function isDemoApplication(app?: ApplicationItem | null): boolean {
  if (!app) return false;
  if (isDemoId(app.id)) return true;
  if ((app as any).isDemo === true) return true;
  return false;
}

export function filterOutDemoApplications(apps: ApplicationItem[]): ApplicationItem[] {
  if (!Array.isArray(apps)) return [];
  return apps.filter((a) => !isDemoApplication(a));
}
