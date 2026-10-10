/**
 * Utilitaire d'extraction et de scrutation intelligente des offres d'emploi
 * Permet d'extraire :
 * 1. La société émettrice (Entreprise)
 * 2. Le cabinet de recrutement ou chasseur de têtes
 * 3. L'intitulé du poste ciblé
 * 4. Règle de nommage automatique avec horodatage en cas d'absence d'information
 */

export interface ExtractedOfferMetadata {
  company: string | null;
  cabinet: string | null;
  role: string | null;
  isConfidentiel: boolean;
  isHorodatedOnly: boolean;
  suggestedTitle: string;
  horodatage: string;
  confidenceScore: number;
}

// Liste de cabinets de recrutement et agences d'intérim cadres reconnus
const KNOWN_CABINETS = [
  'Michael Page',
  'Page Personnel',
  'Robert Walters',
  'Walters People',
  'Hays',
  'Fed Finance',
  'Fed Légal',
  'Fed IT',
  'Fed Supply',
  'Fed RH',
  'Expectra',
  'Lincoln Associates',
  'Morgan Philips',
  'Robert Half',
  'Talent People',
  'Randstad Search',
  'Randstad',
  'Adecco Executive',
  'Adecco',
  'Manpower Professional',
  'Manpower',
  'Badenoch + Clark',
  'Badenoch & Clark',
  'LHH Recruitment',
  'LHH',
  'Progress Associés',
  'Arthur Hunt',
  'Boyden',
  'Russell Reynolds',
  'Egon Zehnder',
  'Spencer Stuart',
  'Stanton Wallace',
  'Korn Ferry',
  'Approach People',
  'Aquent',
  'Amrop',
  'Mercuri Urval',
  'Spring Professional',
  'Altaide',
  'Elitis',
  'Alexander Hughes',
  'Hudson',
  'Voluntae',
  'Fyte',
  'Talents RH',
];

// Liste de grands groupes / marques identifiables
const KNOWN_COMPANIES = [
  'SUPRATEC', 'Supratec', 'Equans', 'Sanef', 'Abertis', 'Vauban Infrastructure',
  'TotalEnergies', 'Airbus', 'Sanofi', "L'Oréal", 'LVMH', 'BNP Paribas', 'Société Générale',
  'Crédit Agricole', 'Danone', 'Schneider Electric', 'Capgemini', 'Dassault Systèmes',
  'Dassault Aviation', 'Orange', 'Renault', 'Stellantis', 'Michelin', 'Saint-Gobain',
  'Veolia', 'Engie', 'Thales', 'Carrefour', 'Safran', 'Pernod Ricard', 'Bouygues',
  'Vinci', 'Hermès', 'Legrand', 'Alstom', 'Publicis', 'Sodexo', 'Arkema', 'Edenred',
  'Teleperformance', 'Worldline', 'Accor', 'Atos', 'Kering', 'SNCF', 'La Poste',
  'EDF', 'AXA', 'Natixis', 'BPCE', 'Mazars', 'KPMG', 'PwC', 'Deloitte', 'EY',
  'Bolloré', 'Decathlon', 'Leroy Merlin', 'Auchan', 'Ken Group', 'Masada',
  'InnovFinance Group', 'Pennylane', 'Agicap', 'Kyriba', 'Alan', 'Doctolib',
  'Qonto', 'Swile', 'Mirakl', 'Payfit', 'BlaBlaCar', 'Back Market', 'Voodoo'
];

/**
 * Nettoie une chaîne extraite (retire localisations, mentions types de contrat, etc.)
 */
function cleanExtractedName(raw: string): string {
  let cleaned = raw.trim();
  // Retirer les balises markdown
  cleaned = cleaned.replace(/[*#_`]/g, '').trim();

  // Retirer les compléments géographiques ou contractuels : " - Paris (Télétravail 2j/semaine)", ", Lyon", " | CDI"
  cleaned = cleaned.replace(/\s*[-–|/]\s*(?:Paris|Lyon|Marseille|Lille|Bordeaux|Nantes|Toulouse|Strasbourg|Montrouge|La Défense|Île-de-France|France|Remote|Télétravail|CDI|CDD|Stage|Alternance|Freelance).*$/i, '');
  cleaned = cleaned.replace(/\s*\([^)]*(?:Télétravail|Remote|CDI|CDD|Paris|Lyon|France)[^)]*\)/gi, '');
  cleaned = cleaned.replace(/^[–\-:\s]+|[–\-:\s]+$/g, '');

  return cleaned.trim();
}

/**
 * Nettoie un intitulé de poste
 */
function cleanRoleTitle(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/[*#_`]/g, '').trim();
  cleaned = cleaned.replace(/\s*\(?\s*(?:H\/F|F\/H|M\/F|H\s*\/\s*F)\s*\)?/gi, '');
  cleaned = cleaned.replace(/\s*[-–|/]\s*(?:CDI|CDD|Stage|Alternance|Freelance|Paris|Lyon|Télétravail).*$/i, '');
  return cleaned.trim();
}

/**
 * Scrute l'offre d'emploi (texte, URL, analyse Gemini) pour extraire société, cabinet, poste
 */
export function extractOfferMetadata(
  jobText: string = '',
  jobUrl: string = '',
  analysisText: string = ''
): ExtractedOfferMetadata {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const horodatage = `${dateFormatted} à ${timeFormatted}`;

  if (!jobText.trim() && !jobUrl.trim()) {
    return {
      company: null,
      cabinet: null,
      role: null,
      isConfidentiel: false,
      isHorodatedOnly: true,
      suggestedTitle: `Analyse du ${horodatage}`,
      horodatage,
      confidenceScore: 0,
    };
  }

  let extractedCompany: string | null = null;
  let extractedCabinet: string | null = null;
  let extractedRole: string | null = null;
  let isConfidentiel = false;
  let confidence = 0;

  // 1. Détection via métadonnées explicites de l'analyse Gemini si présentes
  // Gemini peut inclure un bloc "- Entreprise / Société : [Nom]"
  if (analysisText) {
    const geminiCompanyMatch = analysisText.match(/(?:Entreprise|Société|Client)\s*(?:émettrice)?\s*:\s*([^\n\r]+)/i);
    if (geminiCompanyMatch && geminiCompanyMatch[1]) {
      const candidate = cleanExtractedName(geminiCompanyMatch[1]);
      if (candidate.length > 1 && !/non\s*mentionn[ée]|inconnue?|confidentiel/i.test(candidate)) {
        extractedCompany = candidate;
        confidence += 35;
      }
    }

    const geminiCabinetMatch = analysisText.match(/(?:Cabinet(?:\s+de\s+recrutement)?)\s*:\s*([^\n\r]+)/i);
    if (geminiCabinetMatch && geminiCabinetMatch[1]) {
      const candidate = cleanExtractedName(geminiCabinetMatch[1]);
      if (candidate.length > 1 && !/aucun|non|non\s*mentionn[ée]/i.test(candidate)) {
        extractedCabinet = candidate;
        confidence += 40;
      }
    }

    const geminiRoleMatch = analysisText.match(/(?:Intitulé du poste|Poste ciblé|Poste)\s*:\s*([^\n\r]+)/i);
    if (geminiRoleMatch && geminiRoleMatch[1]) {
      const candidate = cleanRoleTitle(geminiRoleMatch[1]);
      if (candidate.length > 2) {
        extractedRole = candidate;
        confidence += 25;
      }
    }
  }

  // 2. Détection du Cabinet de Recrutement dans le texte de l'offre
  // Recherche par mots-clés de cabinets connus
  for (const cabinet of KNOWN_CABINETS) {
    const escaped = cabinet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(jobText)) {
      extractedCabinet = cabinet;
      confidence += 50;
      break;
    }
  }

  // Motifs textuels de cabinet (ex: "Cabinet de recrutement XYZ", "recruté par le cabinet ABC")
  if (!extractedCabinet) {
    const cabinetPatterns = [
      /Cabinet(?:\s+de\s+recrutement)?\s*[:\-–]\s*([A-ZÀ-ÖØ-ß][\w\s&.'’-]{2,35})/i,
      /recrutement\s+(?:géré|piloté|assuré|confié)\s+par(?:\s+le\s+cabinet)?\s*[:\-–]?\s*([A-ZÀ-ÖØ-ß][\w\s&.'’-]{2,35})/i,
      /Pour\s+le\s+compte\s+d['’]un\s+(?:de\s+nos\s+)?clients(?:\s*,\s*le\s+cabinet\s+([A-ZÀ-ÖØ-ß][\w\s&.'’-]{2,30}))?/i,
    ];

    for (const pat of cabinetPatterns) {
      const m = jobText.match(pat);
      if (m && m[1]) {
        const cleaned = cleanExtractedName(m[1]);
        if (cleaned.length > 1 && !/notre\s+client|client\s+final/i.test(cleaned)) {
          extractedCabinet = cleaned;
          confidence += 40;
          break;
        }
      }
    }
  }

  // 3. Détection de la Société Émettrice dans le texte de l'offre
  // Patterns explicites avec étiquettes : "Entreprise : ...", "Société : ...", "Employeur : ..."
  const companyExplicitPatterns = [
    /(?:Entreprise|Société|Employeur)\s*[:\-–]\s*([^\n\r]+)/i,
    /À\s+propos\s+d['’]\s*([A-ZÀ-ÖØ-ß][\w\s&.'’-]{2,35})/i,
    /À\s+propos\s+du\s+Groupe\s*([A-ZÀ-ÖØ-ß][\w\s&.'’-]{2,35})/i,
    /Rejoindre\s+([A-ZÀ-ÖØ-ß][\w\s&.'’-]{2,35})/i,
    /Bienvenue\s+chez\s+([A-ZÀ-ÖØ-ß][\w\s&.'’-]{2,35})/i,
    /Notre\s+client\s*,\s*([A-ZÀ-ÖØ-ß][\w\s&.'’-]{2,35}?)(?:,|\.|\s+est|\s+recherche|\s+recrute)/i,
  ];

  if (!extractedCompany) {
    for (const pat of companyExplicitPatterns) {
      const m = jobText.match(pat);
      if (m && m[1]) {
        const candidate = cleanExtractedName(m[1]);
        if (
          candidate.length >= 2 &&
          !/poste|missions|profil|description|cdi|cdd|notre|qui\s+sommes|tous|toutes/i.test(candidate)
        ) {
          extractedCompany = candidate;
          confidence += 40;
          break;
        }
      }
    }
  }

  // Recherche dans les marques / entreprises connues
  if (!extractedCompany) {
    for (const comp of KNOWN_COMPANIES) {
      const escaped = comp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(jobText)) {
        extractedCompany = comp;
        confidence += 35;
        break;
      }
    }
  }

  // Détection via l'URL source si présente
  if (jobUrl.trim()) {
    try {
      const urlObj = new URL(jobUrl.trim().startsWith('http') ? jobUrl.trim() : `https://${jobUrl.trim()}`);
      const hostname = urlObj.hostname.toLowerCase();

      // Check WTTJ : welcometothejungle.com/fr/companies/alan/jobs/...
      const wttjMatch = urlObj.pathname.match(/\/companies\/([^/]+)/);
      if (wttjMatch && wttjMatch[1]) {
        const slug = wttjMatch[1].replace(/-/g, ' ');
        const formatted = slug.charAt(0).toUpperCase() + slug.slice(1);
        if (!extractedCompany) {
          extractedCompany = formatted;
          confidence += 30;
        }
      }

      // Check Careers domain (ex: careers.loreal.com)
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const mainDomain = parts[parts.length - 2];
        if (!['indeed', 'linkedin', 'apec', 'hellowork', 'monster', 'cadremploi', 'welcometothejungle', 'pole-emploi', 'francetravail'].includes(mainDomain)) {
          const capitalized = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
          if (!extractedCompany) {
            extractedCompany = capitalized;
            confidence += 20;
          }
        }
      }
    } catch {
      // Ignorer erreur URL
    }
  }

  // Détection de la notion de confidentialité
  if (/confidentiel|anonyme|cabinet\s+chasse|client\s+confidentiel/i.test(jobText)) {
    isConfidentiel = true;
    if (!extractedCompany) {
      extractedCompany = 'Client Confidentiel';
    }
  }

  // 4. Détection de l'Intitulé du Poste
  if (!extractedRole) {
    const rolePatterns = [
      /(?:Intitulé\s+du\s+poste|Poste|Titre\s+du\s+poste|Offre)\s*[:\-–]\s*([^\n\r]+)/i,
      /(?:recherche|recrute)\s+(?:un|une|son|sa|notre)\s+([A-ZÀ-ÖØ-ß][\w\s/()\-–]{3,45}?)(?:\s+(?:H\/F|F\/H|\(H\/F\)|\(F\/H\)|en CDI|en CDD|pour|\.|\n))/i,
    ];

    for (const pat of rolePatterns) {
      const m = jobText.match(pat);
      if (m && m[1]) {
        const candidate = cleanRoleTitle(m[1]);
        if (candidate.length > 2 && candidate.length < 65) {
          extractedRole = candidate;
          confidence += 30;
          break;
        }
      }
    }

    // Fallback première ligne si elle ressemble à un poste
    if (!extractedRole) {
      const firstLine = jobText.trim().split('\n')[0].replace(/^[#*\s-]+/, '').trim();
      const rolePrefixes = [
        'trésorier', 'directeur', 'responsable', 'chef', 'manager', 'consultant',
        'analyste', 'comptable', 'développeur', 'ingénieur', 'gestionnaire',
        'lead', 'chargé', 'assistant', 'auditeur', 'contrôleur'
      ];
      const lower = firstLine.toLowerCase();
      if (rolePrefixes.some((p) => lower.includes(p)) && firstLine.length < 70) {
        extractedRole = cleanRoleTitle(firstLine);
        confidence += 20;
      }
    }
  }

  // 5. Règle de nommage intelligente de l'analyse
  const hasEntity = Boolean(extractedCompany || extractedCabinet);
  const isHorodatedOnly = !hasEntity;

  let suggestedTitle = '';

  if (extractedCabinet && extractedCompany && extractedCompany !== 'Client Confidentiel') {
    suggestedTitle = extractedRole
      ? `${extractedCabinet} (${extractedCompany}) - ${extractedRole}`
      : `${extractedCabinet} (${extractedCompany}) - Analyse du ${horodatage}`;
  } else if (extractedCabinet) {
    suggestedTitle = extractedRole
      ? `${extractedCabinet} - ${extractedRole}`
      : `${extractedCabinet} - Analyse du ${horodatage}`;
  } else if (extractedCompany) {
    suggestedTitle = extractedRole
      ? `${extractedCompany} - ${extractedRole}`
      : `${extractedCompany} - Analyse du ${horodatage}`;
  } else if (extractedRole) {
    // Si aucun cabinet ni entreprise n'a été trouvé, on horodate obligatoirement
    suggestedTitle = `${extractedRole} (Analyse du ${horodatage})`;
  } else {
    // Aucune entité ni poste trouvé : horodatage strict
    suggestedTitle = `Analyse du ${horodatage}`;
  }

  // Limiter la taille du titre
  if (suggestedTitle.length > 80) {
    suggestedTitle = suggestedTitle.slice(0, 77) + '...';
  }

  return {
    company: extractedCompany,
    cabinet: extractedCabinet,
    role: extractedRole,
    isConfidentiel,
    isHorodatedOnly,
    suggestedTitle,
    horodatage,
    confidenceScore: Math.min(100, confidence),
  };
}
