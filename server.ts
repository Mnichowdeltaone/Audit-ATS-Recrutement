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

    const prompt = `Tu es un expert en recrutement et en systèmes de suivi des candidatures (ATS). Voici le CV du candidat :
${cvText.trim()}

Et voici l'offre d'emploi visée :
${jobText.trim()}
${reAnalysisContext}

Fais une analyse détaillée et renvoie la réponse au format Markdown structuré avec les éléments suivants :
- Société / Entreprise : [Nom exact de l'entreprise émettrice identifiée dans l'offre, ou "Non mentionnée" si absente]
- Cabinet de recrutement : [Nom du cabinet de recrutement ou chasseur de têtes identifié dans l'offre, ou "Aucun" si direct]
- Intitulé du poste : [Intitulé exact du poste visé]
- Score de compatibilité : Une note sur 100 globale (ex: **88 / 100** ou **92 / 100**).
- Points forts : 3 éléments du CV qui correspondent parfaitement à l'offre.
- Points faibles / Manques : Ce qui reste perfectible par rapport à l'offre.
- Stratégie de CV : 2 conseils pratiques sur les mots-clés ou l'impact opérationnel.
- Lettre de motivation : Une ébauche de paragraphe d'accroche ultra-personnalisé pour l'entreprise.
- Préparation entretien : 3 questions qu'un recruteur pourrait poser, avec des pistes de réponse selon la méthode STAR.`;

    const ai = new GoogleGenAI({
      apiKey: keyToUse.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Models priority cascade: start with requested model if valid, then gemini-flash-latest, fallback to gemini-3.8-flash
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
      for (let attempt = 0; attempt < 2; attempt++) {
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
          const errStr = String(err instanceof Error ? err.message : JSON.stringify(err));
          const isTransient = errStr.includes('503') || errStr.includes('high demand') || errStr.includes('429');
          if (isTransient && attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          console.warn(`Model ${modelName} failed, trying next fallback:`, errStr);
          break;
        }
      }
      if (finalResult) break;
    }

    if (!finalResult) {
      const errMsg =
        lastError instanceof Error
          ? lastError.message
          : "L'API Gemini n'a pas pu générer de réponse.";
      res.status(502).json({
        error: `Erreur API Gemini : ${errMsg}`,
      });
      return;
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

    // Helper status descriptions
    const statusDescriptions: Record<number, string> = {
      401: 'Accès non autorisé / Connexion requise',
      403: 'Accès protégé par système anti-robot (Cloudflare WAF)',
      404: 'Annonce introuvable ou offre expirée',
      429: 'Trop de requêtes vers ce site',
      500: 'Erreur interne du serveur distant',
      503: 'Serveur distant indisponible',
    };

    // Fetch the webpage with realistic browser headers
    let pageResponse: globalThis.Response;
    try {
      pageResponse = await fetch(parsedUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
    } catch (networkErr: unknown) {
      const isTimeout = networkErr instanceof Error && networkErr.name === 'TimeoutError';
      res.status(504).json({
        isProtectedSite: !!platformName,
        platform: platformName,
        url: parsedUrl.toString(),
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
        url: parsedUrl.toString(),
        statusCode: pageResponse.status,
        error: isAntiBot
          ? `${platformName || 'Ce site'} protège activement ses annonces avec une sécurité anti-robot (${pageResponse.status}: ${statusDesc}). Le serveur ne peut pas lire la page directement.`
          : `Impossible d'accéder à la page (${pageResponse.status} : ${statusDesc}).`,
        advice:
          'Utilisez le bouton "Coller depuis le presse-papier" ou copiez-collez le texte de l\'offre directement dans la zone de texte.',
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
        url: parsedUrl.toString(),
        statusCode: 403,
        error: `${platformName || 'Ce site'} a activé une vérification anti-robot (Cloudflare Challenge) interdisant l'extraction automatisée.`,
        advice:
          'Ouvrez l\'offre dans votre navigateur et utilisez notre bouton "Coller depuis mon presse-papier" pour l\'importer en 1 clic.',
      });
      return;
    }
    const $ = cheerio.load(html);

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
