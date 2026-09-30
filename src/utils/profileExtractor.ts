import { UserProfile } from '../types';

/**
 * Nettoie une chaîne de texte
 */
function clean(str: string): string {
  return str.replace(/[\r\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Extraction instantanée par heuristiques et expressions régulières
 * Fonctionne 100% hors-ligne, sans dépendance API
 */
export function extractProfileFromCvTextLocal(cvText: string): Partial<UserProfile> {
  const lines = cvText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return {};

  const extracted: Partial<UserProfile> = {
    targetRoles: [],
    skills: [],
  };

  // 1. Détection de l'email
  const emailMatch = cvText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    extracted.email = emailMatch[1].trim();
  }

  // 2. Détection du téléphone (formats FR et internationaux)
  const phoneMatch = cvText.match(/(?:(?:\+|00)33[\s.-]?\(0\)[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}/);
  if (phoneMatch) {
    extracted.phone = phoneMatch[0].trim();
  }

  // 3. Détection des liens web (LinkedIn, GitHub, Portfolio)
  const linkedinMatch = cvText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  if (linkedinMatch) {
    extracted.linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;
  }

  const githubMatch = cvText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
  if (githubMatch) {
    extracted.githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`;
  }

  // 4. Détection du nom et prénom (généralement dans les 3 premières lignes)
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    // Ignorer les lignes manifestement techniques ou titres génériques
    if (
      line.toUpperCase().includes('CURRICULUM') ||
      line.toUpperCase().includes('VITAE') ||
      line.toUpperCase().includes('PAGE ') ||
      line.includes('@')
    ) {
      continue;
    }

    // Isoler la partie nom avant l'adresse ou le téléphone
    const lineBeforeContact = line.split(/[|•\d,]/)[0].trim();
    const words = lineBeforeContact.split(/\s+/).filter(Boolean);

    if (words.length >= 2 && words.length <= 4) {
      // Si au moins un mot est en capitales ou type nom propre
      const hasProperWords = words.every((w) => /^[A-ZÀ-ÖØ-ßa-z-]{2,}$/.test(w));
      if (hasProperWords) {
        // Premier mot = prénom, reste = nom
        extracted.firstName = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
        extracted.lastName = words.slice(1).join(' ').toUpperCase();
        break;
      }
    }
  }

  // 5. Détection de la localisation (Code postal + Ville ou mots clés)
  const postalCityMatch = cvText.match(/\b(\d{5})\b\s+([A-ZÀ-ÖØ-ßa-z\s-]+)/);
  if (postalCityMatch) {
    extracted.location = clean(`${postalCityMatch[2]} (${postalCityMatch[1]})`);
  } else {
    const cityMatch = cvText.match(/\b(Paris|Lyon|Marseille|Toulouse|Bordeaux|Nantes|Lille|Strasbourg|Rennes|Montrouge|Nice|Montpellier)\b/i);
    if (cityMatch) {
      extracted.location = cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1).toLowerCase();
    }
  }

  // 6. Détection du Titre / Rôle Cible
  // Souvent placé après les coordonnées ou en début de document en majuscules
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];
    if (line.includes('@') || line.match(/\d{2}[\s.-]?\d{2}/) || line.length < 5) continue;
    if (
      line.toUpperCase().includes('RÉSUMÉ') ||
      line.toUpperCase().includes('RESUME') ||
      line.toUpperCase().includes('PROFIL') ||
      line.toUpperCase().includes('EXPÉRIENCE')
    ) {
      break;
    }

    // Si la ligne ressemble à un titre de poste
    if (
      line === line.toUpperCase() ||
      line.includes('/') ||
      line.includes('|') ||
      /responsable|directeur|développeur|ingénieur|consultant|manager|chef de projet|trésorier|analyste/i.test(line)
    ) {
      const cleanTitle = clean(line.replace(/^[#*•\s-]+/, ''));
      if (cleanTitle.length > 4 && cleanTitle.length < 90) {
        extracted.currentTitle = cleanTitle;
        // Découper en rôles cibles si slash ou pipe
        const roles = cleanTitle
          .split(/[/|]+/)
          .map((r) => clean(r))
          .filter((r) => r.length > 3);
        if (roles.length > 0) {
          extracted.targetRoles = roles;
        }
        break;
      }
    }
  }

  // 7. Détection de la Bio / Résumé / Synthèse
  const bioRegex = /(?:RÉSUMÉ|RESUME|PROFIL|SYNTHÈSE|A PROPOS|À PROPOS|OBJECTIF)\s*[:\n\r]+([\s\S]*?)(?=(?:COMPÉTENCES|COMPETENCES|EXPÉRIENCES|EXPERIENCES|FORMATION|PARCOURS|$))/i;
  const bioMatch = cvText.match(bioRegex);
  if (bioMatch && bioMatch[1]) {
    const cleanBio = clean(bioMatch[1].slice(0, 900));
    if (cleanBio.length > 30) {
      extracted.bio = cleanBio;
    }
  }

  // 8. Détection des Compétences Clés
  const skillsRegex = /(?:COMPÉTENCES|COMPETENCES|SKILLS|SAVOIR-FAIRE|OUTILS|ENVIRONNEMENT TECHNIQUE)\s*(?:CLÉS|CLES)?\s*[:\n\r]+([\s\S]*?)(?=(?:EXPÉRIENCES|EXPERIENCES|FORMATION|PARCOURS|RÉSUMÉ|$))/i;
  const skillsMatch = cvText.match(skillsRegex);
  if (skillsMatch && skillsMatch[1]) {
    const skillsBlock = skillsMatch[1];
    // Découper par puces, retours chariots, ou virgules
    const rawSkills = skillsBlock
      .split(/[\n\r•\-;*]+/)
      .flatMap((s) => s.split(','))
      .map((s) => clean(s.replace(/^[A-Z\s&]+:/, ''))) // Retirer les préfixes comme "Trésorerie & Finance :"
      .filter((s) => s.length >= 2 && s.length <= 60 && !/^(et|ou|de|des|avec)$/i.test(s));

    // Dédupliquer en conservant l'ordre
    const uniqueSkills = Array.from(new Set(rawSkills));
    if (uniqueSkills.length > 0) {
      extracted.skills = uniqueSkills.slice(0, 25);
    }
  }

  // Si aucun rôle cible spécifique détecté, utiliser le titre
  if ((!extracted.targetRoles || extracted.targetRoles.length === 0) && extracted.currentTitle) {
    extracted.targetRoles = [extracted.currentTitle];
  }

  return extracted;
}

/**
 * Extraction intelligente combinée (Essaye d'abord l'API Gemini pour un résultat ultra-précis,
 * avec bascule automatique sur l'extracteur heuristique local)
 */
export async function extractProfileFromCv(
  cvText: string,
  apiKey?: string,
  model = 'gemini-3.8-flash'
): Promise<Partial<UserProfile>> {
  if (!cvText || !cvText.trim()) return {};

  const localExtracted = extractProfileFromCvTextLocal(cvText);

  try {
    const res = await fetch('/api/extract-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cvText: cvText.trim(),
        apiKey: apiKey?.trim() || undefined,
        model,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.profile) {
        const aiProfile = data.profile as Partial<UserProfile>;
        // Fusionner en favorisant les champs IA valides et les valeurs locales
        return {
          firstName: aiProfile.firstName || localExtracted.firstName || '',
          lastName: aiProfile.lastName || localExtracted.lastName || '',
          email: aiProfile.email || localExtracted.email || '',
          phone: aiProfile.phone || localExtracted.phone || '',
          location: aiProfile.location || localExtracted.location || '',
          currentTitle: aiProfile.currentTitle || localExtracted.currentTitle || '',
          bio: aiProfile.bio || localExtracted.bio || '',
          linkedinUrl: aiProfile.linkedinUrl || localExtracted.linkedinUrl || '',
          githubUrl: aiProfile.githubUrl || localExtracted.githubUrl || '',
          portfolioUrl: aiProfile.portfolioUrl || localExtracted.portfolioUrl || '',
          targetRoles: Array.isArray(aiProfile.targetRoles) && aiProfile.targetRoles.length > 0
            ? aiProfile.targetRoles
            : localExtracted.targetRoles || [],
          skills: Array.isArray(aiProfile.skills) && aiProfile.skills.length > 0
            ? aiProfile.skills
            : localExtracted.skills || [],
        };
      }
    }
  } catch (err) {
    console.warn('Appel extraction profil IA indisponible, utilisation heuristique locale :', err);
  }

  return localExtracted;
}
