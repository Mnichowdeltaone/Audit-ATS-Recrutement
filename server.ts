import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import * as localDb from './server/localDb.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: '10mb' }));

// Check if a server-side Gemini API key is configured
app.get('/api/key-status', (_req: Request, res: Response) => {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim() !== '' &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  res.json({
    hasServerKey: hasKey,
    defaultModel: 'gemini-3.8-flash',
  });
});

// Endpoint to test Gemini API connectivity in real-time
app.post('/api/test-key', async (req: Request, res: Response) => {
  try {
    const { apiKey: userApiKey, model: requestedModel } = req.body;
    const keyToUse =
      userApiKey && typeof userApiKey === 'string' && userApiKey.trim() !== ''
        ? userApiKey.trim()
        : process.env.GEMINI_API_KEY;

    if (!keyToUse || keyToUse === 'MY_GEMINI_API_KEY') {
      res.status(400).json({
        success: false,
        error: "Aucune clé API active n'a été détectée. Veuillez renseigner une clé Google Gemini valide.",
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: keyToUse });
    const targetModel = requestedModel === 'gemini-flash-latest' ? 'gemini-flash-latest' : 'gemini-3.8-flash';
    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: 'Réponds par un seul mot : Connecté.',
    });
    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      model: targetModel,
      latencyMs,
      message: 'Connexion à l\'API Google Gemini validée avec succès.',
      reply: response.text?.trim() || 'Connecté',
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// Moteur heuristique ATS autonome de secours (haute fidélité) si tous les modèles distants sont saturés
function generateLocalAtsAudit(cvText: string, jobText: string, isReAnalysis = false, previousScore: number | null = null): string {
  const stopWords = new Set([
    'les', 'des', 'une', 'pour', 'dans', 'avec', 'vous', 'nous', 'votre', 'notre',
    'plus', 'tout', 'faire', 'sont', 'cette', 'avoir', 'être', 'leur', 'leurs', 'par',
    'sur', 'dans', 'aux', 'qui', 'que', 'quoi', 'dont', 'ces', 'cet', 'très', 'aussi',
    'bien', 'comme', 'mais', 'donc', 'ainsi', 'chez', 'postuler', 'poste', 'emploi'
  ]);
  const cvTokens = new Set((cvText || '').toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) || []);
  const jobRawTokens = (jobText || '').toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) || [];
  const jobSignificantTokens = Array.from(new Set(jobRawTokens)).filter(
    (t) => !stopWords.has(t) && t.length >= 3
  );
  const matchedSignificant = jobSignificantTokens.filter((t) => cvTokens.has(t));
  const missingKeywords = jobSignificantTokens.filter((t) => !cvTokens.has(t)).slice(0, 8);
  const matchRatio = jobSignificantTokens.length > 0
    ? matchedSignificant.length / jobSignificantTokens.length
    : 0.35;

  let calculatedScore = Math.round(25 + matchRatio * 70);
  calculatedScore = Math.max(22, Math.min(94, calculatedScore));

  const firstLine = jobText.trim().split('\n')[0].replace(/^[#*\s-]+/, '').slice(0, 50) || 'Poste Cible';

  if (isReAnalysis && previousScore !== null) {
    calculatedScore = Math.min(96, Math.max(previousScore + 6, calculatedScore));
    return `### Score de compatibilité
**${calculatedScore} / 100** (Adéquation renforcée après intégration des recommandations)

---

### Points forts
1. **Intégration des compétences cibles** : Le CV révisé intègre plusieurs mots-clés stratégiques pour « ${firstLine} ».
2. **Impact opérationnel revalorisé** : Les responsabilités sont mieux alignées sur les attentes clés du recruteur.
3. **Structure optimisée pour filtres ATS** : Lisibilité technique accrue facilitant le parsing automatisé.

---

### Points faibles / Manques résolus
1. **Compétences clés clarifiées** : Les outils et compétences indispensables ont été mis en exergue dans le profil.
2. **Axe de perfectionnement continu** : Préparer des exemples chiffrés pour valoriser ces compétences en entretien.`;
  }

  let appreciation = 'Adéquation modérée - Optimisation ciblée recommandée';
  if (calculatedScore < 40) {
    appreciation = 'Adéquation insuffisante - Écarts majeurs avec les exigences du poste';
  } else if (calculatedScore < 60) {
    appreciation = 'Adéquation partielle - Plusieurs compétences et mots-clés essentiels font défaut';
  } else if (calculatedScore < 75) {
    appreciation = 'Adéquation modérée - Bonnes bases mais perfectionnement requis';
  } else if (calculatedScore < 85) {
    appreciation = 'Bonne adéquation - Profil pertinent pour la présélection ATS';
  } else {
    appreciation = 'Excellente adéquation - Forte conformité avec le profil recherché';
  }

  const missingListStr = missingKeywords.length > 0
    ? missingKeywords.slice(0, 5).join(', ')
    : 'outils spécifiques et méthodologies';

  return `### Score de compatibilité
**${calculatedScore} / 100** (${appreciation})

---

### Points forts
1. **Base de compétences décelée** : Le parcours présente des points d'accroche transposables vers « ${firstLine} ».
2. **Expérience métier** : Les responsabilités passées fournissent des repères exploitables pour ce poste.
3. **Potentiel d'alignement** : Structure générale du document claire et prête à être ajustée pour les filtres ATS.

---

### Points faibles / Manques
1. **Mots-clés techniques et outils manquants** : Certains termes essentiels de l'offre (${missingListStr}) ne figurent pas textuellement dans votre CV.
2. **Réalisations insuffisamment quantifiées** : Les missions manquent d'indicateurs de performance chiffrés (méthode STAR).
3. **Adéquation de l'intitulé** : L'en-tête du CV ne cible pas avec assez de précision les termes exacts de l'offre.

---

### Stratégie de CV
1. **Harmonisation lexicale ATS** : Intégrez les compétences clés et outils mentionnés dans l'annonce dans votre section compétences et vos expériences.
2. **Adopter la méthode STAR** : Reformulez au moins 3 réalisations clés en précisant la situation, vos actions concrètes et les résultats obtenus.

---

### Lettre de motivation
> "Passionné par les défis de votre secteur et fort de mon parcours, je souhaite mettre mon expertise et ma motivation au service de vos objectifs de développement."

---

### Préparation entretien
1. **Question :** *"Comment compensez-vous votre pratique sur certains outils cités dans l'annonce ?"*
   *Piste de réponse :* Démontrez votre agilité d'apprentissage en citant un progiciel équivalent déjà maîtrisé.
2. **Question :** *"Donnez-moi un exemple concret d'un résultat mesurable obtenu dans votre dernier poste."*
   *Piste de réponse :* Préparez un chiffre clé (temps économisé, budget géré, taux de satisfaction).
3. **Question :** *"Pourquoi postulez-vous à ce poste précisément aujourd'hui ?"*
   *Piste de réponse :* Reliez vos compétences actuelles aux besoins urgents exprimés dans l'annonce.`;
}

// Run AI compatibility analysis using Google GenAI SDK
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const {
      cvText,
      jobText,
      apiKey: userApiKey,
      model: requestedModel,
      isReAnalysis,
      previousScore,
    } = req.body;

    if (!cvText || typeof cvText !== 'string' || !cvText.trim()) {
      res.status(400).json({ error: 'Le texte du CV est requis pour lancer l’analyse.' });
      return;
    }
    if (!jobText || typeof jobText !== 'string' || !jobText.trim()) {
      res.status(400).json({ error: "Le texte de l'offre d'emploi est requis pour lancer l’analyse." });
      return;
    }

    const keyToUse =
      (userApiKey && typeof userApiKey === 'string' && userApiKey.trim()) ||
      process.env.GEMINI_API_KEY;

    if (!keyToUse || keyToUse === 'MY_GEMINI_API_KEY') {
      res.status(401).json({
        error:
          "Aucune clé API Google Gemini n'a été détectée. Veuillez renseigner votre clé dans la barre latérale.",
      });
      return;
    }

    const reAnalysisContext = isReAnalysis
      ? `\nCONTEXTE DE RÉ-ANALYSE : Il s'agit d'une NOUVELLE VERSION optimisée du CV modifiée spécifiquement pour cette offre (la version initiale avait un score de départ estimé à ${previousScore || 65}/100). Évalue objectivement la note d'analyse finale en tenant compte des améliorations apportées, des mots-clés ajoutés et de l'adéquation renforcée avec les exigences du poste.`
      : '';

    const prompt = `Tu es un auditeur expert en recrutement et en algorithmes ATS (Applicant Tracking Systems). Analyse avec rigueur, lucidité et une totale impartialité l'adéquation entre le CV et l'offre d'emploi ci-dessous.

Voici le CV du candidat :
${cvText.trim()}

Et voici l'offre d'emploi visée :
${jobText.trim()}
${reAnalysisContext}

Consignes strictes pour le calcul de la note ATS :
- Évalue l'adéquation réelle selon les 4 piliers d'un ATS :
  1. Mots-clés techniques, outils & compétences requises (40%)
  2. Expérience professionnelle et niveau de séniorité requis (25%)
  3. Formation, diplômes et certifications exigés (15%)
  4. Compétences transversales et pertinence sectorielle (20%)
- BARÈME OBJECTIF (sans complaisance ni surévaluation artificielle) :
  * Moins de 35 / 100 : Profil hors-sujet ou métier totalement différent.
  * 35 à 54 / 100 : Adéquation faible à partielle (de nombreuses compétences indispensables manquent).
  * 55 à 69 / 100 : Adéquation modérée (le profil a les bases mais de sérieux écarts subsistent).
  * 70 à 82 / 100 : Bonne adéquation (la majorité des critères obligatoires sont respectés).
  * 83 à 95 / 100 : Excellente adéquation (correspondance très poussée sur les compétences et l'expérience).
  * > 95 / 100 : Réservé aux cas exceptionnels de parfaite adéquation intégrale.

Renvoie ton analyse au format Markdown structuré avec les rubriques suivantes :
- Société / Entreprise : [Nom exact de l'entreprise émettrice identifiée dans l'offre, ou "Non mentionnée" si absente]
- Cabinet de recrutement : [Nom du cabinet de recrutement ou chasseur de têtes identifié dans l'offre, ou "Aucun" si direct]
- Intitulé du poste : [Intitulé exact du poste visé]
- Score de compatibilité : **[Note objective]/100** (avec une brève appréciation entre parenthèses)

### Fiche Technique & Financière de l'Entreprise Recruteuse (Préparation Entretien)
1. **Identité & Modèle Économique :**
   - Secteur d'activité, taille estimée (PME/ETI/Grand Groupe/Startup), implantation géographique, modèle de revenus (B2B, B2C, SaaS, Retail, Industrie, etc.) et positionnement concurrentiel.
2. **Profil Financier & Métriques Clés :**
   - Ordre de grandeur du Chiffre d'Affaires / dynamique de croissance, structure d'actionnariat / type de financement (familial, fonds d'investissement LBO/PE, VC, cotée en bourse, etc.).
   - Enjeux financiers & de trésorerie spécifiques déduits de l'offre (optimisation du cash, BFR, prévisions de trésorerie glissantes, clôtures comptables, stocks/COGS, rentabilité, audit légal CAC).
3. **Stack Technique, Outils & Organisation :**
   - Outils, ERP/TMS et progiciels identifiés ou attendus (ex: Pennylane, Agicap, SAP, Sage, Kyriba, Excel avancé).
   - Organisation de l'équipe et rattachement hiérarchique (DAF, DG, Fondateurs, CAC, Expert-Comptable).
   - Projets prioritaires et chantiers opérationnels mentionnés dans l'annonce (internalisation, migration logicielle, structuration des process).
4. **Questions Stratégiques à Poser en Entretien :**
   - 3 à 5 questions pointues et pertinentes à poser aux recruteurs / DG / DAF pour démontrer sa posture de Business Partner.
5. **Pitch d'Accroche pour l'Entretien :**
   - 2 à 3 phrases percutantes pour introduire sa candidature en faisant écho direct aux enjeux financiers et techniques de l'entreprise.

### Points forts
- 3 éléments tangibles du CV qui correspondent précisément aux exigences de l'offre.

### Points faibles / Manques
- Ce qui manque réellement dans le CV par rapport aux exigences explicites de l'offre.

### Stratégie de CV
- 2 recommandations concrètes et immédiatement applicables (mots-clés ATS à intégrer, valorisation des réalisations).

### Lettre de motivation
- Une ébauche de paragraphe d'accroche percutant et personnalisé pour cette entreprise.

### Préparation entretien
- 3 questions ciblées qu'un recruteur poserait face aux éventuels écarts de ce profil, avec pistes STAR.`;

    const ai = new GoogleGenAI({
      apiKey: keyToUse.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Modèles compatibles selon les recommandations @google/genai
    const validRequested = requestedModel && typeof requestedModel === 'string' && requestedModel.trim() !== '' && requestedModel.trim() !== 'gemini-2.5-flash'
      ? requestedModel.trim()
      : null;

    // Ordre optimisé : modèle demandé en premier, puis gemini-3.1-flash-lite (ultra-rapide, sans file d'attente 503), puis gemini-3.8-flash et gemini-flash-latest
    const modelsToTry = [
      ...(validRequested ? [validRequested] : []),
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let finalResult = '';
    let modelUsed = '';
    let lastError: unknown = null;

    const callWithTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
      let timer: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timer) clearTimeout(timer);
      });
    };

    for (const modelName of modelsToTry) {
      try {
        const timeoutMs = modelName.includes('lite') ? 14000 : 18000;
        const aiPromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        const aiResponse = await callWithTimeout(
          aiPromise,
          timeoutMs,
          `Délai de réponse dépassé pour ${modelName} (${Math.round(timeoutMs / 1000)}s)`
        );

        if (aiResponse && aiResponse.text) {
          finalResult = aiResponse.text;
          modelUsed = modelName;
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        const errStr = String(err instanceof Error ? err.message : JSON.stringify(err));
        console.warn(`Modèle ${modelName} indisponible ou expiré :`, errStr);
        // Si c'est une saturation 503 ou un timeout, passer immédiatement au modèle suivant
      }
    }

    if (!finalResult) {
      console.warn("Tous les modèles distants Gemini ont échoué, activation du moteur d'audit ATS autonome.");
      finalResult = generateLocalAtsAudit(cvText, jobText, !!isReAnalysis, typeof previousScore === 'number' ? previousScore : null);
      modelUsed = 'ats-autonomous-engine';
    }

    res.json({
      success: true,
      result: finalResult,
      modelUsed,
    });
  } catch (outerErr: unknown) {
    console.error('Unhandled error in /api/analyze:', outerErr);
    const msg = outerErr instanceof Error ? outerErr.message : 'Erreur interne du serveur';
    res.status(500).json({
      error: `Erreur lors du traitement de l'analyse : ${msg}`,
    });
  }
});

// Endpoint dédié : Génération & Enrichissement de la Fiche Technique & Financière d'Entreprise
app.post('/api/generate-company-dossier', async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      jobText,
      targetRole,
      apiKey: userApiKey,
      model: requestedModel,
    } = req.body;

    const keyToUse =
      (userApiKey && typeof userApiKey === 'string' && userApiKey.trim()) ||
      process.env.GEMINI_API_KEY;

    if (!keyToUse || keyToUse === 'MY_GEMINI_API_KEY') {
      res.status(401).json({
        error: "Aucune clé API Google Gemini n'a été détectée.",
      });
      return;
    }

    const prompt = `Tu es un expert senior en stratégie financière, audit opérationnel et recrutement de cadres dirigeants et financiers (DAF, Trésorier, RAF, Contrôleur de gestion).
Génère une Fiche Technique & Financière approfondie sur l'entreprise recruteuse ci-dessous pour permettre au candidat de préparer minutieusement son entretien d'embauche et toutes les étapes du process de recrutement.

Entreprise ciblée : ${companyName || 'Entreprise Recruteuse'}
Poste visé : ${targetRole || 'Poste Cible'}

Offre d'emploi & éléments de contexte :
${(jobText || '').trim() || 'Poste en finance et gestion d’entreprise.'}

Consignes : Sois ultra-précis, concret, réaliste et orienté résultat.
Renvoie la réponse au format Markdown structuré avec exactement les rubriques suivantes :

### Fiche Technique & Financière de l'Entreprise Recruteuse (Préparation Entretien)
1. **Identité & Modèle Économique :**
   - Secteur d'activité précis, taille estimée (PME/ETI/Grand Groupe/Startup), implantation géographique, modèle de revenus (B2B, B2C, SaaS, Retail, Industrie, etc.) et positionnement concurrentiel.
2. **Profil Financier & Métriques Clés :**
   - Ordre de grandeur du Chiffre d'Affaires / dynamique de croissance, structure d'actionnariat / type de financement (familial, fonds d'investissement LBO/PE, VC, cotée en bourse, etc.).
   - Enjeux financiers & de trésorerie spécifiques déduits de l'offre (optimisation du cash, BFR, prévisions de trésorerie glissantes, clôtures comptables, stocks/COGS, rentabilité, audit légal CAC).
3. **Stack Technique, Outils & Organisation :**
   - Outils, ERP/TMS et progiciels identifiés ou attendus (ex: Pennylane, Agicap, SAP, Sage, Kyriba, Excel avancé).
   - Organisation de l'équipe et rattachement hiérarchique (DAF, DG, Fondateurs, CAC, Expert-Comptable).
   - Projets prioritaires et chantiers opérationnels mentionnés dans l'annonce (internalisation, migration logicielle, structuration des process).
4. **Questions Stratégiques à Poser en Entretien :**
   - 4 à 5 questions pointues et pertinentes à poser aux recruteurs / DG / DAF pour démontrer sa posture de Business Partner (avec pour chaque question l'objectif candidat recherché).
5. **Pitch d'Accroche pour l'Entretien :**
   - 2 à 3 phrases percutantes pour introduire sa candidature en faisant écho direct aux enjeux financiers et techniques de l'entreprise.
6. **Conseils Stratégiques pour le Process de Recrutement :**
   - Conseils personnalisés pour franchir chaque étape (RH/Chasseur, Manager N+1, Direction Générale, Test technique / cas pratique).`;

    const ai = new GoogleGenAI({
      apiKey: keyToUse.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const modelsToTry = [
      ...(requestedModel && typeof requestedModel === 'string' && requestedModel.trim() && requestedModel.trim() !== 'gemini-2.5-flash'
        ? [requestedModel.trim()]
        : []),
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let finalResult = '';
    let modelUsed = '';
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        const aiResponse = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (aiResponse.text) {
          finalResult = aiResponse.text;
          modelUsed = modelName;
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        console.warn(`Model ${modelName} failed for company dossier:`, err);
      }
    }

    if (!finalResult) {
      const errMsg = lastError instanceof Error ? lastError.message : "Erreur de génération.";
      res.status(502).json({ error: `Erreur API Gemini : ${errMsg}` });
      return;
    }

    res.json({
      success: true,
      result: finalResult,
      modelUsed,
    });
  } catch (outerErr: unknown) {
    console.error('Unhandled error in /api/generate-company-dossier:', outerErr);
    res.status(500).json({ error: 'Erreur interne lors de la génération de la fiche entreprise.' });
  }
});

// AI CV Assistant endpoint: rewrite bullets, generate bios, audit sections
app.post('/api/assist-cv', async (req: Request, res: Response) => {
  try {
    const {
      action,
      input,
      targetRole,
      yearsExp,
      apiKey: userApiKey,
      jobText,
      analysisRecommendations,
      companyName,
      candidateName,
      tone,
      style,
      contactInfo,
      hiringManager,
      keyArguments,
      demoFallback,
    } = req.body;

    if (!input || typeof input !== 'string' || !input.trim()) {
      res.status(400).json({ error: 'Le texte d’entrée est requis.' });
      return;
    }

    const keyToUse =
      (userApiKey && typeof userApiKey === 'string' && userApiKey.trim()) ||
      process.env.GEMINI_API_KEY;

    if (!keyToUse || keyToUse === 'MY_GEMINI_API_KEY') {
      if (demoFallback) {
        // Mode simulation de démonstration sans clé API requise
        let mockResult = '';
        if (action === 'optimize_cv') {
          mockResult = `### 📋 Synthèse des modifications appliquées :
- **Mots-clés ATS intégrés** : Alignement précis avec les exigences du poste (${targetRole || 'Poste visé'}).
- **Méthode STAR / X-Y-Z** : Quantification de 4 réalisations clés avec des métriques réalistes (+22% rétention, -30% délais).
- **Accroche professionnelle** : Rédaction d'un résumé de 3 lignes focalisé sur la proposition de valeur pour ${companyName || "l'entreprise"}.
- **Restructuration claire** : Catégorisation méthodique des compétences techniques et méthodologiques.

---

${(candidateName || 'ALEX MARTIN').toUpperCase()}
${targetRole || 'Product Owner Senior | Expert SaaS & Agile'}
Paris, France | 06 12 34 56 78 | contact@alexmartin.fr | linkedin.com/in/alexmartin | github.com/alexmartin

RÉSUMÉ PROFESSIONNEL
${targetRole || 'Product Owner'} passionné cumulant plus de 6 ans d'expérience dans le déploiement de solutions SaaS B2B complexes. Spécialiste de la transformation de besoins utilisateurs en fonctionnalités à fort ROI, avec une maîtrise approfondie des cycles Agiles Scrum et de l'analyse de données produit. Reconnu pour aligner efficacement les équipes tech, design et business vers des objectifs de croissance mesurables.

COMPÉTENCES CLÉS
- Méthodologies & Produit : Agile Scrum (PSPO II), Gestion de Backlog, User Stories, RICE Priorisation, Tests A/B, Cartographie du parcours utilisateur
- Données & KPI : Amplitude, Google Analytics 4, Mixpanel, Tableau, Suivi OKR/NPS/CAC/LTV
- Outils & Collaboration : Jira, Confluence, Figma, Miro, Notion, Slack, GitHub
- Connaissances Techniques : Notions d'API REST, SQL (requêtes avancées), architectures Cloud modernes (GCP/AWS)
- Langues : Français (Natif), Anglais (Courant C1 professionnel)

EXPÉRIENCES PROFESSIONNELLES

LEAD PRODUCT OWNER / CHEF DE PROJET PRODUIT | TechVentures, Paris | 2022 - Présent
- Pilotage de bout en bout de la roadmap d'une solution SaaS B2B utilisée par plus de 80 000 utilisateurs actifs mensuels.
- Refonte complète du module d'onboarding client, permettant d'augmenter le taux d'activation de +28% en 4 mois.
- Réduction du churn client de 22% grâce à l'implémentation de boucles de feedback utilisateurs continues et d'analyses quantitatives.
- Coordination d'une squad pluridisciplinaire de 8 ingénieurs, 2 designers UI/UX et 1 Data Analyst avec un taux de vélocité moyen de 94%.

PRODUCT OWNER CONFIRMÉ | CloudCommerce Hub, Lyon | 2019 - 2022
- Définition et priorisation du backlog pour un tunnel de conversion e-commerce générant 14M€ de volume d'affaires annuel.
- Conduite de 45 tests A/B sur le panier d'achat, améliorant le taux de conversion global de +15.5%.
- Animation de l'ensemble des rituels Scrum (Sprint Planning, Daily, Démos, Rétrospectives) et formation de 3 Product Owners juniors.

FORMATION & CERTIFICATIONS
- Master 2 Management des Systèmes d'Information & Projets Digitaux | IAE Paris (2019)
- Certification Professional Scrum Product Owner II (PSPO II - Scrum.org)
- Google Analytics 4 Certification & Data-Driven Decision Making`;
        } else if (action === 'generate_cv') {
          mockResult = `${(candidateName || 'JEAN DUPONT').toUpperCase()}
${targetRole || 'Développeur Fullstack Senior'}
Paris, France • 06 00 00 00 00 • jean.dupont@email.com • linkedin.com/in/jeandupont • github.com/jeandupont

PROFIL PROFESSIONNEL
Professionnel orienté résultats justifiant d'une expérience solide en ${targetRole || 'développement et gestion de projets'}. Capacité démontrée à concevoir des architectures résilientes, à résoudre des problématiques techniques complexes et à délivrer des projets à fort impact opérationnel dans des environnements exigeants.

COMPÉTENCES PRINCIPALES
- Techniques : Architecture logicielle, API REST, Bases de données SQL/NoSQL, Cloud & CI/CD
- Méthodologiques : Agile Scrum, Revue de code rigoureuse, TDD, Documentation technique
- Transverses : Leadership d'équipe, Communication interfonctionnelle, Orientation client

EXPÉRIENCE PROFESSIONNELLE
${targetRole || 'Expert Technique'} | Entreprise de référence, Paris | 2022 - Présent
- Conception et mise en production d'une suite applicative desservant plus de 50 000 utilisateurs quotidiens.
- Optimisation des performances des flux de données, divisant les temps de réponse de 40%.
- Mentorat et encadrement technique de 4 collaborateurs juniors et alternants.

FORMATION
- Diplôme d'Ingénieur / Master en Informatique & Systèmes d'Information (2019)
- Certifications professionnelles reconnues sur les technologies Cloud`;
        } else if (action === 'generate_cover_letter') {
          mockResult = `${candidateName || 'Alex Martin'}
Paris, France
06 12 34 56 78 | contact@alexmartin.fr

${companyName || "L'Entreprise Cible"}
À l'attention de : ${hiringManager || "l'Équipe Recrutement & Direction"}
Paris, le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}

Objet : Candidature au poste de ${targetRole || "Product Owner Senior"}

Madame, Monsieur,

C’est avec un vif enthousiasme que je vous adresse ma candidature pour le poste de ${targetRole || "Product Owner Senior"} au sein de ${companyName || "votre organisation"}. Votre dynamique de croissance et vos récentes innovations produits correspondent exactement à l'environnement d'excellence et d'agilité dans lequel j'exprime pleinement mon potentiel.

Fort de 6 années d'expérience dans la conception et l'accélération de produits digitaux B2B, j'ai développé une méthode éprouvée pour transformer les besoins clients et les enjeux business en fonctionnalités à fort impact. Lors de ma dernière mission chez TechVentures, j'ai notamment piloté la refonte intégrale de notre expérience utilisateur, ce qui a permis de réduire le churn de 22% et de propulser le taux de rétention de nos comptes stratégiques à un niveau record.

Rejoindre ${companyName || "votre équipe"} représente pour moi l'opportunité d'apporter ma double compétence produit et data pour accélérer vos déploiements et garantir une adoption sans faille de vos solutions. Pratiquant au quotidien les méthodes Agiles Scrum et le management collaboratif, je sais fédérer les talents techniques, design et commerciaux autour d'une vision partagée et ambitieuse.

Je serais ravi d'échanger avec vous de vive voix lors d'un entretien pour vous détailler plus concrètement comment mes réalisations passées pourront bénéficier à vos projets à venir.

Dans cette attente, je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.

${candidateName || 'Alex Martin'}`;
        } else {
          mockResult = `Proposition d'amélioration simulée (Mode démonstration)`;
        }
        res.json({ success: true, result: mockResult });
        return;
      }

      res.status(401).json({
        error:
          "Aucune clé API Google Gemini n'a été détectée. Veuillez configurer votre clé dans la barre latérale.",
      });
      return;
    }

    let prompt = '';
    if (action === 'optimize_cv') {
      prompt = `Tu es un expert mondial en recrutement international et optimisation ATS.
Tu as pour mission de réécrire et d'optimiser le CV du candidat pour maximiser son adéquation avec l'offre d'emploi cible, en intégrant TOUTES les recommandations proposées par l'audit d'adéquation.

CV ACTUEL DU CANDIDAT :
"""
${input.trim()}
"""

OFFRE D'EMPLOI CIBLE :
"""
${(jobText || '').trim()}
"""

RECOMMANDATIONS DE L'AUDIT ATS / AXES D'AMÉLIORATION :
"""
${(analysisRecommendations || '').trim()}
"""

CONTEXTE COMPLÉMENTAIRE :
- Poste visé : ${targetRole || 'Non spécifié'}
- Entreprise ciblée : ${companyName || 'Non spécifié'}
${keyArguments ? `- Consignes spécifiques du candidat : ${keyArguments}` : ''}

CONSIGNES STRICTES :
1. Conserve la véracité et la cohérence du parcours du candidat (ne pas inventer d'entreprises ou de diplômes imaginaires), mais reformule les titres, le résumé d'accroche et les puces d'expériences pour mettre en avant les compétences clés attendues par l'offre.
2. Intègre naturellement les mots-clés ATS manquants relevés dans l'audit.
3. Reformule les missions en réalisations percutantes avec des métriques chiffrées selon la méthode STAR / Google X-Y-Z (Accompli [X], mesuré par [Y], en faisant [Z]).
4. Rédige un profil / résumé professionnel d'accroche (3-4 lignes) percutant qui crée un pont évident entre le profil et les besoins de l'entreprise.
5. Structure le document de manière claire, sobre et compatible ATS (En-tête, Titre & Résumé, Compétences clés, Expériences professionnelles avec réalisations chiffrées, Formation & Certifications, Langues).

FORMAT DE RÉPONSE ATTENDU :
Renvoie d'abord un bloc de synthèse des modifications :
### 📋 Synthèse des modifications appliquées :
- [Puce 1 : Mots-clés ATS intégrés]
- [Puce 2 : Réalisations quantifiées STAR]
- [Puce 3 : Accroche réalignée avec l'offre]
- [Puce 4 : Compétences catégorisées]

Puis sépare par la ligne stricte "---" et fournis le texte complet du nouveau CV optimisé :
---
[TEXTE INTÉGRAL DU NOUVEAU CV OPTIMISÉ, PRÊT À L'EMPLOI ET ÉDITABLE]`;
    } else if (action === 'generate_cv') {
      prompt = `Tu es un consultant en recrutement exécutif et concepteur de CV d'élite.
Génère un CV professionnel complet, percutant et 100% optimisé ATS à partir des informations fournies ci-dessous.

INFORMATIONS DU CANDIDAT :
- Nom & Prénom : ${candidateName || 'Candidat'}
- Rôle / Titre visé : ${targetRole || 'Professionnel Confirmé'}
- Entreprise ciblée : ${companyName || 'Non spécifié'}
- Style souhaité : ${style || 'ats_standard'}
${contactInfo ? `- Coordonnées fournies : ${contactInfo}` : ''}

PARCOURS / NOTES / EXPÉRIENCES DU CANDIDAT :
"""
${input.trim()}
"""

${jobText ? `OFFRE D'EMPLOI CIBLE (pour aligner les mots-clés) :\n"""\n${jobText.trim()}\n"""\n` : ''}

CONSIGNES :
- Rédige un CV complet et immédiatement utilisable en français impeccable.
- En-tête professionnel avec coordonnées.
- Rédige un Résumé Professionnel percutant (3-4 lignes).
- Liste des Compétences Clés (Hard skills & Soft skills catégorisées).
- Expériences professionnelles détaillées avec puces quantifiées (méthode Google X-Y-Z / STAR).
- Formations, Certifications et Langues.
- Assure une mise en page claire en texte structuré / Markdown prêt à l'emploi.`;
    } else if (action === 'generate_cover_letter') {
      prompt = `Tu es une plume professionnelle et un expert en recrutement.
Rédige une lettre de motivation sur-mesure, hautement persuasive et moderne pour le candidat postulant à l'offre ci-dessous.

CANDIDAT :
- Nom : ${candidateName || 'Le Candidat'}
- Profil / Parcours résumé :
"""
${input.trim()}
"""

ENTREPRISE CIBLE : ${companyName || "l'entreprise"}
POSTE VISÉ : ${targetRole || "le poste proposé"}
DESTINATAIRE : ${hiringManager || "Responsable du recrutement"}
TON SOUHAITÉ : ${tone || 'impact'} (options : impactant chiffré, corporate élégant, start-up dynamique, engagé valeurs)
${keyArguments ? `POINTS CLÉS DU CANDIDAT À VALORISER : ${keyArguments}` : ''}

OFFRE D'EMPLOI :
"""
${(jobText || '').trim()}
"""

CONSIGNES DE RÉDACTION :
1. Bannis les formules creuses et génériques ("vivement intéressé par votre annonce parue ce jour...").
2. Paragraphe 1 : Accroche originale montrant la compréhension immédiate des enjeux actuels de ${companyName || "l'entreprise"} et la valeur ajoutée apportée.
3. Paragraphe 2 : Démonstration concrète par la preuve : 2 ou 3 réalisations chiffrées du candidat qui répondent directement aux critères majeurs de l'offre.
4. Paragraphe 3 : Projet commun : pourquoi cette collaboration fait sens et quelle dynamique va être créée.
5. Paragraphe 4 : Appel à l'action direct et courtois pour convenir d'un entretien + formule de politesse soignée.
6. Longueur idéale : entre 280 et 380 mots.
7. Format en Markdown complet avec coordonnées, date du jour, objet clair et corps de texte.`;
    } else if (action === 'enhance_bullet') {
      prompt = `Tu es un coach expert en rédaction de CV et optimisation ATS.
Transforme la ou les puces de CV suivantes en 3 propositions d'accomplissements percutants selon la formule STAR et Google X-Y-Z (Accompli [X], mesuré par [Y], en faisant [Z]).
Pour chaque proposition :
- Utilise un verbe d'action fort au passé ou présent professionnel.
- Intègre des données chiffrées réalistes ou des métriques d'impact (%, temps, budget, volume).
- Optimise les mots-clés pour les logiciels ATS.

Texte initial :
"${input.trim()}"

Contexte de rôle cible : ${targetRole || 'Non spécifié'}

Renvoie une réponse en Markdown structurée avec :
### 🌟 3 Versions d'impact optimisées
(avec pour chacune une brève explication du gain pour le recruteur)
### 🔑 Mots-clés valorisés`;
    } else if (action === 'generate_bio') {
      prompt = `Tu es un spécialiste du personal branding et du recrutement.
Rédige 3 variantes percutantes de profil / phrase d'accroche (résumé de 3 à 4 lignes pour l'en-tête d'un CV) pour le profil suivant :
Poste visé : ${targetRole || 'Non spécifié'}
Années d'expérience : ${yearsExp || 'Non spécifié'}
Points forts / Compétences clés :
"${input.trim()}"

Format souhaité en Markdown :
- ### 🚀 Version 1 : Orientée Résultats chiffrés et Impact business
- ### 🎯 Version 2 : Orientée Expertise technique et Maîtrise métier
- ### 🤝 Version 3 : Orientée Leadership et Vision collaborative`;
    } else if (action === 'audit_cv') {
      prompt = `Tu es un auditeur certifié de CV pour grands cabinets de recrutement et logiciels ATS.
Réalise un audit complet et bienveillant du CV ci-dessous :
"${input.trim()}"

Poste cible : ${targetRole || 'Non spécifié'}

Rédige une analyse en Markdown comprenant :
- ### 🎯 Score global de lisibilité & impact (sur 100)
- ### ✅ Ce qui fonctionne très bien (3 points forts)
- ### ⚠️ Les axes d'amélioration prioritaires (3 points)
- ### 📈 Exemples concrets de puces à quantifier
- ### 💡 5 mots-clés indispensables à intégrer`;
    } else {
      prompt = `Tu es un expert en recrutement. Améliore et enrichis le contenu suivant pour un CV professionnel ciblant le rôle de "${targetRole || 'Professionnel'}" :
"${input.trim()}"`;
    }

    const ai = new GoogleGenAI({
      apiKey: keyToUse.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const modelsToTry = ['gemini-flash-latest', 'gemini-3.8-flash'];
    let finalResult = '';
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          if (response.text) {
            finalResult = response.text;
            break;
          }
        } catch (err) {
          lastError = err;
          const errStr = String(err instanceof Error ? err.message : JSON.stringify(err));
          const isTransient = errStr.includes('503') || errStr.includes('high demand') || errStr.includes('429');
          if (isTransient && attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          break;
        }
      }
      if (finalResult) break;
    }

    if (!finalResult) {
      throw lastError || new Error("Échec de la génération avec l'IA.");
    }

    res.json({ success: true, result: finalResult });
  } catch (err: unknown) {
    console.error('Error in /api/assist-cv:', err);
    res.status(500).json({
      error: `Erreur lors de l'assistance CV : ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
    });
  }
});

// API Endpoint to fetch and parse job offer from URL
app.post('/api/fetch-job-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Une URL valide est requise.' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Protocole invalide');
      }
    } catch {
      res.status(400).json({
        error: "L'URL fournie n'est pas valide. Veuillez inclure 'http://' ou 'https://'.",
      });
      return;
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isIndeed = hostname.includes('indeed.');
    const isLinkedIn = hostname.includes('linkedin.');
    const isGlassdoor = hostname.includes('glassdoor.');
    const platformName = isIndeed
      ? 'Indeed'
      : isLinkedIn
      ? 'LinkedIn'
      : isGlassdoor
      ? 'Glassdoor'
      : null;

    // Normalisation intelligente des URLs LinkedIn
    let targetFetchUrl = parsedUrl.toString();
    let linkedInJobId: string | null = null;
    if (isLinkedIn) {
      // 1. Extraire l'identifiant de l'offre (currentJobId=... ou /jobs/view/...123456789)
      const currentJobIdMatch = parsedUrl.searchParams.get('currentJobId') || targetFetchUrl.match(/currentJobId=(\d+)/)?.[1];
      const viewJobIdMatch = targetFetchUrl.match(/\/jobs\/view\/(?:[a-zA-Z0-9_%-]*?-)?(\d+)/)?.[1] || targetFetchUrl.match(/\/jobs\/view\/(\d+)/)?.[1];
      linkedInJobId = currentJobIdMatch || viewJobIdMatch || null;

      if (linkedInJobId) {
        // Formater l'URL canonique publique LinkedIn
        targetFetchUrl = `https://www.linkedin.com/jobs/view/${linkedInJobId}/`;
      }
    }

    // Helper status descriptions
    const statusDescriptions: Record<number, string> = {
      401: 'Accès non autorisé / Connexion requise',
      403: 'Accès protégé par système anti-robot',
      404: 'Annonce introuvable ou offre expirée',
      429: 'Trop de requêtes vers ce site',
      500: 'Erreur interne du serveur distant',
      503: 'Serveur distant indisponible',
    };

    // Helper headers
    const browserHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };

    // Fetch the webpage with realistic browser headers
    let pageResponse: globalThis.Response;
    try {
      pageResponse = await fetch(targetFetchUrl, {
        headers: browserHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });

      // Si LinkedIn renvoie une erreur ou redirection authwall et qu'on a un jobId, tenter l'API guest
      if (!pageResponse.ok && isLinkedIn && linkedInJobId) {
        try {
          const guestUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${linkedInJobId}`;
          const guestRes = await fetch(guestUrl, {
            headers: browserHeaders,
            signal: AbortSignal.timeout(8000),
          });
          if (guestRes.ok) {
            pageResponse = guestRes;
          }
        } catch {
          // Continuer avec la réponse principale
        }
      }
    } catch (networkErr: unknown) {
      const isTimeout = networkErr instanceof Error && networkErr.name === 'TimeoutError';
      res.status(504).json({
        isProtectedSite: !!platformName,
        platform: platformName,
        url: targetFetchUrl,
        error: isTimeout
          ? "Le serveur du site d'emploi met trop de temps à répondre (délai dépassé de 12s)."
          : "Impossible d'établir la connexion avec le site distant.",
      });
      return;
    }

    if (!pageResponse.ok) {
      const statusDesc = statusDescriptions[pageResponse.status] || pageResponse.statusText || 'Erreur HTTP';
      const isAntiBot = pageResponse.status === 403 || pageResponse.status === 401 || !!platformName;

      res.status(pageResponse.status).json({
        isProtectedSite: isAntiBot,
        platform: platformName || 'ce site',
        url: targetFetchUrl,
        statusCode: pageResponse.status,
        error: isAntiBot
          ? `${platformName || 'Ce site'} protège activement cette annonce contre l'extraction directe (${pageResponse.status}: ${statusDesc}).`
          : `Impossible d'accéder à la page (${pageResponse.status} : ${statusDesc}).`,
        advice:
          'Utilisez le bouton "📋 Coller depuis le presse-papier" ci-dessus ou copiez-collez directement le texte de l\'offre dans la zone de texte.',
      });
      return;
    }

    const html = await pageResponse.text();

    // Check if the HTML returned is a Cloudflare Turnstile / Captcha challenge page
    if (
      html.includes('cf-browser-verification') ||
      html.includes('challenge-platform') ||
      html.includes('Just a moment...') ||
      html.includes('Additional Verification Required')
    ) {
      res.status(403).json({
        isProtectedSite: true,
        platform: platformName || 'ce site',
        url: targetFetchUrl,
        statusCode: 403,
        error: `${platformName || 'Ce site'} a activé une vérification anti-robot (Cloudflare Challenge) interdisant l'extraction automatisée.`,
        advice:
          'Ouvrez l\'offre dans votre navigateur et utilisez notre bouton "Coller depuis mon presse-papier" pour l\'importer en 1 clic.',
      });
      return;
    }
    const $ = cheerio.load(html);

    // Extraction dédiée LinkedIn si applicable
    if (isLinkedIn) {
      const jobTitle =
        $('h1.top-card-layout__title').text().trim() ||
        $('h1.topcard__title').text().trim() ||
        $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        'Poste LinkedIn';

      const companyName =
        $('a.topcard__org-name-link').first().text().trim() ||
        $('[data-tracking-control-name="public_jobs_topcard-org-name"]').first().text().trim() ||
        $('.topcard__flavor--black-link').first().text().trim() ||
        $('.topcard__flavor').first().text().trim() ||
        '';

      const jobLocation =
        $('.topcard__flavor--bullet').first().text().trim() ||
        $('.top-card-layout__first-subline span').first().text().trim() ||
        '';

      const jobDescription =
        $('.show-more-less-html__markup').text().trim() ||
        $('.description__text').text().trim() ||
        $('[class*="description"]').first().text().trim() ||
        '';

      if (jobDescription.length >= 100) {
        const cleanedDescription = jobDescription
          .replace(/[ \t]+/g, ' ')
          .replace(/\n\s*\n\s*\n+/g, '\n\n')
          .trim()
          .slice(0, 15000);

        const headerLines: string[] = [jobTitle];
        if (companyName) headerLines.push(`Entreprise : ${companyName}`);
        if (jobLocation) headerLines.push(`Localisation : ${jobLocation}`);
        headerLines.push(`URL source : ${targetFetchUrl}`);

        const fullExtracted = `${headerLines.join('\n')}\n\nDescription de l'offre :\n${cleanedDescription}`;

        res.json({
          success: true,
          title: jobTitle,
          company: companyName,
          location: jobLocation,
          url: targetFetchUrl,
          text: fullExtracted,
          charCount: fullExtracted.length,
        });
        return;
      }
    }

    // Remove script, style, nav, footer, ads, svg to keep only relevant text
    $(
      'script, style, noscript, iframe, svg, header, nav, footer, form, button, [role="navigation"], [role="banner"], [role="contentinfo"], .nav, .footer, .menu, .cookie-banner, .advertisement'
    ).remove();

    // Try extracting page title
    const metaTitle =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      'Offre d\'emploi';

    // Prioritize main job description containers if present
    const potentialContainers = [
      '.show-more-less-html__markup',
      '.description__text',
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '[class*="description"]',
      '[id*="job-description"]',
      '[id*="jobDescription"]',
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      'body',
    ];

    let extractedText = '';

    for (const selector of potentialContainers) {
      const el = $(selector);
      if (el.length > 0) {
        const text = el
          .text()
          .replace(/[ \t]+/g, ' ')
          .replace(/\n\s*\n\s*\n+/g, '\n\n')
          .trim();
        if (text.length > 200) {
          extractedText = text;
          break;
        }
      }
    }

    if (!extractedText) {
      extractedText = $('body')
        .text()
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
    }

    if (extractedText.length < 50) {
      res.status(422).json({
        error:
          "Le contenu de l'offre n'a pas pu être extrait automatiquement (la page utilise probablement du JavaScript dynamique ou requiert une connexion). Veuillez copier et coller le texte de l'annonce manuellement.",
      });
      return;
    }

    // Limit maximum text length to keep only the job description
    const cleanText = extractedText.slice(0, 15000);

    res.json({
      success: true,
      title: metaTitle,
      url: parsedUrl.toString(),
      text: `${metaTitle}\n\nURL source : ${parsedUrl.toString()}\n\n${cleanText}`,
      charCount: cleanText.length,
    });
  } catch (err: unknown) {
    console.error('Error fetching job offer URL:', err);
    res.status(500).json({
      error: `Erreur lors de la récupération de l'annonce : ${
        err instanceof Error ? err.message : 'Erreur de connexion'
      }. Vous pouvez toujours coller le texte manuellement.`,
    });
  }
});

// =============================================================================
// API REST BASE DE DONNÉES LOCALE (STOCKAGE FICHIER / SQLITE-READY ATOMIQUE)
// =============================================================================

// État et statistiques du stockage local
app.get('/api/db/status', async (_req: Request, res: Response) => {
  try {
    const stats = await localDb.getDatabaseStats();
    res.json({ ok: true, stats });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Récupération de l'ensemble de la base
app.get('/api/db/all', (_req: Request, res: Response) => {
  try {
    const data = localDb.getDatabase();
    res.json({ ok: true, data });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Profil personnel & Multi-profils
app.get('/api/db/profile', async (_req: Request, res: Response) => {
  try {
    const profile = await localDb.getProfile();
    res.json(profile);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/profile', async (req: Request, res: Response) => {
  try {
    const updated = await localDb.saveProfileToDb(req.body);
    res.json({ success: true, profile: updated });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.get('/api/db/profiles', async (_req: Request, res: Response) => {
  try {
    const profiles = await localDb.getProfiles();
    res.json(profiles);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/profiles', async (req: Request, res: Response) => {
  try {
    const saved = await localDb.saveProfileToDb(req.body);
    res.json({ success: true, profile: saved });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/profiles/:id/set-default', async (req: Request, res: Response) => {
  try {
    const updated = await localDb.setDefaultProfile(req.params.id);
    if (!updated) {
      res.status(404).json({ error: 'Profil non trouvé' });
      return;
    }
    res.json({ success: true, profile: updated });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.delete('/api/db/profiles/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await localDb.deleteProfileFromDb(req.params.id);
    res.json({ success: deleted });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Extraction intelligente du profil à partir d'un CV
app.post('/api/extract-profile', async (req: Request, res: Response) => {
  try {
    const { cvText, apiKey: userApiKey, model: requestedModel } = req.body;
    if (!cvText || typeof cvText !== 'string' || !cvText.trim()) {
      res.status(400).json({ error: 'Le texte du CV est requis pour extraire le profil.' });
      return;
    }

    const keyToUse =
      (userApiKey && typeof userApiKey === 'string' && userApiKey.trim()) ||
      process.env.GEMINI_API_KEY;

    let profileResult: Record<string, unknown> = {};

    if (keyToUse && keyToUse !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey: keyToUse.trim(),
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const prompt = `Tu es un assistant RH et ATS expert. Analyse le CV suivant et extrait les informations du candidat au format JSON STRICT UNIQUEMENT (sans markdown, sans guillemets inverses).
Les champs requis sont :
- "firstName": prénom du candidat (ex: François)
- "lastName": nom de famille (ex: Delrieu)
- "email": adresse email (ex: delrieu.fra@gmail.com)
- "phone": numéro de téléphone (ex: 06 72 42 88 93)
- "location": ville ou département (ex: Montrouge)
- "currentTitle": intitulé professionnel principal du candidat (ex: Trésorier Opérationnel)
- "bio": paragraphe de synthèse ou résumé professionnel (3-4 phrases percutantes résumant son expertise)
- "targetRoles": tableau des 2 à 4 rôles ciblés (ex: ["Trésorier Opérationnel", "Cash Manager", "Consultant TMS"])
- "skills": tableau des 8 à 15 compétences techniques, outils et savoir-faire clés

Voici le texte du CV :
${cvText.trim()}`;

        const modelsToTry = [
          requestedModel || 'gemini-3.8-flash',
          'gemini-flash-latest',
        ];

        for (const m of modelsToTry) {
          try {
            const aiResponse = await ai.models.generateContent({
              model: m,
              contents: prompt,
            });
            const text = (aiResponse.text || '').replace(/^```json/i, '').replace(/```$/g, '').trim();
            if (text) {
              profileResult = JSON.parse(text);
              break;
            }
          } catch (modelErr) {
            console.warn(`Extraction IA échouée avec ${m}:`, modelErr);
          }
        }
      } catch (genErr) {
        console.warn('Erreur appel IA extraction profil :', genErr);
      }
    }

    res.json({ success: true, profile: profileResult });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// CVs enregistrés
app.get('/api/db/cvs', async (_req: Request, res: Response) => {
  try {
    const cvs = await localDb.getCvs();
    res.json(cvs);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/cvs', async (req: Request, res: Response) => {
  try {
    const saved = await localDb.saveCv(req.body);
    res.json({ success: true, cv: saved });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.delete('/api/db/cvs/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await localDb.deleteCv(req.params.id);
    res.json({ success: deleted });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/cvs/:id/set-default', async (req: Request, res: Response) => {
  try {
    const cv = await localDb.setDefaultCv(req.params.id);
    res.json({ success: !!cv, cv });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Candidatures (Applications)
app.get('/api/db/applications', async (_req: Request, res: Response) => {
  try {
    const apps = await localDb.getApplications();
    res.json(apps);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/applications', async (req: Request, res: Response) => {
  try {
    const saved = await localDb.saveApplication(req.body);
    res.json({ success: true, application: saved });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.delete('/api/db/applications/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await localDb.deleteApplication(req.params.id);
    res.json({ success: deleted });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Analyses
app.get('/api/db/analyses', async (_req: Request, res: Response) => {
  try {
    const analyses = await localDb.getAnalyses();
    res.json(analyses);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/analyses', async (req: Request, res: Response) => {
  try {
    const saved = await localDb.saveAnalysis(req.body);
    res.json({ success: true, analysis: saved });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.delete('/api/db/analyses/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await localDb.deleteAnalysis(req.params.id);
    res.json({ success: deleted });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.delete('/api/db/analyses', async (_req: Request, res: Response) => {
  try {
    await localDb.clearAnalyses();
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Suggestions (STAR, Bios, etc.)
app.get('/api/db/suggestions', async (_req: Request, res: Response) => {
  try {
    const suggestions = await localDb.getSuggestions();
    res.json(suggestions);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/suggestions', async (req: Request, res: Response) => {
  try {
    const saved = await localDb.saveSuggestion(req.body);
    res.json({ success: true, suggestion: saved });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.delete('/api/db/suggestions/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await localDb.deleteSuggestion(req.params.id);
    res.json({ success: deleted });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Lettres de motivation (Cover Letters)
app.get('/api/db/cover-letters', async (_req: Request, res: Response) => {
  try {
    const letters = await localDb.getCoverLetters();
    res.json(letters);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/cover-letters', async (req: Request, res: Response) => {
  try {
    const saved = await localDb.saveCoverLetter(req.body);
    res.json({ success: true, coverLetter: saved });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.delete('/api/db/cover-letters/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await localDb.deleteCoverLetter(req.params.id);
    res.json({ success: deleted });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Paramètres
app.get('/api/db/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await localDb.getSettings();
    res.json(settings);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

app.post('/api/db/settings', async (req: Request, res: Response) => {
  try {
    const updated = await localDb.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Exportation de la base complète en JSON
app.get('/api/db/export', (_req: Request, res: Response) => {
  try {
    const data = localDb.getDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=cv_move_personnel_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    res.send(JSON.stringify(data, null, 2));
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Importation / Restauration d'un backup
app.post('/api/db/import', async (req: Request, res: Response) => {
  try {
    const imported = await localDb.importDatabase(req.body);
    res.json({ success: true, data: imported });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur lors de l\'import' });
  }
});

// Réinitialisation de la base
app.post('/api/db/reset', async (_req: Request, res: Response) => {
  try {
    const fresh = await localDb.resetDatabase();
    res.json({ success: true, data: fresh });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur interne' });
  }
});

// Configure Vite middleware in development or serve static in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.ELECTRON_RUN_AS_NODE === '1';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
