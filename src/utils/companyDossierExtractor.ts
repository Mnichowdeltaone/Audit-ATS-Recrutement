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
 * Analyse heuristique et intelligente de l'offre d'emploi et de l'analyse
 * pour reconstituer un profil d'entreprise ultra-complet si certaines rubriques sont manquantes
 */
export function extractCompanyDossier(
  rawAnalysisText: string = '',
  jobText: string = '',
  companyNameParam?: string,
  roleParam?: string
): CompanyFinancialTechnicalDossier {
  const combined = (rawAnalysisText + '\n' + jobText).toLowerCase();
  const meta = extractOfferMetadata(jobText, '', rawAnalysisText);
  const companyName = companyNameParam || meta.company || meta.cabinet || 'Entreprise Recruteuse';
  const roleName = roleParam || meta.role || 'Poste Cible';

  // 1. Découpage du bloc Markdown si présent
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

  // Parsing si bloc dédié trouvé
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

  // 2. Déductions & Heuristiques intelligentes pour enrichir et compléter à 100%

  // Détection du Secteur
  if (!sector) {
    if (combined.includes('télécom') || combined.includes('fibre') || combined.includes('infrastructure')) {
      sector = 'Télécoms & Infrastructures Numériques';
    } else if (combined.includes('bijoux') || combined.includes('mode') || combined.includes('luxe') || combined.includes('cosmétique')) {
      sector = 'Mode, Bijouterie & Biens de Consommation';
    } else if (combined.includes('autoroute') || combined.includes('mobilité') || combined.includes('télépéage') || combined.includes('transport')) {
      sector = 'Mobilité, Transports & Services aux usagers';
    } else if (combined.includes('industrie') || combined.includes('ingénierie') || combined.includes('mécanique') || combined.includes('production')) {
      sector = 'Industrie & Ingénierie Technologique';
    } else if (combined.includes('saas') || combined.includes('software') || combined.includes('tech') || combined.includes('logiciel')) {
      sector = 'Technologies, SaaS & Édition Logicielle';
    } else if (combined.includes('banque') || combined.includes('assurance') || combined.includes('fintech') || combined.includes('capital') || combined.includes('gestion d’actifs')) {
      sector = 'Banque, Finance & Investissement';
    } else if (combined.includes('santé') || combined.includes('pharma') || combined.includes('médical')) {
      sector = 'Santé, Pharma & Dispositifs Médicaux';
    } else if (combined.includes('retail') || combined.includes('e-commerce') || combined.includes('distribution')) {
      sector = 'Distribution & E-commerce';
    } else {
      sector = 'Services & Conseil aux Entreprises';
    }
  }

  // Modèle Économique
  if (!businessModel) {
    if (combined.includes('saas') || combined.includes('abonnement')) {
      businessModel = 'Modèle SaaS / Revenus récurrents (ARR)';
    } else if (combined.includes('b2b') || combined.includes('grands comptes') || combined.includes('appels d’offres')) {
      businessModel = 'B2B / Contrats pluriannuels et prestations à forte valeur ajoutée';
    } else if (combined.includes('b2c') || combined.includes('e-commerce') || combined.includes('boutique')) {
      businessModel = 'B2C & DNVB (Digital Native) / E-commerce & Retail omnicanal';
    } else if (combined.includes('concession') || combined.includes('abonnement') || combined.includes('flux')) {
      businessModel = 'Services récurrents par abonnement et gestion de flux transactionnels';
    } else {
      businessModel = 'B2B & B2B2C / Mix prestations & produits';
    }
  }

  // Taille estimée
  if (!estimatedSize) {
    if (combined.includes('filiale') || combined.includes('groupe') || combined.includes('multinationale')) {
      estimatedSize = 'Filiale stratégique de Grand Groupe (250 à 2 000 salariés)';
    } else if (combined.includes('eti') || combined.includes('pme industrielle')) {
      estimatedSize = 'ETI dynamique (100 à 450 salariés)';
    } else if (combined.includes('startup') || combined.includes('scale-up')) {
      estimatedSize = 'Scale-up en forte expansion (30 à 120 salariés)';
    } else {
      estimatedSize = 'PME / ETI structurée (50 à 250 collaborateurs)';
    }
  }

  // Implantation
  if (!location) {
    const locMatch = (jobText + ' ' + rawAnalysisText).match(/(?:Lieu|Localisation|Ville|Bordeaux|Paris|Lyon|Nantes|Lille|Toulouse|Marseille|Boulogne|Neuilly|La Défense|Guyancourt|Marcq)[^\n\r,.]*/i);
    location = locMatch ? locMatch[0].trim() : 'France (Île-de-France & Régions)';
  }

  // Structure d'actionnariat
  if (!ownershipStructure) {
    if (combined.includes('vauban') || combined.includes('equans') || combined.includes('sanef') || combined.includes('abertis')) {
      ownershipStructure = 'Actionnariat institutionnel & Filiale de consortium industriel';
    } else if (combined.includes('fonds') || combined.includes('lbo') || combined.includes('pe') || combined.includes('private equity')) {
      ownershipStructure = 'Sous contrôle d’un fonds de Private Equity (LBO / Capital Développement)';
    } else if (combined.includes('familial') || combined.includes('indépendant')) {
      ownershipStructure = 'Actionnariat familial / Indépendant pérenne';
    } else if (combined.includes('cotée') || combined.includes('bourse')) {
      ownershipStructure = 'Entreprise cotée (Euronext / Bourse)';
    } else {
      ownershipStructure = 'Entreprise privée non cotée soutenue par ses actionnaires de référence';
    }
  }

  // Métriques financières
  if (!estimatedRevenue) {
    if (combined.includes('m€') || combined.includes('millions d’euros') || combined.includes('chiffre d’affaires')) {
      const caMatch = combined.match(/(\d+[\s,.]?\d*\s*(?:m€|millions?(?:\s*d['’]euros)?))/i);
      estimatedRevenue = caMatch ? caMatch[1] : 'Entre 25 M€ et 150 M€ de Chiffre d’Affaires annuel';
    } else {
      estimatedRevenue = 'Croissance continue du Chiffre d’Affaires avec marge d’exploitation solide';
    }
  }

  if (!growthStage) {
    if (combined.includes('croissance') || combined.includes('développement')) {
      growthStage = 'Phase d’expansion soutenue & consolidation de part de marché';
    } else if (combined.includes('restructuration') || combined.includes('transformation')) {
      growthStage = 'Phase de transformation et d’optimisation des process opérationnels';
    } else {
      growthStage = 'Maturité profitable avec projets d’investissements ciblés';
    }
  }

  if (!profitabilityModel) {
    profitabilityModel = 'Marge brute optimisée, maîtrise rigoureuse du BFR et gestion proactive des liquidités';
  }

  // Enjeux financiers clés
  if (keyFinancialChallenges.length === 0) {
    if (combined.includes('trésorerie') || combined.includes('cash') || combined.includes('bfr')) {
      keyFinancialChallenges.push('Pilotage fin des flux de trésorerie et modélisation des prévisions glissantes (13 semaines).');
      keyFinancialChallenges.push('Optimisation du Besoin en Fonds de Roulement (BFR) : délais clients (DSO) et gestion des décaissements.');
    }
    if (combined.includes('clôture') || combined.includes('comptable') || combined.includes('reporting')) {
      keyFinancialChallenges.push('Accélération des délais de clôtures mensuelles (Fast Close J+5) et fiabilisation des reportings DAF.');
    }
    if (combined.includes('cac') || combined.includes('audit') || combined.includes('fiscal')) {
      keyFinancialChallenges.push('Relations de confiance avec les Commissaires aux Comptes (CAC), banques et auditeurs externes.');
    }
    if (keyFinancialChallenges.length < 2) {
      keyFinancialChallenges.push('Arbitrages d’investissements (CAPEX) et sécurisation des marges opérationnelles (EBITDA).');
      keyFinancialChallenges.push('Structuration des contrôles internes et respect des ratios bancaires (covenants).');
    }
  }

  // Outils & Stack
  const knownTools = [
    'Pennylane', 'Agicap', 'SAP', 'Sage FRP Treasury', 'Sage X3', 'Sage 100', 'Kyriba',
    'Excel (TCD / Fonctions avancées / VBA)', 'Power BI', 'Cegid', 'Salesforce', 'Lucca',
    'Yooz', 'Spendesk', 'EBICS TS', 'Swift', 'SEPA', 'Workday', 'Tableau Software'
  ];
  for (const t of knownTools) {
    if (combined.includes(t.toLowerCase()) && !toolsAndStack.includes(t)) {
      toolsAndStack.push(t);
    }
  }
  if (toolsAndStack.length === 0) {
    toolsAndStack.push('ERP Comptable & Gestion (ex: SAP / Sage / Pennylane)');
    toolsAndStack.push('TMS Trésorerie & Outils de Cash Management (Agicap / Kyriba)');
    toolsAndStack.push('Excel Avancé & Outils BI de Dataviz');
  }

  // Rattachement hiérarchique
  if (!reportingLine) {
    if (combined.includes('directeur général') || combined.includes('dg') || combined.includes('fondateur')) {
      reportingLine = 'Rattachement direct à la Direction Générale (DG) et membre du Comité de Management.';
    } else if (combined.includes('daf') || combined.includes('directeur administratif')) {
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
    keyOperationalProjects.push('Accompagnement de la croissance par la structuration des équipes et la montée en compétences.');
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
    highImpactQuestions.push({
      question: `Quelles sont vos attentes concrètes concernant les délais de clôture comptable et la mise à disposition des reportings pour la Direction Générale ?`,
      objective: 'Affirmer son engagement sur les livrables clés et son souci d’excellence opérationnelle (Fast Close).',
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
    strategicAdvice.push('Étape Direction Générale / Fondateurs : Démontrez que vous n’êtes pas uniquement un exécutant mais un garant de la visibilité financière qui aide le dirigeant à dormir serein.');
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
