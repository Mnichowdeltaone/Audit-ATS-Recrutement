import type { CompanyFinancialTechnicalDossier } from '../types';
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
  keyFinancialChallenges: string[];
  toolsAndStack: string[];
  reportingLine: string;
  keyOperationalProjects: string[];
  pitchRecommendation: string;
  highImpactQuestions: { question: string; objective: string }[];
}

const KNOWN_COMPANIES_PROFILES: Record<string, CompanyBenchmarkInfo> = {
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
    keyFinancialChallenges: [
      'Pilotage du BFR industriel : rotation des stocks de pièces/composants, encaissements clients B2B et gestion des décaissements fournisseurs.',
      'Contrôle de gestion par affaire et fiabilisation des marges opérationnelles sur les projets d’intégration robotique et d’ingénierie sur-mesure.',
      'Modélisation des prévisions de trésorerie glissantes multi-sociétés et consolidation financière des filiales du groupe.'
    ],
    toolsAndStack: [
      'ERP Industriel & Gestion commerciale (ex: Sage X3 / SAP / Cegid)',
      'Outils de Trésorerie & Cash Management (Agicap, Kyriba ou équivalent)',
      'Excel Avancé (modélisation financière, TCD, formules matricielles)',
      'Logiciels de GPAO & Suivi de production industrielle'
    ],
    reportingLine: 'Rattachement direct au Directeur Administratif et Financier (DAF) Groupe ou à la Direction Générale',
    keyOperationalProjects: [
      'Accélération des délais de clôture financière (Fast Close) et harmonisation des reportings de gestion par entité.',
      'Digitalisation et automatisation du suivi du cash et des indicateurs de BFR.',
      'Sécurisation des marges brutes sur projets industriels et accompagnement des investissements technologiques.'
    ],
    pitchRecommendation: '« Fort d\'une solide expérience en finance et gestion opérationnelle, j\'allie rigueur technique sur les progiciels et compréhension concrète des enjeux d\'exploitation industrielle. Rejoindre le groupe Supratec représente l\'opportunité de mettre mon expertise au service de la sécurisation du cash, de l\'optimisation des clôtures et du pilotage de la rentabilité de vos activités d\'ingénierie et d\'équipements industriels. »',
    highImpactQuestions: [
      {
        question: 'Quelle est la part respective des activités d’ingénierie sur-mesure et de fourniture de composants dans le BFR et la rentabilité actuelle du groupe Supratec ?',
        objective: 'Montrer une appréhension immédiate du modèle économique industriel et de son impact sur le besoin en fonds de roulement.'
      },
      {
        question: 'Quels sont les chantiers prioritaires à court terme sur le système d’information de gestion et la fiabilisation des prévisions de trésorerie glissantes ?',
        objective: 'Démontrer sa capacité d’audit des outils en place et sa posture de Business Partner financier opérationnel.'
      },
      {
        question: 'Comment sont actuellement arbitrés les investissements (CAPEX) et le suivi des marges brutes entre le siège et les filiales opérationnelles ?',
        objective: 'Affirmer sa maîtrise du contrôle financier industriel et de l’aide à la décision pour la Direction.'
      }
    ]
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
    keyFinancialChallenges: [
      'Gestion et fiabilisation des clôtures à l’avancement sur les grands chantiers et marchés publics.',
      'Optimisation des flux de trésorerie et réduction du DSO (créances clients et retenues de garantie BTP/installations).',
      'Reporting financier exigeant sous normes Groupe et respect des engagements budgétaires.'
    ],
    toolsAndStack: ['SAP ERP (module FI/CO)', 'Excel Avancé / Power BI', 'Kyriba TMS', 'Outils de gestion d’affaires chantiers'],
    reportingLine: 'Rattachement au Directeur Financier de Branche ou Directeur de Centre de Profit',
    keyOperationalProjects: [
      'Harmonisation des processus financiers et convergence des outils post-intégration Bouygues.',
      'Fiabilisation des atterrissages de gestion et des revues d’affaires mensuelles.'
    ],
    pitchRecommendation: '« Fort d\'une solide expérience en contrôle de gestion et finance opérationnelle, j\'allie rigueur d\'analyse sur les grands volumes et culture du résultat sur le terrain. Intégrer Equans me permet d\'apporter ma valeur ajoutée au pilotage rigoureux des chantiers et à la sécurisation des flux de cash dans un grand groupe de référence. »',
    highImpactQuestions: [
      {
        question: 'Comment s’articulent les revues de fin de chantier avec les équipes travaux pour anticiper d’éventuelles dérives de coûts et de trésorerie ?',
        objective: 'Prouver son sens de l’opérationnel et sa proximité avec les chefs de projets chantiers.'
      }
    ]
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
    keyFinancialChallenges: [
      'Gestion et sécurisation de flux transactionnels massifs (péages, flux libre sans barrière, télépéage B2B/B2C).',
      'Pilotage des prévisions de trésorerie et optimisation des décaissements sur les programmes d’investissements lourds (CAPEX).',
      'Respect des ratios financiers et covenants de dette pour l’actionnaire Abertis.'
    ],
    toolsAndStack: ['SAP ERP', 'Kyriba Cash Management', 'Power BI / Dataviz', 'Systèmes de billettique transactionnels'],
    reportingLine: 'Rattachement au DAF Groupe Sanef ou Responsable Trésorerie & Financements',
    keyOperationalProjects: [
      'Accompagnement financier et cash du déploiement des péages en flux libre (autoroute Paris-Normandie A13/A14).',
      'Automatisation des rapprochements bancaires sur flux de masse et fiabilisation des prévisions.'
    ],
    pitchRecommendation: '« Passionné par les projets d\'infrastructure à fort impact sociétal, je dispose d\'un parcours éprouvé en gestion de trésorerie, suivi des flux et modélisation financière. Contribuer aux enjeux d\'exploitation et de transformation de Sanef représente une formidable opportunité de mettre mes compétences au service d\'une infrastructure critique. »',
    highImpactQuestions: [
      {
        question: 'Quels sont les impacts financiers et de recouvrement constatés avec le passage au péage en flux libre (Free-Flow) ?',
        objective: 'Montrer une excellente veille sur l’actualité stratégique de Sanef et la gestion des flux de paiement.'
      }
    ]
  }
};

/**
 * Extrait une liste de puces sous une section donnée
 */
function extractBulletPoints(sectionText: string): string[] {
  if (!sectionText) return [];
  const lines = sectionText.split('\n');
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[-*•\d+.]\s+/)) {
      const cleaned = cleanText(trimmed);
      if (cleaned.length > 5) {
        bullets.push(cleaned);
      }
    }
  }
  return bullets;
}

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
 * SANS JAMAIS confondre les termes de travail ('mode projet', 'mode hybride') avec la mode vestimentaire.
 */
function detectAccurateSector(companyName: string, jobText: string): string {
  const lowerCompany = (companyName || '').toLowerCase();
  
  // 1. Détection prioritaire par nom d'entreprise
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
  // (ex: "mode projet", "mode hybride", "mode opératoire", "en mode agile")
  // pour éliminer 100% des faux positifs avec la mode vestimentaire
  const sanitizedText = (jobText || '')
    .toLowerCase()
    .replace(/(?:travailler\s+)?en\s+mode\s+(?:projet|agile|scrum|dégradé|autonome|hybride|présentiel|distanciel|collaboratif|commando|start-?up|saas|multi-projets?)/gi, ' ')
    .replace(/\bmode\s+(?:projet|opératoire|d'emploi|de\s+vie|de\s+gestion|de\s+travail|de\s+fonctionnement|d'action|d'organisation|d'intervention)\b/gi, ' ');

  // 3. Industrie & Ingénierie (Testé en priorité absolue dès que du vocabulaire technique est présent)
  if (
    sanitizedText.match(/\b(supratec|industrie|industriel|industrielle|ingénierie|mécanique|robotique|automatisme|usinage|assemblage|production|fabrication|matériaux|aéronautique|automobile|ferroviaire|bâtiment|btp|métallurgie|chimie|électronique|équipements?\s+industriels?|machines?\s+spéciales?|plasturgie|maintenance\s+industrielle)\b/i)
  ) {
    return 'Industrie & Ingénierie Technologique';
  }

  // 4. Technologies, SaaS & Logiciel
  if (
    sanitizedText.match(/\b(saas|software|logiciel|éditeur\s+de\s+logiciels?|cloud|cybersécurité|intelligence\s+artificielle|data|fintech|esn|numérique|plateforme\s+digitale|deeptech|infrastructure\s+it)\b/i)
  ) {
    return 'Technologies, SaaS & Édition Logicielle';
  }

  // 5. Télécoms & Réseaux
  if (
    sanitizedText.match(/\b(télécom|télécommunications|fibre\s*optique|réseau\s*télécom|opérateur\s*télécom|infrastructures\s*numériques)\b/i)
  ) {
    return 'Télécoms & Infrastructures Numériques';
  }

  // 6. Mobilité, Transports & Logistique
  if (
    sanitizedText.match(/\b(transport|logistique|fret|supply\s*chain|autoroute|télépéage|ferroviaire|maritime|flotte|mobilité|entreposage)\b/i)
  ) {
    return 'Mobilité, Transports & Services aux usagers';
  }

  // 7. Banque, Finance & Assurance
  if (
    sanitizedText.match(/\b(banque|bancaire|assurance|assurantiel|courtage|fonds\s*d['’]investissement|private\s*equity|gestion\s*d['’]actifs|asset\s*management|capital\s*risque)\b/i)
  ) {
    return 'Banque, Finance & Investissement';
  }

  // 8. Santé, Pharma & Médical
  if (
    sanitizedText.match(/\b(santé|médical|clinique|hôpital|pharmaceutique|laboratoire|biotech|medtech|dispositifs\s*médicaux)\b/i)
  ) {
    return 'Santé, Pharma & Dispositifs Médicaux';
  }

  // 9. BTP, Construction & Immobilier
  if (
    sanitizedText.match(/\b(btp|construction|génie\s*civil|bâtiment|travaux\s*publics|immobilier|promotion\s*immobilière|foncière)\b/i)
  ) {
    return 'BTP, Construction & Immobilier';
  }

  // 10. Distribution, E-commerce & Retail
  if (
    sanitizedText.match(/\b(retail|distribution|grande\s*distribution|e-commerce|points\s*de\s*vente|magasins?|négoce|omnicanal)\b/i)
  ) {
    return 'Distribution & E-commerce';
  }

  // 11. VRAIE Mode, Bijouterie & Joaillerie (Requiert des termes stricts sans équivoque)
  if (
    sanitizedText.match(/\b(haute\s+couture|prêt-à-porter|joaillerie|bijouterie|maroquinerie|orfèvrerie|horlogerie|parfumerie|maison\s+de\s+mode|industrie\s+de\s+la\s+mode|textile\s+et\s+habillement|créateur\s+de\s+mode)\b/i)
  ) {
    return 'Mode, Bijouterie & Luxe';
  }

  // 12. Par défaut : Services & Conseil aux Entreprises
  return 'Services & Conseil aux Entreprises';
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

  // Si l'entreprise fait partie de notre base de référence validée (ex: Supratec)
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
    if (keyFinancialChallenges.length === 0) keyFinancialChallenges.push(...prof.keyFinancialChallenges);
    if (toolsAndStack.length === 0) toolsAndStack.push(...prof.toolsAndStack);
    reportingLine = reportingLine || prof.reportingLine;
    if (keyOperationalProjects.length === 0) keyOperationalProjects.push(...prof.keyOperationalProjects);
    if (highImpactQuestions.length === 0) highImpactQuestions.push(...prof.highImpactQuestions);
    pitchRecommendation = pitchRecommendation || prof.pitchRecommendation;
  }

  // 2. Garde-fou Anti-Incohérence Absolu :
  // Si le secteur actuel mentionne "mode" ou "bijouterie" alors que l'offre parle d'industrie ou que l'entreprise est Supratec, corriger immédiatement !
  const isIndustrialContext =
    lowerComp.includes('supratec') ||
    jobText.match(/\b(supratec|industrie|industriel|ingénierie|mécanique|robotique|automatisme|usinage|assemblage|production|fabrication|matériaux|aéronautique|automobile|bâtiment|btp|métallurgie)\b/i);

  if (sector && (sector.toLowerCase().includes('bijouterie') || sector.toLowerCase().includes('mode')) && isIndustrialContext) {
    sector = lowerComp.includes('supratec')
      ? 'Industrie, Ingénierie & Solutions Technologiques'
      : 'Industrie & Ingénierie Technologique';
  }

  // 3. Détection sémantique fine si le secteur est manquant
  if (!sector) {
    sector = detectAccurateSector(companyName, jobText);
  }

  // 4. Déductions des champs complémentaires
  const combinedForAnalysis = (jobText + '\n' + rawAnalysisText).toLowerCase();

  // Modèle Économique
  if (!businessModel) {
    if (combinedForAnalysis.includes('saas') || combinedForAnalysis.includes('abonnement')) {
      businessModel = 'Modèle SaaS / Revenus récurrents (ARR)';
    } else if (sector.includes('Industrie')) {
      businessModel = 'B2B / Conception, production et fourniture d’équipements et solutions industrielles';
    } else if (combinedForAnalysis.includes('b2b') || combinedForAnalysis.includes('grands comptes') || combinedForAnalysis.includes('appels d’offres')) {
      businessModel = 'B2B / Contrats pluriannuels et prestations à forte valeur ajoutée';
    } else if (combinedForAnalysis.includes('b2c') || combinedForAnalysis.includes('boutique')) {
      businessModel = 'B2C / Vente directe, retail omnicanal & digital';
    } else {
      businessModel = 'B2B & B2B2C / Mix prestations & produits';
    }
  }

  // Taille estimée
  if (!estimatedSize) {
    if (combinedForAnalysis.includes('filiale') || combinedForAnalysis.includes('groupe') || combinedForAnalysis.includes('multinationale')) {
      estimatedSize = 'Filiale stratégique de Groupe (250 à 2 000 salariés)';
    } else if (combinedForAnalysis.includes('eti') || combinedForAnalysis.includes('pme industrielle')) {
      estimatedSize = 'ETI dynamique (100 à 450 salariés)';
    } else if (combinedForAnalysis.includes('startup') || combinedForAnalysis.includes('scale-up')) {
      estimatedSize = 'Scale-up en forte expansion (30 à 120 salariés)';
    } else {
      estimatedSize = 'PME / ETI structurée (50 à 250 collaborateurs)';
    }
  }

  // Implantation
  if (!location) {
    const locMatch = (jobText + ' ' + rawAnalysisText).match(
      /(?:Lieu|Localisation|Ville|Bordeaux|Paris|Lyon|Nantes|Lille|Toulouse|Marseille|Boulogne|Neuilly|La Défense|Guyancourt|Bondoufle|Marcq|Évry)[^\n\r,.]*/i
    );
    location = locMatch ? locMatch[0].trim() : 'France (Île-de-France & Régions)';
  }

  // Structure d'actionnariat
  if (!ownershipStructure) {
    if (combinedForAnalysis.includes('fonds') || combinedForAnalysis.includes('lbo') || combinedForAnalysis.includes('private equity')) {
      ownershipStructure = 'Sous contrôle d’un fonds de Private Equity (LBO / Capital Développement)';
    } else if (combinedForAnalysis.includes('familial') || combinedForAnalysis.includes('indépendant')) {
      ownershipStructure = 'Actionnariat familial / Indépendant pérenne';
    } else if (combinedForAnalysis.includes('cotée') || combinedForAnalysis.includes('bourse')) {
      ownershipStructure = 'Entreprise cotée (Euronext / Bourse)';
    } else {
      ownershipStructure = 'Entreprise privée non cotée soutenue par ses actionnaires de référence';
    }
  }

  // Métriques financières
  if (!estimatedRevenue) {
    const caMatch = combinedForAnalysis.match(/(\d+[\s,.]?\d*\s*(?:m€|millions?(?:\s*d['’]euros)?))/i);
    estimatedRevenue = caMatch ? caMatch[1] : 'Entre 25 M€ et 120 M€ de Chiffre d’Affaires annuel';
  }

  if (!growthStage) {
    if (combinedForAnalysis.includes('croissance') || combinedForAnalysis.includes('développement')) {
      growthStage = 'Phase d’expansion soutenue & consolidation de part de marché';
    } else if (combinedForAnalysis.includes('restructuration') || combinedForAnalysis.includes('transformation')) {
      growthStage = 'Phase de transformation et d’optimisation des process opérationnels';
    } else {
      growthStage = 'Maturité profitable avec projets d’investissements ciblés';
    }
  }

  if (!profitabilityModel) {
    profitabilityModel = 'Marge brute opérationnelle, maîtrise rigoureuse du BFR et gestion proactive des liquidités';
  }

  // Enjeux financiers clés
  if (keyFinancialChallenges.length === 0) {
    if (sector.includes('Industrie')) {
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
    'Pennylane', 'Agicap', 'SAP', 'Sage FRP Treasury', 'Sage X3', 'Sage 100', 'Kyriba',
    'Excel (TCD / Fonctions avancées / VBA)', 'Power BI', 'Cegid', 'Salesforce', 'Lucca',
    'Yooz', 'Spendesk', 'EBICS TS', 'Swift', 'SEPA', 'Workday', 'Tableau Software'
  ];
  for (const t of knownTools) {
    if (combinedForAnalysis.includes(t.toLowerCase()) && !toolsAndStack.includes(t)) {
      toolsAndStack.push(t);
    }
  }
  if (toolsAndStack.length === 0) {
    toolsAndStack.push('ERP Comptable & Gestion (ex: SAP / Sage / Cegid)');
    toolsAndStack.push('TMS Trésorerie & Outils de Cash Management (Agicap / Kyriba)');
    toolsAndStack.push('Excel Avancé & Outils BI de Dataviz');
  }

  // Rattachement hiérarchique
  if (!reportingLine) {
    if (combinedForAnalysis.includes('directeur général') || combinedForAnalysis.includes('dg') || combinedForAnalysis.includes('fondateur')) {
      reportingLine = 'Rattachement direct à la Direction Générale (DG) et membre du Comité de Direction.';
    } else if (combinedForAnalysis.includes('daf') || combinedForAnalysis.includes('directeur administratif')) {
      reportingLine = 'Rattachement hiérarchique direct au Directeur Administratif et Financier (DAF).';
    } else {
      reportingLine = 'Reporte au Directeur Général ou au DAF Groupe avec interactions fréquentes avec les opérationnels.';
    }
  }

  // Méthodologie
  if (!methodology) {
    methodology = 'Normes comptables françaises & IFRS le cas échéant, pilotage par objectifs chiffrés et procédures de contrôle interne.';
  }

  // Projets opérationnels
  if (keyOperationalProjects.length === 0) {
    keyOperationalProjects.push('Modernisation ou interfaçage des outils financiers (ERP, logiciel de trésorerie, automatisation des rapprochements).');
    keyOperationalProjects.push('Mise en place de tableaux de bord financiers automatisés et d’indicateurs prédictifs de cash.');
    keyOperationalProjects.push('Accompagnement de la croissance par la structuration des équipes et la fiabilisation des clôtures.');
  }

  // Questions Stratégiques en Entretien
  if (highImpactQuestions.length === 0) {
    highImpactQuestions.push({
      question: `Quelle est la cadence et la granularité actuelle de vos prévisions de trésorerie (prévisionnel glissant à 13 semaines, mensuel ou annuel) ?`,
      objective: 'Démontrer immédiatement une vision d’anticipation du cash et une rigueur méthodologique appréciée des DAF.',
    });
    highImpactQuestions.push({
      question: `Quels sont les chantiers prioritaires à 6 mois pour ce poste : sécurisation des process existants, migration d’outils ou accompagnement de nouveaux projets ?`,
      objective: 'Montrer sa capacité à hiérarchiser les urgences et à s’inscrire en véritable Business Partner dès le premier jour.',
    });
    highImpactQuestions.push({
      question: `Comment sont actuellement organisées les interactions entre la fonction finance/trésorerie et les équipes opérationnelles sur le terrain ?`,
      objective: 'Mettre en valeur son aisance relationnelle et sa capacité à vulgariser les enjeux financiers auprès des opérationnels.',
    });
  }

  // Pitch d'Accroche pour l'Entretien
  if (!pitchRecommendation) {
    pitchRecommendation = `« Fort d'un parcours rigoureux en finance et gestion opérationnelle, j'ai développé une expertise solide dans l'optimisation des flux, le pilotage de la trésorerie et la fiabilisation des clôtures. Votre projet chez ${companyName} résonne particulièrement avec mon approche : allier rigueur technique sur les progiciels et rôle proactif de Business Partner pour sécuriser la croissance et accompagner vos décisions stratégiques. »`;
  }

  // Conseils stratégiques pour le process de recrutement
  if (strategicAdvice.length === 0) {
    strategicAdvice.push('Étape RH / Chasseur de têtes : Mettez en avant votre stabilité, votre adaptabilité aux outils logiciels et votre motivation pour le secteur d’activité de l’entreprise.');
    strategicAdvice.push('Étape N+1 / DAF : Adoptez un discours concret et chiffré. Citez des exemples précis (STAR) de résolution d’écarts, de négociations bancaires ou d’améliorations de BFR.');
    strategicAdvice.push('Étape Direction Générale / Fondateurs : Démontrez que vous n’êtes pas uniquement un exécutant mais un garant de la visibilité financière qui aide le dirigeant à piloter sereinement.');
    strategicAdvice.push('Test technique / Épreuve pratique : Soignez la clarté de vos hypothèses, privilégiez des formules Excel propres et présentez vos conclusions de manière synthétique et actionnable.');
  }

  // Génération du texte Markdown complet
  const rawBriefText = `### Fiche Technique & Financière : ${companyName}
**Poste Ciblé :** ${roleName}

#### 1. Identité & Modèle Économique
- **Secteur d'activité :** ${sector}
- **Modèle de revenus :** ${businessModel}
- **Taille & Effectifs :** ${estimatedSize}
- **Implantation :** ${location}
- **Structure d'actionnariat :** ${ownershipStructure}

#### 2. Profil Financier & Métriques Clés
- **Chiffre d'Affaires / Croissance :** ${estimatedRevenue}
- **Stade de développement :** ${growthStage}
- **Modèle de rentabilité & BFR :** ${profitabilityModel}
- **Enjeux financiers majeurs :**
${keyFinancialChallenges.map((c) => `  * ${c}`).join('\n')}

#### 3. Stack Technique, Progiciels & Organisation
- **Stack & Logiciels :** ${toolsAndStack.join(', ')}
- **Rattachement hiérarchique :** ${reportingLine}
- **Méthodologie & Normes :** ${methodology}
- **Chantiers & Projets prioritaires :**
${keyOperationalProjects.map((p) => `  * ${p}`).join('\n')}

#### 4. Questions Stratégiques à Poser en Entretien
${highImpactQuestions
  .map(
    (q, i) =>
      `**Q${i + 1} :** *« ${q.question} »*\n  ↳ **Objectif candidat :** ${q.objective}`
  )
  .join('\n\n')}

#### 5. Pitch d'Accroche Personnalisé
${pitchRecommendation}

#### 6. Conseils Stratégiques pour le Process de Recrutement
${strategicAdvice.map((a) => `- ${a}`).join('\n')}`;

  return {
    companyName,
    sector,
    businessModel,
    estimatedSize,
    location,
    ownershipStructure,
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
