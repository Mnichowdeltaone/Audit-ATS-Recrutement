export interface CvTemplateItem {
  id: string;
  title: string;
  targetRole: string;
  sector: 'tech' | 'finance' | 'marketing' | 'sales' | 'engineering' | 'health' | 'hospitality' | 'hr_legal' | 'logistics';
  sectorLabel: string;
  language: 'fr' | 'en' | 'es' | 'de';
  languageLabel: string;
  profileType: 'junior' | 'reconversion' | 'senior' | 'technique' | 'freelance';
  profileLabel: string;
  description: string;
  highlights: string[];
  rawText: string;
}

export const SECTORS = [
  { id: 'all', label: 'Tous les secteurs', icon: '🌐' },
  { id: 'tech', label: 'Tech, Informatique & Data', icon: '💻' },
  { id: 'finance', label: 'Finance, Comptabilité & Audit', icon: '📊' },
  { id: 'marketing', label: 'Marketing, Communication & Web', icon: '📈' },
  { id: 'sales', label: 'Commerce, Vente & Business Dev', icon: '🤝' },
  { id: 'engineering', label: 'Ingénierie & Industrie', icon: '⚙️' },
  { id: 'health', label: 'Santé, Médical & Pharmacie', icon: '🏥' },
  { id: 'hospitality', label: 'Hôtellerie, Restauration & Tourisme', icon: '🛎️' },
  { id: 'hr_legal', label: 'RH, Recrutement & Juridique', icon: '⚖️' },
  { id: 'logistics', label: 'Logistique & Supply Chain', icon: '📦' },
] as const;

export const LANGUAGES = [
  { id: 'all', label: 'Toutes les langues', flag: '🌍' },
  { id: 'fr', label: 'Français 🇫🇷', flag: '🇫🇷' },
  { id: 'en', label: 'Anglais (International / US / UK) 🇬🇧', flag: '🇬🇧' },
  { id: 'es', label: 'Espagnol 🇪🇸', flag: '🇪🇸' },
  { id: 'de', label: 'Allemand 🇩🇪', flag: '🇩🇪' },
] as const;

export const PROFILE_TYPES = [
  { id: 'all', label: 'Tous les profils', badge: '🎯' },
  { id: 'junior', label: 'Étudiant / Jeune Diplômé', badge: '🎓' },
  { id: 'reconversion', label: 'Reconversion Professionnelle', badge: '🔄' },
  { id: 'senior', label: 'Cadre Senior / Management', badge: '👔' },
  { id: 'technique', label: 'Profil Opérationnel & Expert', badge: '🛠️' },
  { id: 'freelance', label: 'Freelance & Consultant', badge: '🚀' },
] as const;

export const CV_TEMPLATES_CATALOG: CvTemplateItem[] = [
  // 1. Tech Senior - Français
  {
    id: 'tech-senior-fr',
    title: 'Lead Développeur Fullstack & Cloud',
    targetRole: 'Lead Développeur Fullstack (TypeScript • React • Node)',
    sector: 'tech',
    sectorLabel: 'Tech, Informatique & Data',
    language: 'fr',
    languageLabel: 'Français',
    profileType: 'senior',
    profileLabel: 'Cadre Senior / Management',
    description: 'Structure technique haute performance optimisée ATS avec métriques de disponibilité et architecture Cloud.',
    highlights: ['Microservices', 'Gestion d’équipe (5 devs)', '+2M requêtes/jour', 'CI/CD Docker & AWS'],
    rawText: `PRÉNOM NOM
Lead Développeur Fullstack | Cloud & Architectures Scalables
Paris, France | 06 12 34 56 78 | prenom.nom@email.com | linkedin.com/in/profil | github.com/profil

RÉSUMÉ PROFESSIONNEL
Ingénieur logiciel avec 7 ans d'expérience dans la conception d'architectures web haute disponibilité et la direction technique d'équipes agiles. Expert en TypeScript, React, Node.js et infrastructures cloud serverless (AWS). Capacité démontrée à réduire les temps de chargement de 40% et à diriger des projets critiques traitant plusieurs millions de requêtes quotidiennes.

COMPÉTENCES CLÉS
- Langages & Frameworks : TypeScript, JavaScript ES6+, Python, React, Next.js, Node.js, Express, NestJS
- Bases de données : PostgreSQL, Redis, MongoDB, Prisma, DynamoDB
- Cloud & DevOps : AWS (ECS, Lambda, S3), Docker, Kubernetes, CI/CD GitHub Actions, Terraform
- Architecture & Méthodes : Microservices, API REST / GraphQL, TDD (Jest, Cypress), Agile Scrum (Scrum Master certifié)

EXPÉRIENCE PROFESSIONNELLE

LEAD DÉVELOPPEUR FULLSTACK | FinTech Innovations, Paris | 2022 - Présent
- Pilotage de l'architecture technique et encadrement d'une équipe de 6 développeurs front-end et back-end.
- Conception et mise en production d'une plateforme de paiement en temps réel traitant plus de 2.5M de transactions/jour (disponibilité 99.98%).
- Diminution des temps de réponse API de 65% grâce au partitionnement PostgreSQL et à la mise en cache Redis.
- Réduction du cycle de release de 2 semaines à des déploiements continus quotidiens via des pipelines CI/CD automatisés.

DÉVELOPPEUR FULLSTACK SENIOR | SaaS Solutions, Lyon | 2019 - 2022
- Développement des modules de facturation et de gestion d'utilisateurs pour 60 000 clients B2B actifs.
- Migration complète d'un monolithe hérité vers une architecture microservices conteneurisée avec Docker.
- Rédaction d'une suite de tests unitaires et d'intégration portant la couverture de code de 42% à 88%.

FORMATION & CERTIFICATIONS
- Master Ingénierie des Systèmes d'Information | Université de Technologie (2018)
- Certification AWS Certified Solutions Architect – Associate (2023)
- Langues : Français (Natif), Anglais (Courant C1 - TOEIC 940)`,
  },

  // 2. Finance Contrôleur de Gestion - Français
  {
    id: 'finance-controleur-fr',
    title: 'Contrôleur de Gestion & Trésorerie',
    targetRole: 'Contrôleur de Gestion Senior | Pilotage Budgétaire & P&L',
    sector: 'finance',
    sectorLabel: 'Finance, Comptabilité & Audit',
    language: 'fr',
    languageLabel: 'Français',
    profileType: 'senior',
    profileLabel: 'Cadre Senior / Management',
    description: 'Aligné sur les exigences des directions financières : clôtures, prévisions de trésorerie glissante, ERP et gains chiffrés.',
    highlights: ['P&L 45 M€', 'Optimisation BFR (-12j)', 'ERP SAP & Agicap', 'Clôtures mensuelles J+3'],
    rawText: `PRÉNOM NOM
Contrôleur de Gestion Senior | Pilotage de la Performance & Trésorerie
Bordeaux, France | 06 22 33 44 55 | prenom.nom@email.com | linkedin.com/in/profil

PROFIL PROFESSIONNEL
Contrôleur de gestion rigoureux avec 6 années d'expérience en ETI et cabinet d'audit. Spécialiste du pilotage budgétaire (P&L 50M€), du cash management et de la mise en place de tableaux de bord décisionnels automatisés sous Power BI et SAP. Reconnu pour sa capacité à identifier des leviers d'économies substantiels (-1.8M€ sur 2 ans) et à fiabiliser les prévisions de clôture à J+3.

COMPÉTENCES TECHNIQUES & EXPERTISE
- Contrôle financier : Élaboration budgétaire, Business Plans, Analyse des écarts, Calcul des coûts de revient, Audit interne
- Trésorerie & BFR : Prévisions de trésorerie glissantes 12 mois, Négociation bancaire, Rapprochements et gestion des covenants
- Progiciels & Outils : SAP FICO, Sage 1000, Agicap, Kyriba, Power BI, Excel avancé (VBA, Power Query, Tableaux dynamiques)
- Normes & Réglementation : Normes IFRS, Plan Comptable Général (PCG), Fiscalité d'entreprise, Fiscalité de groupe

EXPÉRIENCES PROFESSIONNELLES

CONTRÔLEUR DE GESTION SENIOR | Groupe Industriel Sud-Ouest | 2021 - Présent
- Pilotage du budget annuel consolidé (Chiffre d'affaires : 48M€, 3 usines de production, 250 collaborateurs).
- Clôtures comptables mensuelles rigoureuses à J+3 avec reporting commenté au Comité de Direction.
- Mise en place d'un programme d'optimisation du Besoin en Fonds de Roulement (BFR) : gain de 12 jours de DSO et libération de 920 000€ de trésorerie.
- Déploiement d'un reporting automatisé Power BI remplaçant 15 fichiers Excel manuels, économisant 3 jours de travail par mois.

AUDITEUR FINANCIER & CONTRÔLEUR JUNIOR | Cabinet d'Audit & Conseil, Paris | 2018 - 2021
- Audit légal des comptes annuels et consolidés de 14 entreprises du secteur de la distribution et des services.
- Analyse des procédures de contrôle interne et rédaction des notes de synthèse aux commissaires aux comptes.

DIPLÔMES & LANGUES
- Master 2 Finance d'Entreprise & Contrôle de Gestion | IAE Bordeaux (2018)
- DSCG (Diplôme Supérieur de Comptabilité et de Gestion) - 5 épreuves validées
- Langues : Français (Natif), Anglais (Professionnel B2 - négociation financière)`,
  },

  // 3. International Software Engineer - Anglais (US/UK ATS Format)
  {
    id: 'tech-software-engineer-en',
    title: 'Senior Software Engineer (International US/UK)',
    targetRole: 'Senior Software Engineer | Backend & Cloud Distributed Systems',
    sector: 'tech',
    sectorLabel: 'Tech, Informatique & Data',
    language: 'en',
    languageLabel: 'Anglais 🇬🇧',
    profileType: 'technique',
    profileLabel: 'Profil Opérationnel & Expert',
    description: 'Format standard anglo-saxon sans photo respectant les normes US/UK ATS, axé sur les résultats mesurables (STAR).',
    highlights: ['US/UK Standard ATS', '99.99% Uptime', '+35% Throughput', 'Python, Go, AWS'],
    rawText: `FIRSTNAME LASTNAME
Senior Software Engineer | Distributed Systems & Cloud Platforms
London, UK / Remote | +44 7123 456789 | firstname.lastname@email.com | linkedin.com/in/profile | github.com/profile

PROFESSIONAL SUMMARY
Results-driven Senior Backend Engineer with 6+ years of experience engineering resilient distributed architectures, scalable microservices, and cloud-native solutions. Proven track record of scaling high-throughput applications to 50k+ requests per second with 99.99% SLA. Proficient in Go, Python, PostgreSQL, and AWS infrastructure automation.

CORE COMPETENCIES
- Programming Languages: Go (Golang), Python, TypeScript, SQL
- Cloud & Infrastructure: AWS (EC2, S3, RDS, Lambda, SQS), Kubernetes, Docker, Terraform
- Databases & Storage: PostgreSQL, Redis (Caching/PubSub), Kafka, Elasticsearch
- Practices: Microservices Architecture, Event-Driven Design, CI/CD, Agile/Scrum, High Availability

PROFESSIONAL EXPERIENCE

SENIOR BACKEND ENGINEER | ScaleUp Global Ltd, London | 2022 - Present
- Architected and shipped an event-driven payment processing engine handling $120M in monthly transactional volume.
- Reduced database latency by 42% through query index restructuring and asynchronous caching using Redis.
- Orchestrated container deployment across multi-region Kubernetes clusters, achieving 99.99% system uptime over 18 months.
- Mentored 4 mid-level engineers, instituting code review standards that reduced production defects by 30%.

SOFTWARE ENGINEER | DataTech Solutions, London | 2019 - 2022
- Developed RESTful and gRPC microservices serving 400,000 daily active users with sub-80ms response times.
- Automated end-to-end integration testing in GitLab CI, cutting average release deployment times from 45 to 9 minutes.
- Refactored legacy monolithic services into decoupled Go microservices, improving throughput by 35%.

EDUCATION & CERTIFICATIONS
- B.Sc. in Computer Science (First Class Honours) | University of Bristol (2019)
- AWS Certified Developer – Associate (2023)
- Languages: English (Fluent/Bilingual), French (Professional)`,
  },

  // 4. Marketing & Digital - Reconversion Professionnelle
  {
    id: 'marketing-reconversion-fr',
    title: 'Chef de Projet Marketing Digital (Reconversion)',
    targetRole: 'Chef de Projet Marketing Digital | Social Media & Acquisition',
    sector: 'marketing',
    sectorLabel: 'Marketing, Communication & Web',
    language: 'fr',
    languageLabel: 'Français',
    profileType: 'reconversion',
    profileLabel: 'Reconversion Professionnelle',
    description: 'Idéal pour valoriser une transition de carrière : met en avant les compétences transversales, certifications récentes et ROI.',
    highlights: ['Compétences transverses', 'Certifié Google & HubSpot', '+45% trafic organique', 'Gestion de budget'],
    rawText: `PRÉNOM NOM
Chef de Projet Marketing Digital | Stratégie d'Acquisition & Contenus
Nantes, France | 06 44 55 66 77 | prenom.nom@email.com | linkedin.com/in/profil | portfolio.fr

OBJECTIF PROFESSIONNEL
Fort d'un parcours de 5 ans dans la relation client et la gestion de projet événementiel, j'ai enrichi mon profil d'une formation certifiante intensive en Marketing Digital et Growth. Je combine rigueur organisationnelle, aisance relationnelle et maîtrise des outils d'acquisition de trafic (SEO/SEA, Meta Ads, CRM) pour booster la visibilité et le taux de conversion des entreprises en croissance.

COMPÉTENCES CLÉS
- Acquisition & Traffic : SEO (On-page/Off-page), Google Ads (Search & Display), Meta Business Manager, LinkedIn Ads
- Outils & Analytics : Google Analytics 4, Google Tag Manager, SEMrush, HubSpot CRM, Brevo, Canva Pro, WordPress
- Création & Contenu : Copywriting persuasif, Rédaction web optimisée, E-mailing automatisé, Stratégie social media
- Gestion de projet : Planification de campagnes, Gestion de budget (jusqu'à 25k€), Rétroplanning, Reporting ROI

EXPÉRIENCE PROFESSIONNELLE

CHARGÉ DE MARKETING DIGITAL (Mission & Alternance) | Agence E-Commerce Ouest | 2023 - 2024
- Pilotage des campagnes Google Ads et Meta Ads pour 4 clients e-commerce (ROAS moyen atteint : 4.2x).
- Optimisation SEO d'un site catalogue de 150 pages : progression de +45% du trafic organique sur les mots-clés cibles en 6 mois.
- Mise en place d'un tunnel d'automatisation e-mail de bienvenue et panier abandonné (taux de conversion de 8.5%).

COORDINATEUR DE PROJETS ÉVÉNEMENTIELS & RELATION CLIENT | Evenements Prestige, Angers | 2019 - 2023
- Organisation complète de 35 événements professionnels (salons, séminaires) pour des budgets de 15k€ à 80k€.
- Négociation auprès de 50 prestataires et encadrement d'équipes d'accueil (jusqu'à 15 personnes sur site).
- Taux de satisfaction client maintenu à 96% grâce à un sens aigu du service et de la réactivité opérationnelle.

FORMATION & CERTIFICATIONS
- Titre Professionnel Chef de Projet Marketing Digital (Niveau 6 / Bac+4) | OpenClassrooms (2024)
- Certifications : Google Analytics 4 (2024), Inbound Marketing HubSpot (2024), Google Ads Search (2023)
- Licence Langues Étrangères Appliquées (LEA Anglais-Espagnol) | Université d'Angers (2019)`,
  },

  // 5. Commercial B2B Senior - Français
  {
    id: 'sales-b2b-senior-fr',
    title: 'Directeur Commercial / Key Account Manager B2B',
    targetRole: 'Directeur Commercial B2B | Grands Comptes & SaaS',
    sector: 'sales',
    sectorLabel: 'Commerce, Vente & Business Dev',
    language: 'fr',
    languageLabel: 'Français',
    profileType: 'senior',
    profileLabel: 'Cadre Senior / Management',
    description: 'Orienté résultats chiffrés, quotas dépassés, méthodologie de vente MEDDIC et management d’équipe commerciale.',
    highlights: ['+135% quota atteint', '1.8 M€ ARR signé', 'Management 8 commerciaux', 'Méthode MEDDIC & Salesforce'],
    rawText: `PRÉNOM NOM
Directeur Commercial B2B | Développement Grands Comptes & SaaS
Paris, France | 06 77 88 99 00 | prenom.nom@email.com | linkedin.com/in/profil

RÉSUMÉ PROFESSIONNEL
Leader commercial avec 8 ans d'expérience dans la vente de solutions logicielles complexes et la direction d'équipes commerciales B2B. Spécialiste de la négociation auprès d'interlocuteurs C-Level (DG, DAF, DSI) et de la méthode MEDDIC. Habitué au dépassement constant des objectifs annuels (+130% en moyenne) et au recrutement, coaching et montée en compétences de forces de vente performantes.

COMPÉTENCES STRATÉGIQUES & COMMERCIALES
- Vente stratégique : Vente en cycle long (6 à 12 mois), Négociation de contrats pluriannuels (>100k€), Prospection C-Level
- Méthodologies de vente : MEDDIC, Challenger Sale, Command of the Message, Social Selling sur LinkedIn
- Outils CRM & SalesTech : Salesforce, HubSpot Enterprise, Salesloft, Cognism, Apollo.io, Gong.io
- Management : Recrutement, Élaboration des grilles de commissions, Définition des quotas et pilotage du pipe commercial

EXPÉRIENCE PROFESSIONNELLE

DIRECTEUR DES VENTES B2B | Editeur SaaS Entreprise, Paris | 2021 - Présent
- Encadrement d'une équipe de 8 personnes (4 Account Executives, 3 SDRs et 1 Account Manager).
- Atteinte et dépassement de l'objectif d'ARR : 2.4M€ de nouveau chiffre d'affaires récurrent annuel signé en 2023 (+128% du quota).
- Négociation personnelle de 5 contrats stratégiques auprès d'entreprises du CAC 40 (valeur moyenne de contrat : 180 000€).
- Réduction du cycle moyen de vente de 95 jours à 68 jours grâce à l'implémentation de la méthode MEDDIC.

SENIOR KEY ACCOUNT MANAGER | Groupe Solutions Digitales, Paris | 2018 - 2021
- Développement d'un portefeuille de 25 comptes du secteur bancaire et assurance.
- Génération de 1.4M€ de commandes annuelles et réduction du taux de churn client à moins de 3.5%.

FORMATION & DIPLÔMES
- Master Grande École en Management & Commerce International | KEDGE Business School (2017)
- Langues : Français (Natif), Anglais (Courant C1 - négociations contractuelles internationales)`,
  },

  // 6. Jeune Diplômé / Étudiant Ingénieur - Français
  {
    id: 'ingenieur-junior-fr',
    title: 'Ingénieur R&D / Systèmes Embarqués (Jeune Diplômé)',
    targetRole: 'Ingénieur Systèmes Embarqués & IoT | Débutant / Premier Emploi',
    sector: 'engineering',
    sectorLabel: 'Ingénierie & Industrie',
    language: 'fr',
    languageLabel: 'Français',
    profileType: 'junior',
    profileLabel: 'Étudiant / Jeune Diplômé',
    description: 'Conçu pour valoriser les stages de fin d’études, projets de labo, projets académiques et compétences logicielles/matérielles.',
    highlights: ['Stage de fin d’études 6 mois', 'Projet de fin d’études primé', 'C/C++, FreeRTOS, STM32', 'Méthodes agiles'],
    rawText: `PRÉNOM NOM
Ingénieur Systèmes Embarqués & Objets Connectés (IoT)
Toulouse, France | 06 11 33 55 77 | prenom.nom@email.com | linkedin.com/in/profil | github.com/profil

PROFIL PERSONNEL
Diplômé d'école d'ingénieurs spécialité Systèmes Embarqués, passionné par le développement bas niveau (C/C++), les microcontrôleurs ARM et les protocoles de communication IoT (BLE, LoRa). Rigoureux et curieux, fort d'une expérience de 6 mois de stage en R&D aéronautique, prêt à m'investir sur des projets innovants à fort impact technique.

COMPÉTENCES TECHNIQUES
- Langages & Systèmes : C, C++, Python, Linux Embarqué (Yocto), FreeRTOS, Bare-Metal
- Microcontrôleurs & Cartes : STM32 (Cortex-M), ESP32, PIC, Raspberry Pi, Arduino
- Protocoles de Communication : UART, SPI, I2C, CAN, BLE, LoRaWAN, MQTT, ZigBee
- Outils de test & Mesure : Oscilloscope, Analyseur logique, STM32CubeIDE, Keil, Git, KiCad (schémas PCB)

EXPÉRIENCE PROFESSIONNELLE & STAGES

INGÉNIEUR SYSTÈMES EMBARQUÉS (Stage de Fin d'Études - 6 mois) | AéroTech Systèmes, Toulouse | Mars 2024 - Août 2024
- Conception et développement du firmware en C sur microcontrôleur STM32 pour un capteur embarqué de pression d'air.
- Implémentation d'un protocole de transmission de données sécurisé par bus CAN avec un temps de réponse inférieur à 5ms.
- Rédaction de la documentation technique et des plans de tests d'intégration (bancs de tests automatisés en Python).
- Respect des normes de sûreté de fonctionnement et participation active aux revues de conception.

PROJET DE FIN D'ÉTUDES (Projet d'équipe de 5 personnes - 8 mois) | École d'Ingénieurs | 2023 - 2024
- Réalisation d'une station météo connectée autonome à basse consommation énergétique sous FreeRTOS et ESP32.
- Autonomie sur batterie optimisée de 14 jours grâce à l'implémentation de modes veille profonde (Deep Sleep).

FORMATION
- Diplôme d'Ingénieur Habilité CTI (Grade de Master) en Électronique & Systèmes Embarqués | INSA Toulouse (2024)
- Semestre académique international en génie logiciel | Polytechnique Montréal, Canada (2023)
- Langues : Français (Natif), Anglais (Niveau B2 - TOEIC 860), Espagnol (Notions)`,
  },

  // 7. Santé & Paramédical - Français
  {
    id: 'sante-infirmier-fr',
    title: 'Infirmier Diplômé d’État (IDE) / Soins Critiques',
    targetRole: 'Infirmier Diplômé d’État (IDE) | Urgences & Réanimation',
    sector: 'health',
    sectorLabel: 'Santé, Médical & Pharmacie',
    language: 'fr',
    languageLabel: 'Français',
    profileType: 'technique',
    profileLabel: 'Profil Opérationnel & Expert',
    description: 'Structuré pour les établissements de soins : protocoles hospitaliers, gestes d’urgence, traçabilité et travail en équipe pluridisciplinaire.',
    highlights: ['Urgences & Réanimation', 'Traçabilité dossier patient', 'AFGSU Niveau 2', 'Sens de l’écoute & Rigueur'],
    rawText: `PRÉNOM NOM
Infirmier Diplômé d'État (IDE) | Soins d'Urgence & Médecine Polyvalente
Marseille, France | 06 33 22 11 00 | prenom.nom@email.com | Numéro ADELI : 13XXXXXXXXX

RÉSUMÉ PROFESSIONNEL
Infirmier diplômé d'État fort de 4 années d'expérience en service des urgences et de réanimation. Habitué aux situations de crise et au travail en équipe pluridisciplinaire dans des environnements à fort flux. Reconnu pour ma rigueur d'exécution des protocoles de soins, mon sens de l'observation clinique et mon empathie auprès des patients et de leurs familles.

COMPÉTENCES CLINIQUES & TECHNIQUES
- Soins infirmiers : Prélèvements veineux/artériels, Voies veineuses périphériques, Administration de thérapeutiques, Pansements complexes
- Urgences & Réanimation : Prise en charge des détresses vitales, Surveillance scopique, Gestion des PSE et respirateurs, Triage IOA
- Traçabilité & Outils : Maîtrise des logiciels hospitaliers (DxCare, Sillage, Crossway), Tenue rigoureuse du dossier de soins informatisé
- Qualité & Sécurité : Application stricte des protocoles d'hygiène hospitalière (CLIN), Gestion de la douleur, Éducation thérapeutique

EXPÉRIENCE PROFESSIONNELLE

INFIRMIER EN SERVICE D'URGENCES | Centre Hospitalier Universitaire, Marseille | 2022 - Présent
- Accueil et prise en charge médicale de 40 à 60 patients par garde de 12 heures dans le respect des priorités cliniques.
- Réalisation des gestes techniques d'urgence en salle de déchocage en collaboration directe avec le médecin urgentiste.
- Transmission ciblée orale et écrite garantissant la continuité absolue des soins lors des changements d'équipe.
- Encadrement et tutorat de 6 étudiants infirmiers et aides-soignants stagiaires sur l'année.

INFIRMIER EN MÉDECINE POLYVALENTE | Clinique Médicale, Aix-en-Provence | 2020 - 2022
- Prise en charge globale de 14 patients hospitalisés (évaluation de l'état clinique, bilans réguliers, préparation des sorties).
- Prévention des risques iatrogènes, escarres et chutes chez les patients âgés ou dépendants.

DIPLÔMES & CERTIFICATIONS
- Diplôme d'État d'Infirmier (IDE) | IFSI Marseille (2020)
- Attestation de Formation aux Gestes et Soins d'Urgence (AFGSU 2) - À jour 2024
- Formation complémentaire : Prise en charge de la douleur aiguë et chronique (2023)`,
  },

  // 8. Espagnol - Commercial & Marketing (LatAm / España)
  {
    id: 'ventas-marketing-es',
    title: 'Responsable de Ventas y Desarrollo de Negocio (Español)',
    targetRole: 'Responsable de Desarrollo de Negocio B2B | Ventas Internacionales',
    sector: 'sales',
    sectorLabel: 'Commerce, Vente & Business Dev',
    language: 'es',
    languageLabel: 'Espagnol 🇪🇸',
    profileType: 'senior',
    profileLabel: 'Cadre Senior / Management',
    description: 'Currículum Vitae profesional en español para España y Latinoamérica, adaptado a filtros ATS hispanohablantes.',
    highlights: ['Mercado España y LatAm', '+120% consecución de cuota', 'Gestión de CRM HubSpot', 'Negociación estratégica'],
    rawText: `NOMBRE APELLIDOS
Responsable de Desarrollo de Negocio B2B | Ventas Estratégicas y Cuentas Clave
Madrid, España | +34 600 123 456 | nombre.apellidos@email.com | linkedin.com/in/perfil

PERFIL PROFESIONAL
Profesional del desarrollo comercial con más de 5 años de trayectoria liderando la prospección, negociación y fidelización de cuentas corporativas en el sector tecnológico y de servicios B2B. Especialista en la apertura de nuevos mercados en España y Latinoamérica, superando de forma continuada los objetivos de venta anuales (+125%). Habilidad contrastada para alinear las necesidades del cliente con soluciones innovadoras de alto valor añadido.

COMPETENCIAS CLAVE
- Desarrollo Comercial: Venta consultiva en ciclo largo, Prospección multicanal, Negociación con directores C-Level (CEO, CFO, CTO)
- Metodologías y Estrategia: Venta de valor, Gestión del Pipeline, Account-Based Marketing (ABM), Presentaciones comerciales de impacto
- Herramientas Digitales: CRM Salesforce, HubSpot Sales Hub, LinkedIn Sales Navigator, ZoomInfo, Trello, Google Workspace
- Idiomas: Español (Nativo), Inglés (Competencia profesional completa C1), Francés (Intermedio B1)

EXPERIENCIA PROFESIONAL

RESPONSABLE DE VENTAS B2B | Software Solutions Iberia, Madrid | 2021 - Actualidad
- Liderazgo de la captación de cuentas clave en el sector financiero y de telecomunicaciones en España.
- Generación de más de 1.4M€ en nueva facturación anual (120% del objetivo fijado por la dirección general).
- Reducción del ciclo medio de venta de 80 a 52 días mediante la estandarización de la cualificación de oportunidades.
- Dirección de un equipo de 3 especialistas en desarrollo de ventas (SDRs), implementando planes de formación semanales.

EJECUTIVO DE CUENTAS SENIOR | Consultora de Negocios, Barcelona | 2018 - 2021
- Gestión de una cartera de 30 clientes corporativos, alcanzando una tasa de renovación de contratos del 95%.
- Apertura de 12 nuevas cuentas en el mercado latinoamericano (México y Colombia), aportando 600.000€ en ingresos.

FORMACIÓN ACADÉMICA
- Grado en Administración y Dirección de Empresas (ADE) | Universidad Carlos III de Madrid (2018)
- Certificación Internacional en Negociación y Cierre de Ventas B2B | Cámara de Comercio (2022)`,
  },

  // 9. Allemand - Ingénieur / Chef de Projet (Lebenslauf ATS)
  {
    id: 'ingenieur-lebenslauf-de',
    title: 'Projektleiter Ingenieurwesen (Lebenslauf Deutsch)',
    targetRole: 'Technischer Projektleiter / Senior Ingenieur Maschinenbau',
    sector: 'engineering',
    sectorLabel: 'Ingénierie & Industrie',
    language: 'de',
    languageLabel: 'Allemand 🇩🇪',
    profileType: 'senior',
    profileLabel: 'Cadre Senior / Management',
    description: 'Strukturierter deutscher Lebenslauf nach DIN-Normen für Deutschland, Österreich und die Schweiz (D-A-CH Raum).',
    highlights: ['D-A-CH Raum ATS', 'Projektbudget 3.5 Mio. €', 'Scrum & Six Sigma', 'Deutsch & Englisch C1'],
    rawText: `VORNAME NACHNAME
Technischer Projektleiter Maschinenbau | Industrie 4.0 & Fertigungsoptimierung
München, Deutschland | +49 89 12345678 | vorname.nachname@email.com | linkedin.com/in/profil

BERUFSPROFIL
Erfahrener technischer Projektleiter mit 6 Jahren Praxiserfahrung in der Automobil- und Maschinenbauindustrie. Spezialisiert auf die Planung, Steuerung und erfolgreiche Umsetzung komplexer Entwicklungsprojekte (Budgetvolumen bis 4 Mio. €). Starke Erfolgsbilanz in der Einführung schlanker Produktionsprozesse (Lean Management, Six Sigma) und der termingerechten Führung interdisziplinärer Projektteams.

FACHLICHE KOMPETENZEN & QUALIFIKATIONEN
- Projektmanagement: Agile Methoden (Scrum, Kanban), Wasserfall-Modell, Budget- und Ressourcenplanung, Risikomanagement
- Konstruktion & Fertigung: CAD (SolidWorks, CATIA V5), FMEA, Six Sigma (Green Belt zertifiziert), Qualitätsmanagement ISO 9001
- Software & IT: MS Project, SAP S/4HANA (Modul PP/MM), Jira, Confluence, Python für Datenanalyse
- Sprachen: Deutsch (Muttersprache), Englisch (Verhandlungssicher C1), Französisch (Grundkenntnisse A2)

BERUFLICHER WERDEGANG

SENIOR PROJEKTLEITER ENTWICKLUNG | Industrie Automation GmbH, München | 2021 - Heute
- Gesamtverantwortung für 3 Großprojekte zur Automatisierung von Produktionslinien (Gesamtbudget: 3.8 Mio. €).
- Leitung eines 12-köpfigen Teams bestehend aus Konstrukteuren, Softwareentwicklern und Fertigungstechnikern.
- Reduzierung der Durchlaufzeiten um 22% durch die Implementierung von Lean-Production-Standards und KVP-Workshops.
- Sicherstellung von 100% Termintreue bei der Auslieferung an internationale Schlüsselkunden in der D-A-CH Region.

ENTWICKLUNGSINGENIEUR MASCHINENBAU | TechSystems AG, Stuttgart | 2018 - 2021
- Konstruktion und Simulation mechatronischer Baugruppen für die Sensorik in der Automobilfertigung.
- Durchführung von Festigkeitsberechnungen und Betreuung von Prototypenprüfungen bis zur Serienreife.

AUSBILDUNG
- Master of Science (M.Sc.) Maschinenbau | Technische Universität München (2018)
- Zertifizierungen: PMP (Project Management Professional) Vorbereitung, Six Sigma Green Belt (2022)`,
  },

  // 10. Consultant / Freelance - Français
  {
    id: 'consultant-freelance-fr',
    title: 'Consultant Indépendant / Stratégie & Organisation',
    targetRole: 'Consultant Stratégie & Organisation | Missions Clients & Transformation',
    sector: 'finance',
    sectorLabel: 'Finance, Comptabilité & Audit',
    language: 'fr',
    languageLabel: 'Français',
    profileType: 'freelance',
    profileLabel: 'Freelance & Consultant',
    description: 'Orienté livrables, missions de conseil, gains clients concrets et autonomie de pilotage.',
    highlights: ['+12 missions réussies', 'Accompagnement Comex', 'Transformation digitale', 'ROI client moyen +30%'],
    rawText: `PRÉNOM NOM
Consultant Senior Indépendant | Stratégie, Organisation & Performance Opérationnelle
Paris & Remote, France | 06 88 77 66 55 | prenom.nom@email.com | linkedin.com/in/profil | siren: 123456789

POSITIONNEMENT & VALEUR AJOUTÉE
Consultant indépendant cumulant 8 ans d'expérience (ex-cabinet de conseil de premier rang et direction opérationnelle). J'accompagne les directions générales et comités de direction de PME et ETI dans leurs projets critiques de transformation, d'optimisation des processus métier et de restructuration organisationnelle. Approche pragmatique orientée livrables rapides et appropriation pérenne par les équipes clientes.

DOMAINES D'INTERVENTION
- Stratégie & Organisation : Diagnostic d'efficience opérationnelle, Cartographie des processus (BPMN), Conduite du changement
- Pilotage & Performance : Cadrage de projets complexes, Élaboration de feuilles de route stratégiques, AMOA SI
- Outils & Méthodes : Lean Management, Design Thinking, Jira, Miro, Notion, Suite Office avancée, Modélisation financière

MISSIONS DE CONSEIL RÉCENTES

CONSULTANT INDÉPENDANT EN ORGANISATION | Cabinet Conseil Indépendant | 2022 - Présent
- Mission ETI Agroalimentaire (180M€ CA - 9 mois) : Refonte de la gouvernance de la chaîne d'approvisionnement. Résultat : réduction des retards de livraison de 38% et baisse des coûts de stockage de 450 000€.
- Mission Scale-up Tech B2B (6 mois) : Structuration des processus de Customer Success et d'onboarding client. Résultat : diminution du délai d'implémentation de 45 à 24 jours et augmentation du CSAT client de 82% à 94%.
- Mission Groupe de Santé Privé (4 mois) : Audit organisationnel de 3 cliniques et rédaction du plan d'optimisation des plannings soignants.

CONSULTANT EN MANAGEMENT & ORGANISATION | Cabinet de Conseil Conseil & Associés, Paris | 2017 - 2022
- Direction opérationnelle de missions de transformation pour des comptes bancaires et industriels (équipes de 3 à 5 consultants).
- Réalisation de benchmarks sectoriels et animation de 40+ ateliers de co-conception avec les directions métiers.

FORMATION
- Master en Management Stratégique & Conseil | ESCP Business School (2017)
- Certification Lean Six Sigma Black Belt (2021)
- Langues : Français (Natif), Anglais (Bilingue C2)`,
  },

  // 11. Hôtellerie & Restauration - Français
  {
    id: 'hotellerie-responsable-fr',
    title: 'Responsable d’Exploitation / Maître d’Hôtel',
    targetRole: 'Responsable d’Exploitation Hôtelière & Restauration',
    sector: 'hospitality',
    sectorLabel: 'Hôtellerie, Restauration & Tourisme',
    language: 'fr',
    languageLabel: 'Français',
    profileType: 'technique',
    profileLabel: 'Profil Opérationnel & Expert',
    description: 'Standards d’excellence de service, gestion des plannings, ratios d’hygiène HACCP et rentabilité food & beverage.',
    highlights: ['Établissement 4 & 5 étoiles', 'Gestion d’équipe 20 personnes', 'Normes HACCP strictes', 'Satisfaction client 98%'],
    rawText: `PRÉNOM NOM
Responsable d'Exploitation Hôtellerie & Restauration | Gestion d'Équipe & Expérience Client
Nice, France | 06 55 44 33 22 | prenom.nom@email.com | linkedin.com/in/profil

RÉSUMÉ PROFESSIONNEL
Professionnel passionné de l'hôtellerie-restauration haut de gamme avec 7 ans d'expérience au sein d'établissements 4 et 5 étoiles. Expert en gestion opérationnelle des services, management d'équipes pluridisciplinaires (jusqu'à 25 collaborateurs), optimisation des ratios de coûts (Food & Beverage cost) et maintien d'un niveau d'excellence reconnu dans l'accueil et la fidélisation de la clientèle internationale.

COMPÉTENCES OPÉRATIONNELLES
- Gestion d'exploitation : Organisation des services, Gestion des plannings, Optimisation des coûts matières, Gestion des stocks
- Normes & Sécurité : Maîtrise des protocoles d'hygiène HACCP, Normes de sécurité ERP, Contrôle qualité quotidien
- Logiciels hôteliers : Opera PMS, Micros Fidelio, Lightspeed, Zenchef, Excel, Pack Office
- Langues étrangères : Français (Natif), Anglais (Courant C1 - accueil clientèle internationale), Italien (Opérationnel B1)

EXPÉRIENCE PROFESSIONNELLE

RESPONSABLE D'EXPLOITATION & RESTAURATION | Hôtel & Spa 4 Étoiles, Côte d'Azur | 2021 - Présent
- Pilotage quotidien du service de restauration (120 couverts/jour) et des événements privés (séminaires, mariages jusqu'à 200 convives).
- Encadrement, recrutement et formation d'une brigade de 18 personnes en salle et au bar.
- Réduction du F&B cost de 34% à 29.5% grâce à une renégociation rigoureuse des accords fournisseurs et à la limitation des pertes.
- Progression de la note de satisfaction client sur TripAdvisor de 4.3/5 à 4.8/5 en 18 mois.

MAÎTRE D'HÔTEL / ADJOINT DE DIRECTION | Brasserie Gastronomique, Lyon | 2018 - 2021
- Accueil personnalisé d'une clientèle exigeante et fidélisation de la clientèle d'affaires locale.
- Supervision des inventaires mensuels et gestion des flux de caisse journaliers.

FORMATION
- BTS Management en Hôtellerie-Restauration (Option A Management d'unité de restauration) | Lycée Hôtelier de Nice (2018)
- Formation certifiante HACCP & Hygiène Alimentaire (Renouvelée 2024)`,
  },

  // 12. Ressources Humaines & Juridique - Français
  {
    id: 'rh-recruteur-fr',
    title: 'Responsable Recrutement & Talent Acquisition',
    targetRole: 'Responsable Recrutement & Talent Acquisition | Marque Employeur',
    sector: 'hr_legal',
    sectorLabel: 'RH, Recrutement & Juridique',
    language: 'fr',
    languageLabel: 'Français',
    profileType: 'senior',
    profileLabel: 'Cadre Senior / Management',
    description: 'Orienté ATS, sourcing sur LinkedIn Recruiter, marque employeur, onboarding et entretiens par compétences.',
    highlights: ['+60 recrutements/an', 'Délai d’embauche -25%', 'LinkedIn Recruiter & ATS', 'Marque employeur'],
    rawText: `PRÉNOM NOM
Responsable Recrutement & Talent Acquisition | Marque Employeur & Sourcing
Lille, France | 06 66 55 44 33 | prenom.nom@email.com | linkedin.com/in/profil

RÉSUMÉ PROFESSIONNEL
Spécialiste du recrutement et du développement des talents avec 5 ans d'expérience en cabinet de chasse de têtes et en entreprise en forte croissance. Passionné par l'expérience candidat, les approches de sourcing direct innovantes et la structuration des processus de recrutement basés sur les compétences. Capacité démontrée à clore plus de 60 recrutements stratégiques par an tout en réduisant le délai moyen d'embauche de 25%.

COMPÉTENCES CLÉS
- Sourcing & Chasse : Sourcing direct avancé sur LinkedIn Recruiter, Boolean search, Approche directe de profils pénuriques
- Processus de sélection : Conduite d'entretiens structurés (STAR), Évaluation des soft skills, Prises de références, Tests techniques
- Outils RH & ATS : Greenhouse, Lever, Workable, Welcome to the Jungle, Taleo, Notion HR, Lucca
- Marque employeur : Participation aux forums écoles, Relations universités, Stratégie d'attractivité sur les réseaux sociaux

EXPÉRIENCE PROFESSIONNELLE

RESPONSABLE TALENT ACQUISITION | Entreprise Tech & Retail (450 salariés), Lille | 2022 - Présent
- Pilotage autonome de l'ensemble du cycle de recrutement pour les profils cadres, tech, vente et fonctions support (65 recrutements/an).
- Réduction du Time-to-Hire moyen de 52 jours à 36 jours grâce à l'optimisation des étapes de sélection dans l'ATS.
- Mise en place d'un parcours d'onboarding structuré de 30 jours, portant le taux de rétention post-période d'essai à 94%.
- Gestion des relations avec les écoles cibles et organisation de 4 hackathons de recrutement.

CONSULTANT EN RECRUTEMENT | Cabinet de Conseil en Recrutement, Paris | 2019 - 2022
- Prospection et gestion de comptes clients dans les secteurs banque, industrie et services.
- Chasse de têtes de profils experts et cadres intermédiaires (salaires de 45k€ à 85k€).

FORMATION
- Master 2 Gestion des Ressources Humaines & Droit Social | Université de Lille (2019)
- Langues : Français (Natif), Anglais (Courant B2/C1 - entretiens en anglais réguliers)`,
  },
];
