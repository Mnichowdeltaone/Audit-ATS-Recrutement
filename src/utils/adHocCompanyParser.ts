/**
 * Utilitaire de recherche et d'extraction de données issues des sites ad hoc
 * (Pappers, Société.com, Annuaire des Entreprises gouv, Infogreffe, LinkedIn, etc.)
 */
import type {
  CompanyFinancialTechnicalDossier,
  LegalAndCorporateInfo,
  CompanyExecutiveInfo,
} from '../types';

export interface AdHocPlatform {
  id: string;
  name: string;
  category: 'legal' | 'social' | 'reputation' | 'news';
  shortDesc: string;
  badgeText: string;
  badgeColor: string;
  getUrl: (query: string, siren?: string) => string;
}

export const AD_HOC_PLATFORMS: AdHocPlatform[] = [
  {
    id: 'pappers',
    name: 'Pappers.fr',
    category: 'legal',
    shortDesc: 'Bilans gratuits, statuts, bénéficiaires effectifs, conventions collectives',
    badgeText: 'Bilans & Statuts',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    getUrl: (q, siren) =>
      siren && siren.replace(/\s/g, '').length >= 9
        ? `https://www.pappers.fr/entreprise/${siren.replace(/\s/g, '').slice(0, 9)}`
        : `https://www.pappers.fr/recherche?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'societe_com',
    name: 'Société.com',
    category: 'legal',
    shortDesc: 'RCS, chiffres clés, historique, établissement secondaire, solvabilité',
    badgeText: 'Chiffres Clés RCS',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    getUrl: (q, siren) =>
      siren && siren.replace(/\s/g, '').length >= 9
        ? `https://www.societe.com/societe/${siren.replace(/\s/g, '').slice(0, 9)}.html`
        : `https://www.societe.com/cgi-bin/search?champs=${encodeURIComponent(q)}`,
  },
  {
    id: 'annuaire_gouv',
    name: 'Annuaire des Entreprises (data.gouv.fr)',
    category: 'legal',
    shortDesc: 'Registre officiel d\'État (INSEE, RNE, sans publicité, données certifiées)',
    badgeText: 'Officiel Gouv',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    getUrl: (q, siren) =>
      siren && siren.replace(/\s/g, '').length >= 9
        ? `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren.replace(/\s/g, '').slice(0, 9)}`
        : `https://annuaire-entreprises.data.gouv.fr/rechercher?terme=${encodeURIComponent(q)}`,
  },
  {
    id: 'infogreffe',
    name: 'Infogreffe.fr',
    category: 'legal',
    shortDesc: 'Greffe officiel des Tribunaux de Commerce de France',
    badgeText: 'Greffe Commerce',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    getUrl: (q) =>
      `https://www.infogreffe.fr/recherche-entreprise-dirigeant/resultats-de-recherche?recherche=${encodeURIComponent(q)}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Entreprises',
    category: 'social',
    shortDesc: 'Effectif réel, croissance annuelle, décideurs, organigramme',
    badgeText: 'Décideurs & Équipe',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    getUrl: (q) =>
      `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(q)}`,
  },
  {
    id: 'google_news',
    name: 'Google Actualités & Finances',
    category: 'news',
    shortDesc: 'Presse économique, levées de fonds, rachats récents, interviews dirigeants',
    badgeText: 'Presse & Éco',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    getUrl: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(`${q} entreprise chiffre d affaires dirigeants actualites`)}`,
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor Avis & Salaires',
    category: 'reputation',
    shortDesc: 'Avis des salariés, fourchettes de salaires, questions réelles d\'entretien',
    badgeText: 'Avis Salariés',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    getUrl: (q) =>
      `https://www.glassdoor.fr/Avis/index.htm?keyword=${encodeURIComponent(q)}`,
  },
  {
    id: 'wttj',
    name: 'Welcome to the Jungle',
    category: 'reputation',
    shortDesc: 'Culture d\'entreprise, bureaux, valeurs, métiers présentés en vidéo',
    badgeText: 'Culture & Bureaux',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
    getUrl: (q) =>
      `https://www.welcometothejungle.com/fr/companies?query=${encodeURIComponent(q)}`,
  },
];

export interface ParsedAdHocResult {
  legalName?: string;
  commercialBrand?: string;
  siren?: string;
  rcsCity?: string;
  headquarters?: string;
  legalForm?: string;
  creationYear?: string;
  estimatedRevenue?: string;
  estimatedSize?: string;
  websiteUrl?: string;
  shareholdersAndBackers?: string;
  sector?: string;
  activitiesPillars: string[];
  keyExecutives: CompanyExecutiveInfo[];
  rawNotesSnippet?: string;
}

/**
 * Analyse heuristique et robuste de texte copié/collé depuis les sites ad hoc
 * (Pappers, Société.com, Annuaire Entreprises, site officiel, LinkedIn...)
 */
export function parseAdHocCompanyText(
  rawText: string,
  defaultCompanyName: string = ''
): ParsedAdHocResult {
  const text = (rawText || '').trim();
  const result: ParsedAdHocResult = {
    activitiesPillars: [],
    keyExecutives: [],
    rawNotesSnippet: text.slice(0, 1000),
  };

  if (!text) return result;

  // 1. Détection du SIREN (9 chiffres consécutifs ou groupés par 3)
  const sirenMatch = text.match(/(?:siren|siret|n°\s*siren)[\s:]*([0-9]{3}[\s.]?[0-9]{3}[\s.]?[0-9]{3})/i)
    || text.match(/\b([0-9]{3}\s[0-9]{3}\s[0-9]{3})\b/);
  if (sirenMatch) {
    result.siren = sirenMatch[1].replace(/[\s.]/g, '');
  }

  // 2. Détection du RCS & Ville
  const rcsMatch = text.match(/rcs\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,25})(?:\s+[0-9]|\s*,|\s*\.|\n|$)/i);
  if (rcsMatch) {
    result.rcsCity = rcsMatch[1].trim();
  }

  // 3. Détection de la Forme Juridique
  const legalFormMatch = text.match(
    /\b(société par actions simplifiée|société anonyme|société à responsabilité limitée|sas\s+unipersonnelle|sasu|sarl|sas|sa|eurl|sci|gie|scop)\b/i
  );
  if (legalFormMatch) {
    const rawForm = legalFormMatch[1].toUpperCase();
    if (rawForm.includes('PAR ACTIONS SIMPLIFIÉE') || rawForm === 'SAS') result.legalForm = 'Société par Actions Simplifiée (SAS)';
    else if (rawForm.includes('SASU') || rawForm.includes('UNIPERSONNELLE')) result.legalForm = 'SAS Unipersonnelle (SASU)';
    else if (rawForm.includes('RESPONSABILITÉ LIMITÉE') || rawForm === 'SARL') result.legalForm = 'Société à Responsabilité Limitée (SARL)';
    else if (rawForm.includes('ANONYME') || rawForm === 'SA') result.legalForm = 'Société Anonyme (SA)';
    else result.legalForm = rawForm;
  }

  // 4. Détection de la Raison Sociale / Dénomination
  const legalNameMatch = text.match(
    /(?:dénomination\s*(?:sociale)?|raison\s+sociale|nom\s+de\s+l'entreprise)[\s:]+([^\n\r,;]{3,60})/i
  );
  if (legalNameMatch) {
    result.legalName = legalNameMatch[1].trim();
  } else if (!result.legalName && defaultCompanyName) {
    result.legalName = defaultCompanyName;
  }

  // 5. Détection de l'année de création
  const creationMatch = text.match(
    /(?:créée?\s+en|date\s+de\s+création|immatriculée?\s+le|année\s+de\s+création)[\s:]+([0-9]{4}|\d{2}\/\d{2}\/([0-9]{4}))/i
  );
  if (creationMatch) {
    result.creationYear = creationMatch[2] || creationMatch[1];
  }

  // 6. Détection du Siège Social / Adresse
  const hqMatch = text.match(
    /(?:siège\s+social|adresse\s*(?:du\s+siège)?)[\s:]+([^\n\r]{6,90})/i
  );
  if (hqMatch) {
    result.headquarters = hqMatch[1].replace(/^[–\-:\s]+/, '').trim();
  }

  // 7. Détection du Chiffre d'Affaires
  const caMatch = text.match(
    /(?:chiffre\s+d'affaires|c\.a\.|ca\s*(?:20\d\d)?)[\s:]+([0-9\s.,]+(?:\s*(?:k€|k|m€|m|millions?|milliards?|€|euros?))?)/i
  );
  if (caMatch) {
    result.estimatedRevenue = caMatch[0].trim();
  }

  // 8. Détection de l'effectif / taille
  const sizeMatch = text.match(
    /(?:effectif|salariés?|collaborateurs?)[\s:]+([0-9\s-]+(?:\s*salariés|\s*personnes|\s*collaborateurs)?)/i
  );
  if (sizeMatch) {
    result.estimatedSize = sizeMatch[0].trim();
  }

  // 9. Détection du site web
  const webMatch = text.match(/(https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s,)]*)?|www\.[a-z0-9.-]+\.[a-z]{2,})/i);
  if (webMatch) {
    const rawUrl = webMatch[1];
    result.websiteUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  }

  // 10. Détection des Dirigeants
  const execRegex = /(?:président(?:e)?|directeur\s+général|directrice\s+générale|gérant(?:e)?|fondateur|fondatrice|daf|directeur\s+financier)[\s:]+([A-ZÀ-ÖØ-öø-ÿ\s'-]{3,35})(?:\s*\(([^)]+)\)|\s*[-–]|,|\n|$)/gi;
  let matchExec: RegExpExecArray | null;
  while ((matchExec = execRegex.exec(text)) !== null) {
    const fullRole = matchExec[0].split(':')[0].trim();
    const name = matchExec[1].trim();
    if (name && name.length >= 3 && !name.toLowerCase().includes('société') && !name.toLowerCase().includes('entreprise')) {
      const exists = result.keyExecutives.some((e) => e.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        result.keyExecutives.push({
          name,
          title: fullRole.charAt(0).toUpperCase() + fullRole.slice(1),
          roleDescription: 'Dirigeant mentionné au registre des entreprises / ad hoc',
        });
      }
    }
  }

  // 11. Détection des Piliers / Activité NAF
  const nafMatch = text.match(/(?:activité|code\s+naf|code\s+ape)[\s:]+([^\n\r]{6,120})/i);
  if (nafMatch) {
    const act = nafMatch[1].trim();
    result.activitiesPillars.push(`Activité déclarée : ${act}`);
  }

  // 12. Détection Actionnariat
  const capitalMatch = text.match(/(?:capital\s+social|actionnariat|actionnaires?)[\s:]+([^\n\r]{5,90})/i);
  if (capitalMatch) {
    result.shareholdersAndBackers = capitalMatch[0].trim();
  }

  return result;
}

/**
 * Fusionne les informations extraites des sites ad hoc dans le dossier existant
 */
export function mergeAdHocDataIntoDossier(
  current: CompanyFinancialTechnicalDossier,
  parsed: ParsedAdHocResult
): CompanyFinancialTechnicalDossier {
  const currentLegal: LegalAndCorporateInfo = current.legalInfo || {};

  const mergedLegal: LegalAndCorporateInfo = {
    ...currentLegal,
    legalName: parsed.legalName || currentLegal.legalName || current.companyName,
    commercialBrand: parsed.commercialBrand || currentLegal.commercialBrand || current.companyName,
    siren: parsed.siren || currentLegal.siren,
    rcsCity: parsed.rcsCity || currentLegal.rcsCity,
    websiteUrl: parsed.websiteUrl || currentLegal.websiteUrl || current.websiteUrl,
    headquarters: parsed.headquarters || currentLegal.headquarters || current.location,
    creationYear: parsed.creationYear || currentLegal.creationYear,
    legalForm: parsed.legalForm || currentLegal.legalForm,
    aumOrKeyMetrics: parsed.estimatedRevenue || currentLegal.aumOrKeyMetrics || current.financialProfile.estimatedRevenue,
    shareholdersAndBackers: parsed.shareholdersAndBackers || currentLegal.shareholdersAndBackers || current.ownershipStructure,
    verifiedOnAdHocSites: true,
    adHocVerifiedAt: new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    adHocSourceNotes: parsed.rawNotesSnippet
      ? (currentLegal.adHocSourceNotes
          ? `${currentLegal.adHocSourceNotes}\n\n[Synchronisation Ad Hoc du ${new Date().toLocaleDateString('fr-FR')}]\n${parsed.rawNotesSnippet}`
          : parsed.rawNotesSnippet)
      : currentLegal.adHocSourceNotes,
  };

  // Fusionner les dirigeants
  if (parsed.keyExecutives.length > 0) {
    const existing = currentLegal.keyExecutives || [];
    const names = new Set(existing.map((e) => e.name.toLowerCase()));
    const newExecs = parsed.keyExecutives.filter((e) => !names.has(e.name.toLowerCase()));
    mergedLegal.keyExecutives = [...existing, ...newExecs];
  }

  // Fusionner les piliers
  if (parsed.activitiesPillars.length > 0) {
    const existingPillars = currentLegal.activitiesPillars || [];
    const mergedPillars = Array.from(new Set([...existingPillars, ...parsed.activitiesPillars]));
    mergedLegal.activitiesPillars = mergedPillars;
  }

  const updatedFinancialProfile = {
    ...current.financialProfile,
    estimatedRevenue: parsed.estimatedRevenue || current.financialProfile.estimatedRevenue,
  };

  return {
    ...current,
    companyName: parsed.legalName || current.companyName,
    sector: parsed.sector || current.sector,
    estimatedSize: parsed.estimatedSize || current.estimatedSize,
    location: parsed.headquarters || current.location,
    websiteUrl: parsed.websiteUrl || current.websiteUrl,
    ownershipStructure: parsed.shareholdersAndBackers || current.ownershipStructure,
    legalInfo: mergedLegal,
    financialProfile: updatedFinancialProfile,
    isAdHocVerified: true,
    adHocVerifiedAt: mergedLegal.adHocVerifiedAt,
  };
}
