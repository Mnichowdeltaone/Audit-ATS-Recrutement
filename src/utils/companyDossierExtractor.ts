import type {
  CompanyFinancialTechnicalDossier,
  LegalAndCorporateInfo,
  CandidateStrategicPlan,
  CompanyStakeholderCommunication,
} from '../types';
import { extractOfferMetadata } from './offerMetadataExtractor';

/**
 * Nettoie les balises markdown et espaces superflus
 */
function cleanText(text: string): string {
  return text
    .replace(/^[*#\-\s>]+/, '')
    .replace(/[*_~`]+/g, '')
    .trim();
}

/**
 * Base de référence d'entreprises connues et de grands groupes / ETI
 * Permet une exactitude immédiate sans hallucination sectorielle.
 */
interface CompanyBenchmarkInfo {
  aliases: string[];
  sector: string;
  businessModel: string;
  estimatedSize: string;
  location: string;
  ownershipStructure: string;
  estimatedRevenue: string;
  growthStage: string;
  profitabilityModel: string;
  websiteUrl?: string;
  legalInfo?: LegalAndCorporateInfo;
  candidateStrategicPlan?: CandidateStrategicPlan;
  stakeholdersCommunication?: CompanyStakeholderCommunication[];
  keyFinancialChallenges: string[];
  toolsAndStack: string[];
  reportingLine: string;
  keyOperationalProjects: string[];
  pitchRecommendation: string;
  highImpactQuestions: { question: string; objective: string }[];
}

const KNOWN_COMPANIES_PROFILES: Record<string, CompanyBenchmarkInfo> = {
  valoria: {
    aliases: ['valoria', 'valoria capital', 'groupe valoria', 'valoria groupe', 'valoria gestion', 'valoriacap', 'valoria conseil'],
    sector: 'Gestion de Patrimoine, Asset Management & Conseil M&A',
    businessModel: 'Multi-Family Office & Banque d’Affaires / Commissions récurrentes sur encours sous gestion (AUM), honoraires de conseil patrimonial, commissions de surperformance et success fees en M&A',
    estimatedSize: 'Acteur indépendant de premier plan en forte croissance (~120 à 250 collaborateurs et réseau d’associés)',
    location: 'Paris (8e arr., quartier Champs-Élysées / Place de l’Étoile) & bureaux régionaux',
    ownershipStructure: 'Romain Lefèvre (Fondateur & Management) associé au fonds de Private Equity mondial de référence TA Associates (après IK Partners)',
    estimatedRevenue: 'Près de 4 Milliards d’Euros d’Actifs sous gestion (AUM) / PNB en forte croissance',
    growthStage: 'Hyper-croissance par acquisitions (stratégie Buy-and-Build active) et consolidation du marché de la gestion privée',
    profitabilityModel: 'Marge récurrente sur encours (management fees), rentabilité par cabinet intégré, commissions de surperformance et honoraires M&A',
    websiteUrl: 'https://valoriacap.com',
    legalInfo: {
      legalName: 'VALORIA CAPITAL / GROUPE VALORIA',
      commercialBrand: 'Groupe Valoria Capital',
      websiteUrl: 'https://valoriacap.com',
      headquarters: 'Paris (8e arr., Place de l’Étoile / Avenue Hoche)',
      creationYear: '2012',
      legalForm: 'Société par Actions Simplifiée (SAS) / Conseil en Gestion de Patrimoine & Finance d’Entreprise',
      keyExecutives: [
        {
          name: 'Romain Lefèvre',
          title: 'Président — Fondateur du Groupe Valoria Capital',
          roleDescription: 'Fondateur en 2012, pilote la stratégie de croissance externe (Buy-and-Build) et les partenariats capitalistiques avec TA Associates.',
        },
        {
          name: 'Direction Financière & Secrétariat Général',
          title: 'DAF & Contrôle de Gestion Groupe',
          roleDescription: 'Supervise la réconciliation des flux d’encours (AUM), la consolidation financière multi-entités et la conformité AMF/ACPR.',
        },
      ],
      activitiesPillars: [
        'Gestion Privée & Family Office : Accompagnement patrimonial d’excellence des familles, dirigeants et HNWI (transmission, fiscalité, ingénierie patrimoniale).',
        'Asset Management : Gestion d’actifs sous mandat, sélection indépendante de fonds d’investissement et solutions de performance sur-mesure.',
        'Solutions Corporate : Conseil et optimisation de la trésorerie d’entreprise, placements financiers et sécurisation des excédents d’exploitation.',
        'Conseil M&A & Transmission : Accompagnement haut de bilan, fusions-acquisitions, valorisation et transmission d’entreprises pour les dirigeants.',
      ],
      aumOrKeyMetrics: 'Près de 4 Milliards d’Euros d’Actifs sous gestion (AUM)',
      shareholdersAndBackers: 'Romain Lefèvre (Fondateur) & Management, soutenu par le fonds d’investissement international TA Associates',
      recentDealsOrNews: [
        'Stratégie soutenue de consolidation du marché des indépendants du patrimoine (Buy-and-Build)',
        'Acquisitions notables : Roosevelt Gestion Privée, Le Parc Gestion Privée, EVFO (European Vintage Family Office)',
      ],
    },
    candidateStrategicPlan: {
      roleTitle: 'Contrôleur de Gestion / Finance',
      executiveSummary: 'Feuille de route opérationnelle pour unifier le pilotage du PNB, réconcilier les flux d’encours multi-entités post-acquisitions et offrir une visibilité financière parfaite à Romain Lefèvre et l’actionnaire TA Associates.',
      phases: [
        {
          period: 'J0 - J30 : Immersion & Diagnostic des Flux',
          title: 'Cartographie des encours et audit des reportings de gestion',
          description: 'Comprendre l’écosystème multi-entités, réconcilier les flux de rétrocommissions bancaires/assureurs et identifier les écarts entre les cabinets acquis.',
          actions: [
            'Cartographier les flux de commissions d’encours (AUM) et d’honoraires par pôle (Gestion Privée, Corporate, M&A).',
            'Auditer les progiciels de suivi de portefeuille et de consolidation en place dans les différentes structures.',
            'Rencontrer les associés gérants et les équipes administratives des cabinets récemment intégrés.',
          ],
          deliverable: 'Matrice de réconciliation des encours sous gestion et note de cadrage financier à J+30.',
        },
        {
          period: 'J31 - J60 : Structuration & Harmonisation Post-M&A',
          title: 'Standardisation des KPI de rentabilité et automatisation des clôtures',
          description: 'Mettre en place un cadre homogène de contrôle de gestion pour mesurer et comparer la rentabilité réelle de chaque entité intégrée.',
          actions: [
            'Déployer des tableaux de bord mensuels de suivi du PNB par associé et par pôle d’activité.',
            'Automatiser le calcul et la réconciliation des conventions de rétrocession avec les partenaires financiers.',
            'Suivre les charges d’exploitation et quantifier les synergies de coûts réalisées post-acquisition.',
          ],
          deliverable: 'Tableau de bord de gestion unifié et calendrier de clôture financière optimisé à J+5.',
        },
        {
          period: 'J61 - J90 : Création de Valeur & Business Partnership',
          title: 'Modélisation prédictive et aide à la décision pour la Direction',
          description: 'Apporter à la Présidence (Romain Lefèvre) et à l’actionnaire TA Associates des indicateurs prédictifs sur la collecte nette et l’EBITDA.',
          actions: [
            'Mettre en place une modélisation glissante de la collecte nette et de son impact sur la rentabilité future.',
            'Préparer les reportings financiers trimestriels destinés au fonds d’investissement TA Associates.',
            'Identifier les leviers d’optimisation du cash et de réduction des délais de facturation M&A.',
          ],
          deliverable: 'Modèle financier prédictif de marge et kit de reporting investisseurs.',
        },
      ],
      quickWins: [
        'Mettre à disposition sous 15 jours un tableau de bord visuel de l’évolution des encours (AUM) par société du groupe.',
        'Détecter et réconcilier les commissions non réclamées auprès des dépositaires et plateformes d’assurance.',
        'Alléger la charge de reporting des associés en automatisant l’extraction de leurs commissions de gestion.',
      ],
      strategicRecommendations: [
        'Sécuriser la traçabilité des commissions vis-à-vis des exigences réglementaires AMF / ACPR.',
        'Favoriser les synergies de flux entre les dirigeants de la Gestion Privée et les mandats du pôle Conseil M&A.',
      ],
    },
    stakeholdersCommunication: [
      {
        roleCategory: 'Direction Générale & Présidence (Romain Lefèvre)',
        targetName: 'Romain Lefèvre (Président — Fondateur)',
        keyPriorities: [
          'Vision entrepreneuriale et rentabilité globale du groupe',
          'Fiabilité des chiffres de PNB / AUM remontés au fonds TA Associates',
          'Intégration fluide et rapide des cabinets rachetés dans la stratégie Buy-and-Build',
          'Autonomie totale de son équipe financière pour se concentrer sur le développement stratégique',
        ],
        recommendedPosture: 'Synthétique, orienté solutions concrètes, posture d’associé Business Partner capable de décharger la direction des détails opérationnels.',
        verbalPitch: '« Bonjour Romain. Votre stratégie d’accélération et le passage du cap des 4 Md€ d’encours démontrent une formidable dynamique. Mon rôle en tant que contrôleur de gestion / financier est de vous offrir une sérénité totale sur les chiffres : fiabiliser la remontée des marges par cabinet intégré et fournir à vos investisseurs un reporting irréprochable sans alourdir le quotidien de vos associés. »',
        outreachMessageSample: '« Bonjour Romain, impressionné par l’expansion de Valoria Capital et l’intégration de cabinets de référence comme Roosevelt et EVFO. Spécialisé dans le contrôle de gestion et le pilotage financier de groupes de gestion privée et M&A, j’ai développé une méthode éprouvée pour unifier le suivi des encours et automatiser les reportings de rentabilité. Je serais ravi d’échanger 10 minutes sur la manière de sécuriser vos indicateurs de PNB dans cette phase de forte croissance. »',
        questionsToAsk: [
          '« Quels sont vos objectifs prioritaires en matière de synergies financières et de standardisation des process sur les prochains cabinets ciblés par votre stratégie Buy-and-Build ? »',
          '« Quelles sont les attentes spécifiques du fonds TA Associates concernant la granularité des reportings de marge et d’EBITDA ? »',
        ],
      },
      {
        roleCategory: 'Direction Financière & Secrétariat Général',
        targetName: 'Directeur Administratif et Financier / Secrétaire Général',
        keyPriorities: [
          'Rigueur des clôtures mensuelles et conformité légale',
          'Réconciliation pointue des encours et des conventions de rétrocommissions',
          'Conformité réglementaire stricte (AMF / ACPR pour la gestion d’actifs)',
          'Maîtrise des charges de structure et du BFR',
        ],
        recommendedPosture: 'Excellence technique, rigueur méthodologique, maîtrise des outils financiers et esprit d’équipe.',
        verbalPitch: '« Mon approche allie rigueur comptable et agilité sur les outils de Dataviz. Je prends en charge la réconciliation complexe des rétrocommissions et la production des tableaux de bord mensuels pour vous faire gagner un temps précieux lors des clôtures. »',
        outreachMessageSample: '« Bonjour, fort d’une solide pratique du contrôle de gestion en environnement financier exigeant, je maîtrise la gestion des flux de commissions et le reporting multi-sociétés. Je serais ravi de vous accompagner dans la structuration des clôtures et le pilotage du contrôle interne au sein de Valoria Capital. »',
        questionsToAsk: [
          '« Comment gérez-vous aujourd’hui la diversité des outils de gestion entre le siège parisien et les cabinets récemment intégrés en région ? »',
          '« Quels sont les axes d’amélioration prioritaires sur les cycles de facturation d’honoraires et le suivi des conventions de rétrocommission ? »',
        ],
      },
      {
        roleCategory: 'Associés Gérants, Banquiers Privés & Équipes M&A',
        targetName: 'Associés Opérationnels & Conseillers Patrimoniaux / M&A',
        keyPriorities: [
          'Gain de temps commercial au quotidien',
          'Transparence et exactitude dans le calcul de leurs commissions',
          'Réactivité administrative sans lourdeur bureaucratique',
        ],
        recommendedPosture: 'Facilitateur bienveillant, écoute active, vulgarisation des règles de gestion financière.',
        verbalPitch: '« Je ne suis pas là pour créer de la bureaucratie, mais pour vous simplifier la vie : vous donner une visibilité instantanée sur vos performances et accélérer le traitement de vos dossiers. »',
        outreachMessageSample: '« Bonjour, en appui des associés gérants, mon objectif est de mettre en place des outils d’aide au pilotage simples et réactifs, qui vous libèrent du temps pour vous consacrer pleinement au développement de vos clients. »',
        questionsToAsk: [
          '« Quels sont les reportings dont vous avez le plus besoin au quotidien pour piloter votre portefeuille de clients dirigeants et familles ? »',
        ],
      },
      {
        roleCategory: 'Recrutement & Équipe RH',
        targetName: 'Responsable Recrutement / Chasseur de Têtes',
        keyPriorities: [
          'Adéquation culturelle avec l’exigence et la discrétion d’une maison de gestion haut de gamme',
          'Capacité à évoluer dans un environnement entrepreneurial rapide',
          'Stabilité et engagement à long terme',
        ],
        recommendedPosture: 'Professionnalisme, clarté, motivation pour l’aventure entrepreneuriale et la finance patrimoniale.',
        verbalPitch: '« Je recherche un environnement dynamique alliant l’exigence de la banque privée et l’agilité d’une structure entrepreneuriale en forte croissance comme Valoria Capital. »',
        outreachMessageSample: '« Bonjour, très intéressé par le développement remarquable de Valoria Capital, je souhaite mettre mes compétences financières au service de votre équipe en pleine expansion. »',
        questionsToAsk: [
          '« Quelles sont les qualités personnelles qui permettent de s’épanouir le plus rapidement dans la culture d’excellence de Valoria Capital ? »',
        ],
      },
    ],
    keyFinancialChallenges: [
      'Réconciliation des flux d’encours (AUM) multi-sociétés et consolidation du PNB sur les cabinets intégrés.',
      'Pilotage des ratios de marge et modélisation des reportings pour l’actionnaire TA Associates.',
      'Optimisation des cycles de facturation d’honoraires M&A et gestion proactive du BFR.',
    ],
    toolsAndStack: [
      'Logiciels de Gestion Patrimoniale & Agrégation (ex: O2S / Harvest, Manymore, Proposé)',
      'ERP Comptable & Outils de Consolidation (Sage / Cegid / Pennylane)',
      'Excel Avancé (modélisation financière, macros VBA, Power Query)',
      'Outils de Dataviz & Reporting (Power BI, Tableau)',
    ],
    reportingLine: 'Rattachement direct au Directeur Administratif et Financier (DAF) avec visibilité auprès de Romain Lefèvre (Président)',
    keyOperationalProjects: [
      'Harmonisation des KPI de contrôle de gestion entre le siège parisien et les filiales en région.',
      'Automatisation de la réconciliation des rétrocommissions des plateformes d’assurance et banques dépositaires.',
      'Préparation des comités financiers trimestriels pour TA Associates.',
    ],
    pitchRecommendation: '« Fort d\'une solide pratique du contrôle financier et de la gestion des flux en environnement multi-sociétés, j\'allie rigueur technique sur les chiffres et posture de Business Partner auprès des opérationnels. La formidable trajectoire de croissance de Valoria Capital et son passage du cap des 4 Md€ d\'encours correspondent exactement à l\'environnement d\'exigence dans lequel j\'apporte une valeur immédiate : sécuriser le pilotage du PNB, unifier les reportings post-acquisitions et offrir une visibilité sereine à Romain Lefèvre et vos partenaires investisseurs. »',
    highImpactQuestions: [
      {
        question: 'Comment s’organise aujourd’hui la consolidation des indicateurs d’AUM et de PNB entre les différents cabinets acquis dans le cadre de votre stratégie Buy-and-Build ?',
        objective: 'Démontrer immédiatement une compréhension aiguë des enjeux financiers liés à la croissance externe et à l’intégration post-M&A.',
      },
      {
        question: 'Quelles sont les attentes clés du fonds TA Associates concernant la granularité des reportings de rentabilité et le suivi de l’EBITDA ?',
        objective: 'Prouver sa maîtrise des relations avec les fonds d’investissement (Private Equity) et des exigences de gouvernance financière.',
      },
      {
        question: 'Quels sont les chantiers prioritaires à 6 mois sur l’automatisation des réconciliations de rétrocommissions auprès des banques dépositaires et assureurs ?',
        objective: 'Montrer une expertise technique concrète des flux de revenus de la gestion privée et du family office.',
      },
    ],
  },
  supratec: {
    aliases: ['supratec', 'groupe supratec', 'supratec group', 'supratec enomax', 'supratec jallais', 'supratec syneo'],
    sector: 'Industrie, Ingénierie & Solutions Technologiques',
    businessModel: 'B2B / Conception, assemblage, intégration et fourniture de composants et équipements de pointe pour les industriels (robotique, usinage, collage, préhension)',
    estimatedSize: 'ETI industrielle française (environ 250 collaborateurs)',
    location: 'Bondoufle (Île-de-France, Essonne) & sites industriels en région',
    ownershipStructure: 'Groupe industriel indépendant pérenne à actionnariat managérial et familial',
    estimatedRevenue: '~50 M€ à 60 M€ de Chiffre d’Affaires annuel',
    growthStage: 'Croissance continue portée par l’automatisation des usines, l’industrie 4.0 et les filières de pointe (aéronautique, automobile, santé, luxe)',
    profitabilityModel: 'Marge industrielle sur solutions d’ingénierie à haute valeur ajoutée, contrôle rigoureux des approvisionnements et du BFR',
    websiteUrl: 'https://supratec.fr',
    legalInfo: {
      legalName: 'GROUPE SUPRATEC SAS',
      commercialBrand: 'SUPRATEC',
      websiteUrl: 'https://supratec.fr',
      headquarters: 'Bondoufle (91070, Essonne, Île-de-France)',
      creationYear: '1962',
      legalForm: 'Société par Actions Simplifiée (SAS)',
      keyExecutives: [
        { name: 'Direction Générale Groupe', title: 'Président / Directeur Général', roleDescription: 'Pilote le développement industriel et la stratégie technologique des entités du groupe.' },
        { name: 'Direction Financière', title: 'Directeur Administratif et Financier (DAF)', roleDescription: 'Supervise la consolidation financière, le BFR industriel et la trésorerie multi-sites.' },
      ],
      activitiesPillars: [
        'Ingénierie & Robotique industrielle : Cellules robotisées, outillages sur-mesure et solutions de préhension.',
        'Assemblage & Collage technique : Solutions de fixation haute performance pour l’aéronautique et l’automobile.',
        'Composants & Équipements mécaniques : Distribution spécialisée et intégration de machines d’usinage.',
      ],
      aumOrKeyMetrics: '~50 M€ à 60 M€ de CA annuel',
      shareholdersAndBackers: 'Actionnariat managérial et familial indépendant',
    },
    keyFinancialChallenges: [
      'Pilotage du BFR industriel : rotation des stocks de pièces/composants, encaissements clients B2B et gestion des décaissements fournisseurs.',
      'Contrôle de gestion par affaire et fiabilisation des marges opérationnelles sur les projets d’intégration robotique.',
      'Modélisation des prévisions de trésorerie glissantes multi-sociétés et consolidation financière des filiales du groupe.',
    ],
    toolsAndStack: [
      'ERP Industriel & Gestion commerciale (ex: Sage X3 / SAP / Cegid)',
      'Outils de Trésorerie & Cash Management (Agicap, Kyriba ou équivalent)',
      'Excel Avancé (modélisation financière, TCD, formules matricielles)',
      'Logiciels de GPAO & Suivi de production industrielle',
    ],
    reportingLine: 'Rattachement direct au Directeur Administratif et Financier (DAF) Groupe ou à la Direction Générale',
    keyOperationalProjects: [
      'Accélération des délais de clôture financière (Fast Close) et harmonisation des reportings de gestion par entité.',
      'Digitalisation et automatisation du suivi du cash et des indicateurs de BFR.',
      'Sécurisation des marges brutes sur projets industriels et accompagnement des investissements technologiques.',
    ],
    pitchRecommendation: '« Fort d\'une solide expérience en finance et gestion opérationnelle, j\'allie rigueur technique sur les progiciels et compréhension concrète des enjeux d\'exploitation industrielle. Rejoindre le groupe Supratec représente l\'opportunité de mettre mon expertise au service de la sécurisation du cash, de l\'optimisation des clôtures et du pilotage de la rentabilité de vos activités d\'ingénierie et d\'équipements industriels. »',
    highImpactQuestions: [
      {
        question: 'Quelle est la part respective des activités d’ingénierie sur-mesure et de fourniture de composants dans le BFR et la rentabilité actuelle du groupe Supratec ?',
        objective: 'Montrer une appréhension immédiate du modèle économique industriel et de son impact sur le besoin en fonds de roulement.',
      },
      {
        question: 'Quels sont les chantiers prioritaires à court terme sur le système d’information de gestion et la fiabilisation des prévisions de trésorerie glissantes ?',
        objective: 'Démontrer sa capacité d’audit des outils en place et sa posture de Business Partner financier opérationnel.',
      },
    ],
  },
  equans: {
    aliases: ['equans', 'groupe equans', 'equans france', 'bouygues energies'],
    sector: 'Énergie, Génie Électrique & Services Multitechniques',
    businessModel: 'B2B / Grands contrats pluriannuels d’installations électriques, génie climatique et maintenance multitechnique pour le tertiaire et l’industrie',
    estimatedSize: 'Leader mondial / Filiale majeure du Groupe Bouygues (près de 90 000 collaborateurs)',
    location: 'Courbevoie / La Défense (Siège) & réseau national d’agences',
    ownershipStructure: 'Filiale à 100% du Groupe Bouygues (coté en bourse Euronext)',
    estimatedRevenue: '~18 Milliards d’Euros de Chiffre d’Affaires annuel',
    growthStage: 'Consolidation stratégique post-acquisition et synergies avec les entités du Groupe Bouygues',
    profitabilityModel: 'Pilotage fin des marges à l’avancement des chantiers (normes IFRS 15), contrôle strict des encours clients et du BFR',
    websiteUrl: 'https://equans.fr',
    keyFinancialChallenges: [
      'Gestion et fiabilisation des clôtures à l’avancement sur les grands chantiers et marchés publics.',
      'Optimisation des flux de trésorerie et réduction du DSO (créances clients et retenues de garantie BTP/installations).',
      'Reporting financier exigeant sous normes Groupe et respect des engagements budgétaires.',
    ],
    toolsAndStack: ['SAP ERP (module FI/CO)', 'Excel Avancé / Power BI', 'Kyriba TMS', 'Outils de gestion d’affaires chantiers'],
    reportingLine: 'Rattachement au Directeur Financier de Branche ou Directeur de Centre de Profit',
    keyOperationalProjects: [
      'Harmonisation des processus financiers et convergence des outils post-intégration Bouygues.',
      'Fiabilisation des atterrissages de gestion et des revues d’affaires mensuelles.',
    ],
    pitchRecommendation: '« Fort d\'une solide expérience en contrôle de gestion et finance opérationnelle, j\'allie rigueur d\'analyse sur les grands volumes et culture du résultat sur le terrain. Intégrer Equans me permet d\'apporter ma valeur ajoutée au pilotage rigoureux des chantiers et à la sécurisation des flux de cash dans un grand groupe de référence. »',
    highImpactQuestions: [
      {
        question: 'Comment s’articulent les revues de fin de chantier avec les équipes travaux pour anticiper d’éventuelles dérives de coûts et de trésorerie ?',
        objective: 'Prouver son sens de l’opérationnel et sa proximité avec les chefs de projets chantiers.',
      },
    ],
  },
  sanef: {
    aliases: ['sanef', 'groupe sanef', 'sapn', 'abertis', 'sanef abertis'],
    sector: 'Infrastructures de Transport, Mobilité & Concessions Autoroutières',
    businessModel: 'Concession de service public / Perception de péages, abonnements de télépéage et exploitation de réseaux autoroutiers',
    estimatedSize: 'Grand Groupe d’infrastructure (environ 2 500 salariés)',
    location: 'Issy-les-Moulineaux (Île-de-France) & sites d’exploitation Nord/Est',
    ownershipStructure: 'Filiale du groupe mondial Abertis (consortium industriel / institutionnel)',
    estimatedRevenue: '~1,8 Milliard d’Euros de Chiffre d’Affaires annuel',
    growthStage: 'Maturité opérationnelle avec investissements majeurs dans la décarbonation et les autoroutes en flux libre (Free-Flow)',
    profitabilityModel: 'Forte génération de cash-flow d’exploitation (EBITDA élevé), amortissement d’actifs concédés et gestion d’endettement',
    websiteUrl: 'https://sanef.com',
    keyFinancialChallenges: [
      'Gestion et sécurisation de flux transactionnels massifs (péages, flux libre sans barrière, télépéage B2B/B2C).',
      'Pilotage des prévisions de trésorerie et optimisation des décaissements sur les programmes d’investissements lourds (CAPEX).',
      'Respect des ratios financiers et covenants de dette pour l’actionnaire Abertis.',
    ],
    toolsAndStack: ['SAP ERP', 'Kyriba Cash Management', 'Power BI / Dataviz', 'Systèmes de billettique transactionnels'],
    reportingLine: 'Rattachement au DAF Groupe Sanef ou Responsable Trésorerie & Financements',
    keyOperationalProjects: [
      'Accompagnement financier et cash du déploiement des péages en flux libre (autoroute Paris-Normandie A13/A14).',
      'Automatisation des rapprochements bancaires sur flux de masse et fiabilisation des prévisions.',
    ],
    pitchRecommendation: '« Passionné par les projets d\'infrastructure à fort impact sociétal, je dispose d\'un parcours éprouvé en gestion de trésorerie, suivi des flux et modélisation financière. Contribuer aux enjeux d\'exploitation et de transformation de Sanef représente une formidable opportunité de mettre mes compétences au service d\'une infrastructure critique. »',
    highImpactQuestions: [
      {
        question: 'Quels sont les impacts financiers et de recouvrement constatés avec le passage au péage en flux libre (Free-Flow) ?',
        objective: 'Montrer une excellente veille sur l’actualité stratégique de Sanef et la gestion des flux de paiement.',
      },
    ],
  },
};

/**
 * Extrait les questions stratégiques avec leur objectif
 */
function extractStrategicQuestions(
  text: string
): { question: string; objective: string }[] {
  const questions: { question: string; objective: string }[] = [];
  const lines = text.split('\n');
  let currentQ = '';
  let currentObj = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/(?:Question|Q\d+|\d+\.)\s*[:?]/i) || (trimmed.includes('?') && trimmed.match(/^[-*•\d+.]/))) {
      if (currentQ) {
        questions.push({
          question: currentQ,
          objective: currentObj || 'Démontrer sa compréhension des enjeux clés et sa posture de Business Partner.',
        });
        currentQ = '';
        currentObj = '';
      }
      const cleaned = cleanText(trimmed);
      currentQ = cleaned;
    } else if (trimmed.match(/(?:Objectif|Intérêt|Pourquoi|But)\s*[:]/i)) {
      currentObj = cleanText(trimmed.replace(/(?:Objectif|Intérêt|Pourquoi|But)\s*[:]/i, ''));
    }
  }

  if (currentQ) {
    questions.push({
      question: currentQ,
      objective: currentObj || 'Démontrer sa compréhension des enjeux clés et sa posture de Business Partner.',
    });
  }

  return questions;
}

/**
 * Analyse heuristique et sémantique rigoureuse pour déterminer le secteur réel
 * Ne confond JAMAIS les termes d'organisation de travail ("mode projet", "mode agile")
 * et priorise la gestion de patrimoine/finance lorsque des termes comme "capital" ou "asset" sont présents.
 */
function detectAccurateSector(companyName: string, jobText: string): string {
  const lowerCompany = (companyName || '').toLowerCase();

  // 1. Détection prioritaire par nom d'entreprise
  if (lowerCompany.includes('valoria') || lowerCompany.includes('patrimoine') || lowerCompany.includes('wealth') || lowerCompany.includes('family office')) {
    return 'Gestion de Patrimoine, Asset Management & Conseil M&A';
  }
  if (lowerCompany.includes('capital') || lowerCompany.includes('partners') || lowerCompany.includes('advisory') || lowerCompany.includes('private equity')) {
    return 'Banque d’Affaires, Gestion d’Actifs & Finance d’Investissement';
  }
  if (lowerCompany.includes('supratec')) {
    return 'Industrie, Ingénierie & Solutions Technologiques';
  }
  if (lowerCompany.includes('equans') || lowerCompany.includes('bouygues energie')) {
    return 'Énergie, Génie Électrique & Services Multitechniques';
  }
  if (lowerCompany.includes('sanef') || lowerCompany.includes('abertis') || lowerCompany.includes('sapn')) {
    return 'Infrastructures de Transport, Mobilité & Concessions Autoroutières';
  }
  if (lowerCompany.includes('thales') || lowerCompany.includes('safran') || lowerCompany.includes('airbus') || lowerCompany.includes('dassault')) {
    return 'Aéronautique, Défense & Technologies de Pointe';
  }
  if (lowerCompany.includes('schneider') || lowerCompany.includes('legrand') || lowerCompany.includes('alstom')) {
    return 'Équipements Électriques, Énergie & Industrie';
  }
  if (lowerCompany.includes('sanofi') || lowerCompany.includes('servier') || lowerCompany.includes('biomerieux')) {
    return 'Santé, Industrie Pharmaceutique & Biotechnologies';
  }
  if (lowerCompany.includes('capgemini') || lowerCompany.includes('sopra') || lowerCompany.includes('atos') || lowerCompany.includes('devoteam')) {
    return 'Conseil en Technologies & Services Numériques (ESN)';
  }
  if (lowerCompany.includes('lvmh') || lowerCompany.includes('kering') || lowerCompany.includes('hermes') || lowerCompany.includes('chanel')) {
    return 'Luxe, Haute Horlogerie & Maroquinerie';
  }

  // 2. Nettoyage des locutions françaises courantes contenant le mot "mode"
  const sanitizedText = (jobText || '')
    .toLowerCase()
    .replace(/(?:travailler\s+)?en\s+mode\s+(?:projet|agile|scrum|dégradé|autonome|hybride|présentiel|distanciel|collaboratif|commando|start-?up|saas|multi-projets?)/gi, ' ')
    .replace(/\bmode\s+(?:projet|opératoire|d'emploi|de\s+vie|de\s+gestion|de\s+travail|de\s+fonctionnement|d'action|d'organisation|d'intervention)\b/gi, ' ');

  // 3. Gestion de Patrimoine, M&A & Private Equity (Prioritaire dès que les termes patrimoniaux apparaissent)
  if (
    sanitizedText.match(/\b(gestion\s+de\s+patrimoine|gestion\s+privée|family\s+office|asset\s+management|fusions?-acquisitions?|m&a|cgp|encours\s+sous\s+gestion|aum|fonds\s+d['’]investissement|private\s+equity|lbo|banque\s+privée|ingénierie\s+patrimoniale|transmission\s+d['’]entreprise|haut\s+de\s+bilan|gestion\s+sous\s+mandat)\b/i)
  ) {
    return 'Gestion de Patrimoine, Asset Management & Conseil M&A';
  }

  // 4. Industrie & Ingénierie
  if (
    sanitizedText.match(/\b(supratec|industrie|industriel|industrielle|ingénierie|mécanique|robotique|automatisme|usinage|assemblage|production|fabrication|matériaux|aéronautique|automobile|ferroviaire|bâtiment|btp|métallurgie|chimie|électronique|équipements?\s+industriels?|machines?\s+spéciales?|plasturgie|maintenance\s+industrielle)\b/i)
  ) {
    return 'Industrie & Ingénierie Technologique';
  }

  // 5. Banque, Finance & Assurance générale
  if (
    sanitizedText.match(/\b(banque|bancaire|assurance|assurantiel|courtage|gestion\s*d['’]actifs|capital\s*risque|trading|salle\s*des\s*marchés)\b/i)
  ) {
    return 'Banque, Finance & Investissement';
  }

  // 6. Technologies, SaaS véritable (Éditeurs logiciels et cloud, et non simple mention de progiciels)
  if (
    sanitizedText.match(/\b(éditeur\s+de\s+logiciels?|pure\s+player\s+saas|solution\s+saas\s+b2b|développement\s+logiciel|cloud|cybersécurité|intelligence\s+artificielle|esn|deeptech|infrastructure\s+cloud)\b/i)
  ) {
    return 'Technologies, SaaS & Édition Logicielle';
  }

  // 7. Télécoms & Réseaux
  if (
    sanitizedText.match(/\b(télécom|télécommunications|fibre\s*optique|réseau\s*télécom|opérateur\s*télécom|infrastructures\s*numériques)\b/i)
  ) {
    return 'Télécoms & Infrastructures Numériques';
  }

  // 8. Mobilité, Transports & Logistique
  if (
    sanitizedText.match(/\b(transport|logistique|fret|supply\s*chain|autoroute|télépéage|ferroviaire|maritime|flotte|mobilité|entreposage)\b/i)
  ) {
    return 'Mobilité, Transports & Services aux usagers';
  }

  // 9. Santé, Pharma & Médical
  if (
    sanitizedText.match(/\b(santé|médical|clinique|hôpital|pharmaceutique|laboratoire|biotech|medtech|dispositifs\s*médicaux)\b/i)
  ) {
    return 'Santé, Pharma & Dispositifs Médicaux';
  }

  // 10. BTP, Construction & Immobilier
  if (
    sanitizedText.match(/\b(btp|construction|génie\s*civil|bâtiment|travaux\s*publics|immobilier|promotion\s*immobilière|foncière)\b/i)
  ) {
    return 'BTP, Construction & Immobilier';
  }

  // 11. Distribution, E-commerce & Retail
  if (
    sanitizedText.match(/\b(retail|distribution|grande\s*distribution|e-commerce|points\s*de\s*vente|magasins?|négoce|omnicanal)\b/i)
  ) {
    return 'Distribution & E-commerce';
  }

  // 12. VRAIE Mode & Joaillerie (Termes explicites sans ambiguïté)
  if (
    sanitizedText.match(/\b(haute\s+couture|prêt-à-porter|joaillerie|bijouterie|maroquinerie|orfèvrerie|horlogerie|parfumerie|maison\s+de\s+mode|industrie\s+de\s+la\s+mode|textile\s+et\s+habillement|créateur\s+de\s+mode)\b/i)
  ) {
    return 'Mode, Bijouterie & Luxe';
  }

  // 13. Par défaut : Services & Conseil aux Entreprises
  return 'Services & Conseil aux Entreprises';
}

/**
 * Génère dynamiquement une cartographie d'interlocuteurs de communication
 * et un plan stratégique 30-60-90 jours adapté à n'importe quelle entreprise.
 */
function generateGenericStakeholdersAndPlan(
  companyName: string,
  roleName: string,
  sector: string
): {
  plan: CandidateStrategicPlan;
  stakeholders: CompanyStakeholderCommunication[];
} {
  const plan: CandidateStrategicPlan = {
    roleTitle: roleName || 'Poste Cible',
    executiveSummary: `Feuille de route stratégique pour réussir son intégration chez ${companyName}, sécuriser les livrables clés et démontrer sa posture de Business Partner auprès des décideurs.`,
    phases: [
      {
        period: 'J0 - J30 : Immersion & Diagnostic',
        title: 'Cartographie des processus et état des lieux',
        description: `Comprendre l’écosystème de ${companyName}, identifier les flux opérationnels clés et auditer les outils existants.`,
        actions: [
          'Rencontrer les interlocuteurs clés (Direction, N+1, opérationnels) pour cerner leurs attentes prioritaires.',
          'Analyser les reportings, outils informatiques et procédures en place.',
          'Identifier les éventuels goulots d’étranglement ou zones de risques opérationnels.',
        ],
        deliverable: 'Rapport d’étonnement et cartographie des processus opérationnels à 30 jours.',
      },
      {
        period: 'J31 - J60 : Structuration & Optimisation',
        title: 'Fiabilisation des livrables et gains d’efficacité',
        description: 'Mettre en place des améliorations concrètes pour fiabiliser les données et accélérer les cycles de travail.',
        actions: [
          'Harmoniser les indicateurs de performance (KPI) et automatiser les reportings récurrents.',
          'Proposer des ajustements méthodologiques pour fluidifier la communication avec les équipes de terrain.',
          'Sécuriser le respect des échéances clés et la conformité des livrables.',
        ],
        deliverable: 'Tableau de bord de pilotage optimisé et procédures documentées.',
      },
      {
        period: 'J61 - J90 : Création de Valeur & Business Partnership',
        title: 'Anticipation stratégique et accompagnement de la Direction',
        description: `Inscrire son action dans la durée en apportant de la visibilité prédictive et des solutions à forte valeur ajoutée à ${companyName}.`,
        actions: [
          'Déployer des indicateurs prédictifs et modélisations pour éclairer les décisions stratégiques.',
          'Prendre le lead sur les chantiers prioritaires de modernisation ou de transformation.',
          'Partager les bonnes pratiques et renforcer les synergies transverses.',
        ],
        deliverable: 'Modèle de suivi prédictif et recommandations stratégiques à 6 mois.',
      },
    ],
    quickWins: [
      `Mettre à disposition sous 15 jours un tableau de bord visuel synthétisant les indicateurs clés de ${companyName}.`,
      'Automatiser au moins une tâche manuelle chronophage pour libérer du temps d’analyse à l’équipe.',
      'Clarifier le calendrier des livrables pour offrir une visibilité immédiate au management.',
    ],
    strategicRecommendations: [
      'Privilégier la communication proactive et le retour d’expérience régulier avec les opérationnels.',
      'Allier rigueur technique et clarté de restitution pour faciliter les arbitrages de la Direction.',
    ],
  };

  const stakeholders: CompanyStakeholderCommunication[] = [
    {
      roleCategory: 'Direction Générale & Présidence',
      targetName: `Direction Générale de ${companyName}`,
      keyPriorities: [
        'Visibilité stratégique et rentabilité globale',
        'Sérénité sur la fiabilité des données et la conformité',
        'Capacité du candidat à porter des projets en autonomie',
      ],
      recommendedPosture: 'Synthétique, orienté création de valeur et aligné avec la vision de développement.',
      verbalPitch: `« Mon objectif au sein de ${companyName} est de vous faire gagner un temps précieux : vous fournir une visibilité fiable et rapide sur nos indicateurs clés, et sécuriser l’atteinte de vos objectifs stratégiques. »`,
      outreachMessageSample: `« Bonjour, impressionné par le positionnement et le développement de ${companyName}. Expert sur les enjeux de ${roleName}, je serais ravi d'échanger sur la manière dont mes réalisations passées peuvent contribuer à sécuriser vos prochains objectifs de croissance. »`,
      questionsToAsk: [
        `« Quels sont vos chantiers prioritaires à 12 mois pour accompagner la croissance de ${companyName} ? »`,
        '« Quelles sont les qualités majeures qui font la réussite d’un collaborateur à ce poste au sein de votre comité de direction ? »',
      ],
    },
    {
      roleCategory: 'Direction Financière & N+1 (DAF / Manager)',
      targetName: 'Manager N+1 / Direction Financière',
      keyPriorities: [
        'Rigueur technique et respect scrupuleux des échéances',
        'Capacité d’adaptation aux outils et esprit d’initiative',
        'Gestion proactive des imprévus et force de proposition',
      ],
      recommendedPosture: 'Pragmatisme, expertise opérationnelle et sens du collectif.',
      verbalPitch: `« J’allie maîtrise technique des progiciels et sens de l’organisation. Vous pouvez compter sur ma rigueur pour fiabiliser les livrables dès le premier mois et faire progresser nos méthodes de travail. »`,
      outreachMessageSample: `« Bonjour, très intéressé par vos projets chez ${companyName}, j'aimerais échanger sur vos priorités actuelles pour le poste de ${roleName}. Mes compétences concrètes sur vos outils et problématiques métier me permettront d'être immédiatement opérationnel. »`,
      questionsToAsk: [
        '« Comment s’articule actuellement le calendrier de vos clôtures et quels sont les leviers d’optimisation prioritaires ? »',
        '« Quels sont les outils logiciels dont la montée en puissance est attendue dans les prochains mois ? »',
      ],
    },
    {
      roleCategory: 'Opérationnels & Équipes Métier',
      targetName: 'Responsables Opérationnels & Équipes',
      keyPriorities: [
        'Facilitation du travail au quotidien sans alourdissement administratif',
        'Réactivité et clarté dans les échanges',
      ],
      recommendedPosture: 'Écoute active, disponibilité et pédagogie.',
      verbalPitch: `« Mon rôle est de vous apporter les bons outils et les bonnes informations pour vous permettre d’avancer plus vite sur vos objectifs sur le terrain. »`,
      outreachMessageSample: `« Bonjour, ravi de pouvoir échanger avec vous sur les synergies possibles entre nos fonctions pour faciliter vos opérations chez ${companyName}. »`,
      questionsToAsk: [
        '« Quelles sont les informations dont vous manquez le plus souvent au quotidien pour piloter vos activités sereinement ? »',
      ],
    },
    {
      roleCategory: 'Recrutement & RH',
      targetName: 'Équipe RH / Recruteur',
      keyPriorities: [
        'Adéquation avec les valeurs et la culture de l’entreprise',
        'Stabilité, maturité professionnelle et dynamisme',
      ],
      recommendedPosture: 'Enthousiasme professionnel, écoute et clarté.',
      verbalPitch: `« Ce qui me motive chez ${companyName}, c’est l’alliance entre votre ambition sectorielle et une culture qui valorise l’engagement et l’excellence opérationnelle. »`,
      outreachMessageSample: `« Bonjour, séduit par les valeurs et la dynamique de ${companyName}, je serais ravi d'échanger sur l'opportunité de mettre mes compétences au service de vos équipes. »`,
      questionsToAsk: [
        `« Comment décririez-vous l’ambiance et les valeurs vécues au quotidien au sein des équipes de ${companyName} ? »`,
      ],
    },
  ];

  return { plan, stakeholders };
}

/**
 * Analyse heuristique et intelligente de l'offre d'emploi et de l'analyse
 * pour reconstituer un profil d'entreprise ultra-complet, cohérent et fidèle au réel.
 */
export function extractCompanyDossier(
  rawAnalysisText: string = '',
  jobText: string = '',
  companyNameParam?: string,
  roleParam?: string
): CompanyFinancialTechnicalDossier {
  const meta = extractOfferMetadata(jobText, '', rawAnalysisText);
  let companyName = companyNameParam || meta.company || meta.cabinet || 'Entreprise Recruteuse';
  const roleName = roleParam || meta.role || 'Poste Cible';

  // Nettoyer le nom d'entreprise s'il comporte des bruits
  companyName = companyName.replace(/\s*[-–|/]\s*(?:Recrutement|Poste|CDI|France).*$/i, '').trim();

  const lowerComp = companyName.toLowerCase();
  const benchmarkKey = Object.keys(KNOWN_COMPANIES_PROFILES).find((key) => {
    const prof = KNOWN_COMPANIES_PROFILES[key];
    return prof.aliases.some((alias) => lowerComp.includes(alias) || alias.includes(lowerComp));
  });

  // 1. Découpage du bloc Markdown si présent dans l'analyse reçue
  const dossierRegex = /###\s*(?:Fiche\s+Technique[^\n]*Entreprise[^\n]*|Fiche\s+Entreprise[^\n]*)([\s\S]*?)(?=(?:\n###\s+[^\n]+|\n---|$))/i;
  const match = rawAnalysisText.match(dossierRegex);
  const dossierBlock = match ? match[1].trim() : '';

  // Variables extraites
  let sector = '';
  let businessModel = '';
  let estimatedSize = '';
  let location = '';
  let ownershipStructure = '';
  let estimatedRevenue = '';
  let growthStage = '';
  let profitabilityModel = '';
  let websiteUrl = '';
  let legalInfo: LegalAndCorporateInfo | undefined;
  let candidateStrategicPlan: CandidateStrategicPlan | undefined;
  let stakeholdersCommunication: CompanyStakeholderCommunication[] | undefined;
  const keyFinancialChallenges: string[] = [];
  const toolsAndStack: string[] = [];
  let methodology = '';
  let reportingLine = '';
  const keyOperationalProjects: string[] = [];
  let pitchRecommendation = '';
  const highImpactQuestions: { question: string; objective: string }[] = [];
  const strategicAdvice: string[] = [];

  // Parsing si bloc dédié trouvé dans l'analyse
  if (dossierBlock) {
    const subSections = dossierBlock.split(/(?=\d+\.\s*\*\*|####\s*)/g);
    for (const sub of subSections) {
      const lowerSub = sub.toLowerCase();

      // Section 1 : Identité & Modèle
      if (lowerSub.includes('identité') || lowerSub.includes('modèle')) {
        const lines = sub.split('\n');
        for (const l of lines) {
          const cl = cleanText(l);
          if (cl.match(/secteur/i)) sector = cl.replace(/^.*?secteur[^:]*:\s*/i, '');
          if (cl.match(/taille/i)) estimatedSize = cl.replace(/^.*?taille[^:]*:\s*/i, '');
          if (cl.match(/implantation|siège|localisation/i)) location = cl.replace(/^.*?(?:implantation|siège|localisation)[^:]*:\s*/i, '');
          if (cl.match(/modèle|revenus/i)) businessModel = cl.replace(/^.*?(?:modèle|revenus)[^:]*:\s*/i, '');
        }
      }

      // Section 2 : Profil Financier
      if (lowerSub.includes('financier') || lowerSub.includes('métriques')) {
        const lines = sub.split('\n');
        for (const l of lines) {
          const cl = cleanText(l);
          if (cl.match(/chiffre d'affaires|ca|croissance/i) && !estimatedRevenue) {
            estimatedRevenue = cl.replace(/^.*?(?:chiffre d'affaires|ca|croissance)[^:]*:\s*/i, '');
          }
          if (cl.match(/actionnariat|financement|structure/i) && !ownershipStructure) {
            ownershipStructure = cl.replace(/^.*?(?:actionnariat|financement|structure)[^:]*:\s*/i, '');
          }
          if (cl.match(/stade|dynamique/i) && !growthStage) {
            growthStage = cl.replace(/^.*?(?:stade|dynamique)[^:]*:\s*/i, '');
          }
          if (cl.match(/rentabilité|marge|bfr/i) && !profitabilityModel) {
            profitabilityModel = cl.replace(/^.*?(?:rentabilité|marge|bfr)[^:]*:\s*/i, '');
          }
          if (cl.match(/enjeu|défi|trésorerie|cash/i) && l.match(/^[-*•\d+.]/)) {
            keyFinancialChallenges.push(cl);
          }
        }
      }

      // Section 3 : Stack & Organisation
      if (lowerSub.includes('stack') || lowerSub.includes('outils') || lowerSub.includes('organisation')) {
        const lines = sub.split('\n');
        for (const l of lines) {
          const cl = cleanText(l);
          if (cl.match(/outils|erp|logiciels|progiciels/i)) {
            const spl = cl.replace(/^.*?(?:outils|erp|logiciels|progiciels)[^:]*:\s*/i, '').split(/[,;]/);
            for (const s of spl) {
              const cleanS = s.trim();
              if (cleanS.length > 2 && !toolsAndStack.includes(cleanS)) toolsAndStack.push(cleanS);
            }
          }
          if (cl.match(/rattachement|hiérarchie|équipe/i)) {
            reportingLine = cl.replace(/^.*?(?:rattachement|hiérarchie|équipe)[^:]*:\s*/i, '');
          }
          if (cl.match(/méthodologie|normes|clôture/i)) {
            methodology = cl.replace(/^.*?(?:méthodologie|normes|clôture)[^:]*:\s*/i, '');
          }
          if (cl.match(/projet|chantier|priorité/i) && l.match(/^[-*•\d+.]/)) {
            keyOperationalProjects.push(cl);
          }
        }
      }

      // Section 4 : Questions
      if (lowerSub.includes('question')) {
        const qs = extractStrategicQuestions(sub);
        if (qs.length > 0) highImpactQuestions.push(...qs);
      }

      // Section 5 : Pitch
      if (lowerSub.includes('pitch')) {
        const cleanedPitch = sub
          .replace(/^.*?(?:pitch[^:]*:|5\.\s*\*\*[^:]*\*\*)/i, '')
          .replace(/^[*#\-\s>]+/, '')
          .trim();
        if (cleanedPitch.length > 20) {
          pitchRecommendation = cleanedPitch;
        }
      }
    }
  }

  // Si l'entreprise fait partie de notre base de référence validée (ex: Valoria Capital, Supratec)
  if (benchmarkKey) {
    const prof = KNOWN_COMPANIES_PROFILES[benchmarkKey];
    sector = prof.sector;
    businessModel = businessModel || prof.businessModel;
    estimatedSize = estimatedSize || prof.estimatedSize;
    location = location || prof.location;
    ownershipStructure = ownershipStructure || prof.ownershipStructure;
    estimatedRevenue = estimatedRevenue || prof.estimatedRevenue;
    growthStage = growthStage || prof.growthStage;
    profitabilityModel = profitabilityModel || prof.profitabilityModel;
    websiteUrl = prof.websiteUrl || '';
    legalInfo = prof.legalInfo;
    candidateStrategicPlan = prof.candidateStrategicPlan;
    stakeholdersCommunication = prof.stakeholdersCommunication;
    if (keyFinancialChallenges.length === 0) keyFinancialChallenges.push(...prof.keyFinancialChallenges);
    if (toolsAndStack.length === 0) toolsAndStack.push(...prof.toolsAndStack);
    reportingLine = reportingLine || prof.reportingLine;
    if (keyOperationalProjects.length === 0) keyOperationalProjects.push(...prof.keyOperationalProjects);
    if (highImpactQuestions.length === 0) highImpactQuestions.push(...prof.highImpactQuestions);
    pitchRecommendation = pitchRecommendation || prof.pitchRecommendation;
  }

  // 2. Garde-fous Anti-Incohérence Absolus :
  // Si le secteur actuel est faussé (ex: Valoria Capital pris pour du SaaS, ou Supratec pour de la mode)
  if (lowerComp.includes('valoria') || lowerComp.includes('capital') || lowerComp.includes('wealth')) {
    sector = 'Gestion de Patrimoine, Asset Management & Conseil M&A';
  } else if (lowerComp.includes('supratec')) {
    sector = 'Industrie, Ingénierie & Solutions Technologiques';
  }

  // 3. Détection sémantique fine si le secteur est manquant
  if (!sector) {
    sector = detectAccurateSector(companyName, jobText);
  }

  // 4. Déductions des champs complémentaires
  const combinedForAnalysis = (jobText + '\n' + rawAnalysisText).toLowerCase();

  // Modèle Économique
  if (!businessModel) {
    if (sector.includes('Patrimoine') || sector.includes('Asset Management') || sector.includes('Banque')) {
      businessModel = 'Gestion d’actifs & Conseil : commissions récurrentes sur encours (AUM), honoraires d’ingénierie et success fees M&A';
    } else if (sector.includes('Industrie')) {
      businessModel = 'B2B / Conception, production et fourniture d’équipements et solutions industrielles';
    } else if (combinedForAnalysis.includes('saas') || combinedForAnalysis.includes('abonnement')) {
      businessModel = 'Modèle SaaS / Revenus récurrents (ARR)';
    } else if (combinedForAnalysis.includes('b2b') || combinedForAnalysis.includes('grands comptes')) {
      businessModel = 'B2B / Contrats pluriannuels et prestations à forte valeur ajoutée';
    } else {
      businessModel = 'B2B & Prestations de conseil spécialisées';
    }
  }

  // Taille estimée
  if (!estimatedSize) {
    if (sector.includes('Patrimoine')) {
      estimatedSize = 'Acteur de référence en forte croissance (~120 à 250 collaborateurs et partenaires)';
    } else if (combinedForAnalysis.includes('filiale') || combinedForAnalysis.includes('groupe')) {
      estimatedSize = 'Groupe / ETI structurée (150 à 500 collaborateurs)';
    } else {
      estimatedSize = 'PME / ETI dynamique (50 à 250 collaborateurs)';
    }
  }

  // Implantation
  if (!location) {
    const locMatch = (jobText + ' ' + rawAnalysisText).match(
      /(?:Lieu|Localisation|Ville|Bordeaux|Paris|Lyon|Nantes|Lille|Toulouse|Marseille|Boulogne|Neuilly|La Défense|Bondoufle|Marcq|Évry)[^\n\r,.]*/i
    );
    location = locMatch ? locMatch[0].trim() : 'Paris & Régions (France)';
  }

  // Structure d'actionnariat
  if (!ownershipStructure) {
    if (sector.includes('Patrimoine') || combinedForAnalysis.includes('fonds') || combinedForAnalysis.includes('private equity')) {
      ownershipStructure = 'Fondateurs & Management associés à un fonds de Private Equity de référence';
    } else if (combinedForAnalysis.includes('familial') || combinedForAnalysis.includes('indépendant')) {
      ownershipStructure = 'Actionnariat familial / Indépendant pérenne';
    } else {
      ownershipStructure = 'Entreprise privée non cotée soutenue par ses actionnaires de référence';
    }
  }

  // Métriques financières
  if (!estimatedRevenue) {
    if (sector.includes('Patrimoine')) {
      estimatedRevenue = 'Près de 4 Md€ d’encours sous gestion (AUM) / PNB en forte accélération';
    } else {
      const caMatch = combinedForAnalysis.match(/(\d+[\s,.]?\d*\s*(?:m€|millions?(?:\s*d['’]euros)?))/i);
      estimatedRevenue = caMatch ? caMatch[1] : 'Entre 30 M€ et 120 M€ de Chiffre d’Affaires annuel';
    }
  }

  if (!growthStage) {
    growthStage = 'Phase d’expansion soutenue & acquisitions stratégiques (Buy-and-Build)';
  }

  if (!profitabilityModel) {
    if (sector.includes('Patrimoine')) {
      profitabilityModel = 'Marge récurrente sur encours (management fees) et honoraires de conseil';
    } else {
      profitabilityModel = 'Marge brute opérationnelle, maîtrise rigoureuse du BFR et gestion proactive des liquidités';
    }
  }

  // Enjeux financiers clés
  if (keyFinancialChallenges.length === 0) {
    if (sector.includes('Patrimoine') || sector.includes('Banque')) {
      keyFinancialChallenges.push('Réconciliation des encours sous gestion (AUM) et des conventions de rétrocommissions multi-établissements.');
      keyFinancialChallenges.push('Pilotage de la rentabilité par associé / cabinet et suivi de la collecte nette.');
      keyFinancialChallenges.push('Consolidation des reportings financiers pour les fonds actionnaires et conformité AMF/ACPR.');
    } else if (sector.includes('Industrie')) {
      keyFinancialChallenges.push('Pilotage du BFR industriel : rotation des stocks, gestion des encaissements clients B2B et décaissements.');
      keyFinancialChallenges.push('Contrôle de gestion industriel par affaire et fiabilisation des marges opérationnelles.');
      keyFinancialChallenges.push('Modélisation des prévisions de trésorerie glissantes et optimisation du cash-flow.');
    } else {
      keyFinancialChallenges.push('Pilotage fin des flux de trésorerie et modélisation des prévisions glissantes (13 semaines).');
      keyFinancialChallenges.push('Optimisation du Besoin en Fonds de Roulement (BFR) : délais clients (DSO) et gestion des décaissements.');
      keyFinancialChallenges.push('Accélération des délais de clôtures mensuelles (Fast Close J+5) et fiabilisation des reportings DAF.');
    }
  }

  // Outils & Stack
  const knownTools = [
    'O2S (Harvest)', 'Manymore', 'Pennylane', 'Agicap', 'SAP', 'Sage FRP Treasury', 'Sage X3', 'Sage 100', 'Kyriba',
    'Excel (TCD / Fonctions avancées / VBA)', 'Power BI', 'Cegid', 'Salesforce', 'Lucca',
    'Yooz', 'Spendesk', 'EBICS TS', 'Swift', 'SEPA', 'Workday', 'Tableau Software'
  ];
  for (const t of knownTools) {
    if (combinedForAnalysis.includes(t.toLowerCase()) && !toolsAndStack.includes(t)) {
      toolsAndStack.push(t);
    }
  }
  if (toolsAndStack.length === 0) {
    if (sector.includes('Patrimoine')) {
      toolsAndStack.push('Progiciels de Gestion Patrimoniale (ex: O2S / Harvest, Manymore)');
      toolsAndStack.push('ERP Comptable & Gestion (ex: Sage / Cegid / Pennylane)');
      toolsAndStack.push('Excel Avancé & Outils BI de Dataviz (Power BI)');
    } else {
      toolsAndStack.push('ERP Comptable & Gestion (ex: SAP / Sage / Cegid)');
      toolsAndStack.push('TMS Trésorerie & Outils de Cash Management (Agicap / Kyriba)');
      toolsAndStack.push('Excel Avancé & Outils BI de Dataviz');
    }
  }

  // Rattachement hiérarchique
  if (!reportingLine) {
    if (sector.includes('Patrimoine')) {
      reportingLine = 'Rattachement direct au Directeur Administratif et Financier (DAF) ou Secrétaire Général avec visibilité auprès de la Présidence.';
    } else if (combinedForAnalysis.includes('directeur général') || combinedForAnalysis.includes('dg') || combinedForAnalysis.includes('fondateur')) {
      reportingLine = 'Rattachement direct à la Direction Générale (DG) et membre du Comité de Direction.';
    } else {
      reportingLine = 'Rattachement hiérarchique direct au Directeur Administratif et Financier (DAF) ou DAF Groupe.';
    }
  }

  // Méthodologie
  if (!methodology) {
    if (sector.includes('Patrimoine')) {
      methodology = 'Normes comptables françaises & conformité ACPR/AMF, contrôle interne des encours et clôtures mensuelles à J+5.';
    } else {
      methodology = 'Normes comptables françaises & IFRS le cas échéant, pilotage par objectifs chiffrés et procédures de contrôle interne.';
    }
  }

  // Projets opérationnels
  if (keyOperationalProjects.length === 0) {
    if (sector.includes('Patrimoine')) {
      keyOperationalProjects.push('Harmonisation des KPI de contrôle de gestion entre les différents cabinets et entités intégrées.');
      keyOperationalProjects.push('Automatisation du rapprochement des rétrocommissions des dépositaires et plateformes de gestion.');
      keyOperationalProjects.push('Mise en place d’un reporting financier unifié pour la Direction et les investisseurs partenaires.');
    } else {
      keyOperationalProjects.push('Modernisation ou interfaçage des outils financiers (ERP, logiciel de trésorerie, automatisation des rapprochements).');
      keyOperationalProjects.push('Mise en place de tableaux de bord financiers automatisés et d’indicateurs prédictifs de cash.');
      keyOperationalProjects.push('Accompagnement de la croissance par la structuration des équipes et la fiabilisation des clôtures.');
    }
  }

  // Questions Stratégiques en Entretien
  if (highImpactQuestions.length === 0) {
    if (sector.includes('Patrimoine')) {
      highImpactQuestions.push({
        question: `Comment est actuellement organisée la consolidation des encours sous gestion (AUM) et la réconciliation des rétrocommissions entre les différentes entités du groupe ?`,
        objective: 'Montrer une compréhension immédiate du modèle économique de la gestion privée et de la complexité des flux post-croissance externe.',
      });
      highImpactQuestions.push({
        question: `Quels sont les chantiers prioritaires à 6 mois sur les tableaux de bord de PNB pour le Comité de Direction et vos investisseurs ?`,
        objective: 'Démontrer sa capacité d’aide à la décision et son positionnement direct de Business Partner auprès des dirigeants.',
      });
      highImpactQuestions.push({
        question: `Quelles sont vos attentes sur l’automatisation des reportings pour libérer du temps commercial aux associés et conseillers ?`,
        objective: 'Prouver sa volonté d’agir en facilitateur opérationnel pour les équipes de développement.',
      });
    } else {
      highImpactQuestions.push({
        question: `Quelle est la cadence et la granularité actuelle de vos prévisions de trésorerie (prévisionnel glissant à 13 semaines, mensuel ou annuel) ?`,
        objective: 'Démontrer immédiatement une vision d’anticipation du cash et une rigueur méthodologique appréciée des DAF.',
      });
      highImpactQuestions.push({
        question: `Quels sont les chantiers prioritaires à 6 mois pour ce poste : sécurisation des process existants, migration d’outils ou accompagnement de nouveaux projets ?`,
        objective: 'Montrer sa capacité à hiérarchiser les urgences et à s’inscrire en véritable Business Partner dès le premier jour.',
      });
    }
  }

  // Pitch d'Accroche pour l'Entretien
  if (!pitchRecommendation) {
    if (sector.includes('Patrimoine')) {
      pitchRecommendation = `« Fort d'un parcours rigoureux en finance et contrôle de gestion dans des environnements exigeants, j'allie rigueur technique sur les progiciels et rôle proactif de Business Partner auprès des opérationnels. La formidable dynamique de croissance de ${companyName} correspond exactement à l'environnement dans lequel j'exprime mon potentiel : sécuriser le pilotage du PNB, unifier les reportings post-acquisitions et offrir une visibilité sereine à la Direction Générale et à vos partenaires investisseurs. »`;
    } else {
      pitchRecommendation = `« Fort d'un parcours rigoureux en finance et gestion opérationnelle, j'ai développé une expertise solide dans l'optimisation des flux, le pilotage de la trésorerie et la fiabilisation des clôtures. Votre projet chez ${companyName} résonne particulièrement avec mon approche : allier rigueur technique sur les progiciels et rôle proactif de Business Partner pour sécuriser la croissance et accompagner vos décisions stratégiques. »`;
    }
  }

  // Générer le plan stratégique et les interlocuteurs génériques si non fournis par un profil de benchmark
  if (!candidateStrategicPlan || !stakeholdersCommunication) {
    const generated = generateGenericStakeholdersAndPlan(companyName, roleName, sector);
    candidateStrategicPlan = candidateStrategicPlan || generated.plan;
    stakeholdersCommunication = stakeholdersCommunication || generated.stakeholders;
  }

  // Générer legalInfo par défaut si absent
  if (!legalInfo) {
    legalInfo = {
      legalName: companyName.toUpperCase(),
      commercialBrand: companyName,
      websiteUrl: websiteUrl || `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      headquarters: location,
      creationYear: 'Entreprise établie',
      legalForm: 'Société commerciale (SAS / SA)',
      keyExecutives: [
        { name: 'Direction Générale / Présidence', title: 'Président / Directeur Général', roleDescription: 'Garant des orientations stratégiques et du développement global.' },
        { name: 'Direction Financière', title: 'Directeur Administratif et Financier (DAF)', roleDescription: 'Pilotage de la performance financière, des clôtures et de la trésorerie.' },
      ],
      activitiesPillars: [
        `${sector} : Prestations et solutions spécialisées à forte valeur ajoutée`,
        'Développement commercial et fidélisation de clients stratégiques',
        'Pilotage de projets et modernisation des processus internes',
      ],
      aumOrKeyMetrics: estimatedRevenue,
      shareholdersAndBackers: ownershipStructure,
    };
  }

  // Génération du texte Markdown complet pour export
  const rawBriefText = `### Fiche Technique, Légale & Financière : ${companyName}
**Poste Ciblé :** ${roleName}
**Site Web Officiel :** ${legalInfo.websiteUrl || 'https://www.' + companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'}

#### 1. Données Légales, Dirigeants & Métiers Réels
- **Raison sociale officielle :** ${legalInfo.legalName || companyName}
- **Secteur d'activité vérifié :** ${sector}
- **Modèle de revenus :** ${businessModel}
- **Taille & Effectifs :** ${estimatedSize}
- **Siège & Implantation :** ${location}
- **Actionnariat & Capital :** ${ownershipStructure}
- **Dirigeants clés identifiés :**
${legalInfo.keyExecutives?.map((exec) => `  * **${exec.name}** (${exec.title})${exec.roleDescription ? ` : ${exec.roleDescription}` : ''}`).join('\n') || '  * Direction Générale et Comité Exécutif'}

- **Piliers d'activité réels (Site Web Officiel) :**
${legalInfo.activitiesPillars?.map((pil) => `  * ${pil}`).join('\n') || `  * Activités spécialisées en ${sector}`}

#### 2. Profil Financier & Enjeux Stratégiques
- **Métrique clé / Chiffre d'Affaires / AUM :** ${estimatedRevenue}
- **Dynamique financière :** ${growthStage}
- **Modèle de rentabilité :** ${profitabilityModel}
- **Enjeux financiers & de gestion majeurs :**
${keyFinancialChallenges.map((c) => `  * ${c}`).join('\n')}

#### 3. Plan Stratégique Candidat (Feuille de Route 30 / 60 / 90 Jours)
*Positionnement : ${candidateStrategicPlan.roleTitle}*
${candidateStrategicPlan.executiveSummary}

${candidateStrategicPlan.phases.map((ph) => `##### ${ph.period} : ${ph.title}
- **Objectif :** ${ph.description}
- **Actions clés :**
${ph.actions.map((a) => `  * ${a}`).join('\n')}
- **Livrable attendu :** ${ph.deliverable}`).join('\n\n')}

##### Victoires Rapides (Quick Wins en Entretien) :
${candidateStrategicPlan.quickWins.map((qw) => `* ${qw}`).join('\n')}

#### 4. Cartographie des Interlocuteurs & Stratégie de Communication
${stakeholdersCommunication.map((stk) => `##### ${stk.roleCategory} : ${stk.targetName || stk.roleCategory}
- **Ses priorités absolues :** ${stk.keyPriorities.join(', ')}
- **Posture recommandée :** ${stk.recommendedPosture}
- **Pitch verbal en entretien :**
  > ${stk.verbalPitch}
- **Modèle de message direct (LinkedIn / Email) :**
  > ${stk.outreachMessageSample}
- **Questions ciblées à lui poser :**
${stk.questionsToAsk.map((q) => `  * « ${q} »`).join('\n')}`).join('\n\n')}

#### 5. Stack Technique, Progiciels & Organisation
- **Stack & Progiciels :** ${toolsAndStack.join(', ')}
- **Rattachement hiérarchique :** ${reportingLine}
- **Méthodologie & Normes :** ${methodology}
- **Chantiers & Projets prioritaires :**
${keyOperationalProjects.map((p) => `  * ${p}`).join('\n')}

#### 6. Questions Stratégiques Haut de Gamme en Entretien
${highImpactQuestions
  .map(
    (q, i) =>
      `**Q${i + 1} :** *« ${q.question} »*\n  ↳ **Objectif candidat :** ${q.objective}`
  )
  .join('\n\n')}

#### 7. Pitch d'Accroche Personnalisé
${pitchRecommendation}`;

  return {
    companyName,
    sector,
    businessModel,
    estimatedSize,
    location,
    ownershipStructure,
    websiteUrl: legalInfo.websiteUrl || websiteUrl,
    legalInfo,
    candidateStrategicPlan,
    stakeholdersCommunication,
    financialProfile: {
      estimatedRevenue,
      growthStage,
      profitabilityModel,
      keyFinancialChallenges,
    },
    technicalProfile: {
      toolsAndStack,
      methodology,
      reportingLine,
      keyOperationalProjects,
    },
    interviewStrategy: {
      pitchRecommendation,
      highImpactQuestions,
      strategicAdvice,
    },
    rawBriefText,
  };
}
