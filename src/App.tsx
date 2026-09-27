import React, { useState, useEffect, useId, useRef } from 'react';
import {
  FileText,
  Briefcase,
  Key,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Copy,
  Check,
  Download,
  Code2,
  Terminal,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  HelpCircle,
  BookOpen,
  Award,
  Target,
  ShieldAlert,
  Lightbulb,
  MessageSquareQuote,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RotateCcw,
  Layers,
  FileCode,
  Upload,
  History,
  Trash2,
  Clock,
  Search,
  FileUp,
  FileCheck,
  Info,
  Calendar,
  Filter,
  CheckSquare,
  Link as LinkIcon,
  Globe,
  ArrowRight,
  Database,
  Lock,
  Save,
  Sliders,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Mail,
  Zap,
} from 'lucide-react';
import { marked } from 'marked';
import confetti from 'canvas-confetti';
import { parseCvFile, ExtractedFileResult } from './utils/fileExtractor';
import ApplicationTracker, { INITIAL_SAMPLE_APPLICATIONS } from './components/ApplicationTracker';
import CvAssistant from './components/CvAssistant';
import DatabaseManager from './components/DatabaseManager';
import CvOptimizationModal from './components/CvOptimizationModal';
import SettingsAndProfile from './components/SettingsAndProfile';
import Sidebar, { SamplePreset } from './components/Sidebar';
import { localDbClient } from './services/localDbClient';
import { ApplicationItem, SavedCv, DatabaseStats, UserProfile } from './types';

// Code Python à jour pour l'onglet de téléchargement et consultation
const PYTHON_APP_CODE = `import io
import re
import datetime
import streamlit as st
import google.generativeai as genai

# Bibliothèques pour l'extraction de texte depuis PDF et Word DOCX
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import docx
except ImportError:
    docx = None

# Bibliothèques pour la récupération d'annonces web via URL
try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    requests = None
    BeautifulSoup = None

# ==============================================================================
# Configuration de la page Streamlit
# ==============================================================================
st.set_page_config(
    page_title="CV Move Personnel",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ==============================================================================
# Initialisation de l'état de session (Historique des analyses)
# ==============================================================================
if "analysis_history" not in st.session_state:
    st.session_state["analysis_history"] = []

if "loaded_cv_text" not in st.session_state:
    st.session_state["loaded_cv_text"] = ""

if "loaded_job_text" not in st.session_state:
    st.session_state["loaded_job_text"] = ""

if "loaded_job_url" not in st.session_state:
    st.session_state["loaded_job_url"] = ""

if "current_result" not in st.session_state:
    st.session_state["current_result"] = None

# ==============================================================================
# Fonctions d'extraction de texte (PDF / DOCX / TXT)
# ==============================================================================
def extraire_texte_fichier(uploaded_file) -> str:
    file_name = uploaded_file.name.lower()
    if file_name.endswith(".pdf"):
        if PdfReader is None:
            raise ImportError("Le module 'pypdf' n'est pas installé. Lancez 'pip install pypdf'.")
        pdf_reader = PdfReader(io.BytesIO(uploaded_file.read()))
        texte_pages = [page.extract_text().strip() for page in pdf_reader.pages if page.extract_text()]
        texte_complet = "\\n\\n".join(texte_pages)
        if not texte_complet.strip():
            raise ValueError("Aucun texte sélectionnable dans ce PDF (scan image non ocrisé).")
        return texte_complet

    elif file_name.endswith(".docx"):
        if docx is None:
            raise ImportError("Le module 'python-docx' n'est pas installé. Lancez 'pip install python-docx'.")
        doc = docx.Document(io.BytesIO(uploaded_file.read()))
        texte_paragraphes = [p.text for p in doc.paragraphs if p.text.strip()]
        texte_complet = "\\n".join(texte_paragraphes)
        if not texte_complet.strip():
            raise ValueError("Le document Word DOCX est vide.")
        return texte_complet

    elif file_name.endswith(".txt"):
        return uploaded_file.read().decode("utf-8", errors="replace")

    else:
        raise ValueError(f"Format non supporté ('{uploaded_file.name}'). Utilisez .pdf, .docx ou .txt.")

# ==============================================================================
# Fonction d'extraction d'une annonce depuis une URL
# ==============================================================================
def recuperer_texte_depuis_url(url: str) -> tuple[str, str]:
    if not requests or not BeautifulSoup:
        raise ImportError("Installez 'requests' et 'beautifulsoup4' : pip install requests beautifulsoup4")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    response = requests.get(url.strip(), headers=headers, timeout=12)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for el in soup(["script", "style", "noscript", "svg", "header", "nav", "footer", "form", "button"]):
        el.decompose()

    meta_og = soup.find("meta", property="og:title")
    titre = meta_og["content"].strip() if meta_og and meta_og.get("content") else (soup.title.get_text(strip=True) if soup.title else "Offre d'emploi")

    conteneur = soup.find(attrs={"class": re.compile(r"job[-_]?desc|description", re.I)}) or soup.find("main") or soup.find("article") or soup.body
    texte = conteneur.get_text(separator="\\n", strip=True) if conteneur else ""
    texte_propre = re.sub(r"\\n{3,}", "\\n\\n", texte).strip()

    if len(texte_propre) < 80:
        raise ValueError("Impossible d'extraire automatiquement le contenu. Veuillez copier le texte manuellement.")

    return titre, texte_propre[:15000]

# ==============================================================================
# Barre Latérale (Sidebar)
# ==============================================================================
with st.sidebar:
    st.header("⚙️ Configuration API")
    api_key = st.text_input("Clé API Google :", type="password", placeholder="AIzaSy...")

    if not api_key:
        st.warning("⚠️ L'application ne peut pas fonctionner sans cette clé API.")
    else:
        st.success("✅ Clé API renseignée.")

    st.markdown("---")
    st.header("📚 Historique des Analyses")
    if not st.session_state["analysis_history"]:
        st.info("Aucune analyse enregistrée pour le moment.")
    else:
        options = [f"#{item['id']} - {item['titre']} ({item['date']})" for item in st.session_state["analysis_history"]]
        choix = st.selectbox("Consulter une analyse passée :", options=options)
        if choix:
            idx = options.index(choix)
            item = st.session_state["analysis_history"][idx]
            col1, col2 = st.columns(2)
            if col1.button("👁️ Recharger"):
                st.session_state["loaded_cv_text"] = item["cv"]
                st.session_state["loaded_job_text"] = item["job"]
                st.session_state["loaded_job_url"] = item.get("job_url", "")
                st.session_state["current_result"] = item["result"]
                st.rerun()
            if col2.button("🗑️ Supprimer"):
                st.session_state["analysis_history"].pop(idx)
                st.rerun()

# ==============================================================================
# Zone Principale
# ==============================================================================
st.title("📄 CV Move Personnel")
col_cv_in, col_job_in = st.columns(2)

with col_cv_in:
    st.subheader("📎 1. Importez votre CV (PDF/DOCX)")
    uploaded_file = st.file_uploader("Fichier CV :", type=["pdf", "docx", "txt"])
    if uploaded_file is not None:
        try:
            st.session_state["loaded_cv_text"] = extraire_texte_fichier(uploaded_file)
            st.success(f"✅ Fichier '{uploaded_file.name}' extrait avec succès !")
        except Exception as e:
            st.error(f"❌ Erreur fichier : {str(e)}")

with col_job_in:
    st.subheader("🔗 2. Récupérez l'Offre via URL")
    url_input = st.text_input("Lien web de l'annonce :", value=st.session_state.get("loaded_job_url", ""), placeholder="https://...")
    if st.button("📥 Extraire l'annonce depuis l'URL", use_container_width=True):
        if url_input and url_input.startswith(("http://", "https://")):
            try:
                titre, texte = recuperer_texte_depuis_url(url_input)
                st.session_state["loaded_job_url"] = url_input
                st.session_state["loaded_job_text"] = f"TITRE : {titre}\\nURL : {url_input}\\n\\n{texte}"
                st.success(f"✅ Annonce extraite : '{titre}' !")
            except Exception as e:
                st.error(f"❌ Erreur : {str(e)}")

col_cv, col_job = st.columns(2)
texte_du_cv = col_cv.text_area("Texte du CV :", value=st.session_state.get("loaded_cv_text", ""), height=300)
texte_de_l_offre = col_job.text_area("Texte de l'Offre :", value=st.session_state.get("loaded_job_text", ""), height=300)

if st.button("🚀 Lancer l'analyse de compatibilité", type="primary", use_container_width=True):
    if not api_key or not texte_du_cv or not texte_de_l_offre:
        st.error("❌ Veuillez remplir la Clé API, le CV et l'Offre d'emploi.")
    else:
        with st.spinner("⏳ Analyse en cours avec Gemini..."):
            try:
                genai.configure(api_key=api_key.strip())
                model = genai.GenerativeModel("gemini-3.8-flash")
                prompt = f"""Tu es un expert en recrutement et en systèmes de suivi des candidatures (ATS). Voici mon CV : {texte_du_cv}. Et voici l'offre d'emploi que je vise : {texte_de_l_offre}.
Fais une analyse détaillée et renvoie la réponse au format Markdown structuré avec les éléments suivants :
- Score de compatibilité : Une note sur 100 globale.
- Points forts : 3 éléments de mon CV qui correspondent parfaitement à l'offre.
- Points faibles / Manques : Ce qui me manque par rapport à l'offre.
- Stratégie de CV : 2 conseils pratiques sur les mots-clés à ajouter ou modifier dans mon CV pour passer les filtres.
- Lettre de motivation : Une ébauche de paragraphe d'accroche ultra-personnalisé.
- Préparation entretien : 3 questions difficiles qu'un recruteur pourrait me poser en voyant mon profil pour ce poste, avec des pistes de réponse."""
                reponse = model.generate_content(prompt)
                st.session_state["current_result"] = reponse.text
                st.session_state["analysis_history"].insert(0, {
                    "id": len(st.session_state["analysis_history"]) + 1,
                    "date": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                    "titre": (texte_de_l_offre.split("\\n")[0])[:45] or "Analyse",
                    "cv": texte_du_cv,
                    "job": texte_de_l_offre,
                    "job_url": st.session_state.get("loaded_job_url", ""),
                    "result": reponse.text,
                })
                st.success("✅ Analyse complétée et ajoutée à l'historique !")
            except Exception as e:
                st.error(f"❌ Erreur : {str(e)}")

if st.session_state.get("current_result"):
    st.markdown("---")
    st.markdown("### 📊 Résultats de l'analyse")
    st.markdown(st.session_state["current_result"])
`;

const REQUIREMENTS_TXT = `streamlit>=1.35.0
google-generativeai>=0.7.0
pypdf>=4.0.0
python-docx>=1.1.0
beautifulsoup4>=4.12.0
requests>=2.31.0
`;

export interface AnalysisHistoryItem {
  id: string;
  timestamp: string;
  title: string;
  jobSnippet: string;
  cvSnippet: string;
  cvText: string;
  jobText: string;
  analysisResult: string;
  score: number | null;
  fileName?: string;
  fileType?: string;
  jobUrl?: string;
}

// Exemples pré-remplis
const SAMPLE_PRESETS = [
  {
    title: 'Développeur Full Stack',
    cv: `THOMAS DUPONT - DÉVELOPPEUR FULL STACK (4 ANS D'EXPÉRIENCE)
Email: thomas.dupont@email.com | Tél: 06 12 34 56 78 | Paris

COMPÉTENCES CLÉS :
- Frontend : React, Next.js, TypeScript, Tailwind CSS, Redux Toolkit
- Backend : Node.js, Express, PostgreSQL, Prisma, APIs REST
- Outils & DevOps : Git, Docker, Jest, CI/CD GitHub Actions, Linux
- Méthodologies : Agile Scrum, Code Review, TDD

EXPÉRIENCES PROFESSIONNELLES :
1. Développeur Web Full Stack - TechNova SAS (2022 - Présent)
- Développement d'une application SaaS de gestion logistique utilisée par 45 000 utilisateurs quotidiens.
- Refonte de l'interface en React / TypeScript améliorant les performances de chargement de 38%.
- Mise en place d'APIs REST Node.js/PostgreSQL sécurisées avec authentification JWT et tests unitaires Jest (>80% couverture).

2. Développeur Frontend Junior - WebStudio Agency (2020 - 2022)
- Création de 12 sites vitrines et plateformes e-commerce responsives sous React et Tailwind CSS.
- Collaboration étroite avec les équipes UI/UX pour l'intégration de maquettes Figma pixel-perfect.

FORMATION :
- Master Informatique & Ingénierie du Web - Université Paris-Cité (2020)
- Langues : Français (Natif), Anglais (Courant - B2/C1)`,
    job: `OFFRE D'EMPLOI : DÉVELOPPEUR FULL STACK REACT / NODE.JS (H/F) - CDI
Entreprise : ScaleUp Fintech Innovante - Paris 8e (Hybride 2j présentiel)

VOS MISSIONS :
Au sein de notre équipe produit (12 ingénieurs), vous participerez activement à la conception et au déploiement de notre nouvelle plateforme de paiement instantané :
- Concevoir et implémenter des fonctionnalités modernes, performantes et scalables sur notre stack React/TypeScript et Node.js.
- Construire des APIs REST et GraphQL robustes connectées à nos bases PostgreSQL.
- Participer à la qualité de code (revues de code, tests automatisés Jest/Cypress, documentation).
- Contribuer à la scalabilité de l'infrastructure Docker / AWS en collaboration avec l'équipe DevOps.

PROFIL RECHERCHÉ :
- Diplôme Bac+5 en informatique ou équivalent.
- Au minimum 3 ans d'expérience significative en développement React et Node.js en production.
- Excellente maîtrise de TypeScript, React et bases relationnelles (PostgreSQL).
- Connaissance souhaitée de Docker et d'un cloud public (AWS ou GCP).
- Sensibilité forte à l'expérience utilisateur, aux performances web et aux problématiques de sécurité.
- Bon niveau d'anglais technique à l'oral comme à l'écrit.`,
    jobUrl: 'https://exemple-recrutement.fr/offres/dev-fullstack-paris',
  },
  {
    title: 'Chef de Projet Digital',
    cv: `CLARA MARTIN - CHEF DE PROJET DIGITAL & SCUM MASTER
Email: clara.martin@email.com | Lyon | Profil LinkedIn: in/claramartin

RÉSUMÉ :
Chef de projet certifiée Scrum Master (PSM I) avec 5 ans d'expérience dans le pilotage de projets digitaux et applications mobiles dans le secteur de la distribution.

COMPÉTENCES :
- Pilotage : Gestion de projet Agile (Scrum / Kanban), Roadmap, Gestion de budget (jusqu'à 300k€)
- Outils : Jira, Confluence, Trello, Miro, Notion, Figma
- Analytique : Google Analytics 4, Mixpanel, Excel avancé
- Communication : Animation de cérémonies agiles, relation client, coordination transverse (UX, Tech, Marketing)

PARCOURS :
Chef de Projet Digital - RetailGroup (2021 - Présent)
- Pilotage de la refonte du site e-commerce et de l'application mobile de click-and-collect.
- Animation quotidienne d'une équipe pluridisciplinaire de 8 personnes (4 développeurs, 2 UX designers, 1 QA).
- Réduction du cycle de release de 3 semaines à 10 jours grâce à la rationalisation des sprints Agile.`,
    job: `OFFRE D'EMPLOI : LEAD PRODUCT OWNER / CHEF DE PROJET AGILE (H/F)
Entreprise : E-Commerce Retail Leader - Lyon

MISSIONS :
- Définir et porter la vision produit pour nos parcours clients digitaux omnicanaux.
- Rédiger les user stories, prioriser le product backlog et définir les critères d'acceptation.
- Collaborer quotidiennement avec les équipes de développement technique, UX/UI et le marketing.
- Suivre les KPI de conversion, le NPS et le taux d'abandon panier pour itérer continuellement.

PROFIL :
- 4 à 6 ans d'expérience en gestion de projet digital ou Product Ownership e-commerce.
- Maîtrise éprouvée des méthodologies Agile Scrum (certification appréciée).
- Forte orientation data et expérience avec GA4 ou Amplitude.`,
    jobUrl: 'https://exemple-recrutement.fr/offres/chef-projet-lyon',
  },
  {
    title: 'Directeur / Resp. Comptable',
    cv: `CIGDEM ROUSSEAU - RESPONSABLE / DIRECTEUR COMPTABLE GROUPE
Email: c.rousseau@email.fr | Paris (8e) / Île-de-France | Tél: 06 98 76 54 32

PROFIL & EXPERTISE :
Directrice Comptable et Financière cumulant plus de 12 ans d'expérience dans le pilotage de la comptabilité générale, analytique, de la consolidation et du reporting financier de groupes multi-entités.
Maîtrise approfondie des normes françaises, IFRS, de la fiscalité des entreprises, de la gestion de trésorerie et du management d'équipes comptables (jusqu'à 15 collaborateurs).

COMPÉTENCES CLÉS :
- Comptabilité & Finance : Clôtures mensuelles et annuelles, Bilan, Liasse fiscale, Audit légal CAC, IFRS
- Systèmes d'Information : SAP S/4HANA, Cegid, Sage 1000, Microsoft Excel avancé (VBA, Power Query)
- Management & Organisation : Conduite du changement, harmonisation des plans comptables, dématérialisation factures
- Trésorerie & BFR : Prévisions de trésorerie, négociation bancaire, optimisation des délais DSO

EXPÉRIENCES PROFESSIONNELLES :
1. Directrice Comptable Groupe - Groupe Valoria Capital (2019 - Présent)
- Supervision complète des clôtures comptables, liasses fiscales et reportings de 8 filiales (CA consolidé: 85M€).
- Management et animation d'une équipe de 10 personnes (comptables généraux, fournisseurs et trésorerie).
- Déploiement de SAP S/4HANA Finance, réduisant le délai de clôture (Fast Close) de J+14 à J+6.

2. Responsable Comptable - Alliance BTP Solutions (2014 - 2019)
- Gestion de la comptabilité générale et analytique de 3 entités opérationnelles.
- Interlocutrice privilégiée des Commissaires aux Comptes, banques et administrations fiscales.

FORMATION :
- DSCG (Diplôme Supérieur de Comptabilité et de Gestion) - INTEC Paris
- Master 2 Finance, Contrôle de Gestion & Audit - Université Paris-Dauphine`,
    job: `OFFRE D'EMPLOI : DIRECTEUR / RESPONSABLE COMPTABLE GROUPE (H/F) - CDI
Localisation : Paris (8e) & Déplacements Saint-Quentin-en-Yvelines | Rémunération : 75K€ - 90K€

MISSIONS PRINCIPALES :
Directement rattaché(e) au Directeur Administratif et Financier, vous pilotez la fonction comptable du groupe :
- Superviser la production des comptes sociaux et consolidés du groupe dans le respect des calendriers et normes fiscales.
- Coordonner les arrêtés mensuels, trimestriels et annuels ainsi que l'établissement des liasses fiscales.
- Animer et faire grandir une équipe comptable expérimentée (8 personnes), en favorisant la montée en compétences.
- Être le garant de la fiabilité des flux financiers, de l'optimisation des processus de contrôle interne et du BFR.
- Piloter la relation avec les Commissaires aux Comptes, les auditeurs externes et les banques.
- Participer activement à la digitalisation des flux comptables (facturation électronique obligatoire 2026).

PROFIL RECHERCHÉ :
- Formation supérieure en Comptabilité/Finance (DSCG, DEC, Master CCA ou École de Commerce).
- Expérience minimale de 8 à 10 ans en cabinet d'expertise comptable/audit puis en entreprise en tant que Responsable ou Directeur Comptable.
- Expérience managériale confirmée avec leadership bienveillant.
- Excellente maîtrise des ERP comptables (SAP, Cegid ou Sage).
- Rigueur, capacité de synthèse, aisance relationnelle et orientation business partner.`,
    jobUrl: 'https://recrutement.entreprise.fr/offres/directeur-comptable-paris8',
  },
  {
    title: 'Data Analyst & BI',
    cv: `MAXIME LEROY - DATA ANALYST SENIOR (SQL, PYTHON, POWER BI)
Email: maxime.leroy@email.com | Tél: 06 45 67 89 01 | Paris / Remote

RÉSUMÉ :
Data Analyst expérimenté (5 ans) spécialisé dans la transformation de volumes massifs de données en tableaux de bord décisionnels à fort impact stratégique pour le Comex et les équipes opérationnelles.

COMPÉTENCES :
- Données & Langages : SQL (avancé, optimisation requêtes), Python (Pandas, NumPy, Scikit-Learn), R
- Dataviz & Outils BI : Power BI, Tableau Software, Google Data Studio / Looker Studio
- Data Warehouse & Cloud : BigQuery, Snowflake, AWS S3, dbt, Airflow
- Métiers : Suivi CAC/LTV, modélisation de churn, segmentation RFM, A/B Testing statistique

EXPÉRIENCES :
Data Analyst Senior - FinMetrics (2021 - Présent)
- Création et maintenance de 18 dashboards Power BI utilisés par 120 collaborateurs au quotidien.
- Réduction de l'attrition client de 18% grâce à un modèle prédictif de churn sous Python.`,
    job: `OFFRE D'EMPLOI : SENIOR DATA ANALYST (H/F) - CDI
Entreprise : Scale-up B2B SaaS - Paris

MISSIONS :
- Construire les modèles de données et indicateurs clés de performance (KPI) pour le produit et le marketing.
- Développer des dashboards interactifs sous Power BI / Tableau pour guider les décisions de la direction.
- Effectuer des analyses exploratoires pour identifier de nouveaux leviers de rétention et de croissance.

PROFIL :
- 4+ ans d'expérience en Data Analytics dans un environnement tech ou SaaS.
- Maîtrise experte de SQL et d'un outil BI moderne (Power BI, Tableau ou Looker).
- Bonnes compétences en Python et modélisation de données.`,
    jobUrl: 'https://recrutement.entreprise.fr/offres/senior-data-analyst',
  },
];

interface UrlFetchErrorInfo {
  message: string;
  isProtected?: boolean;
  platform?: string | null;
  url?: string;
  statusCode?: number;
  advice?: string;
}

export default function App() {
  const cvInputId = useId();
  const jobInputId = useId();
  const apiKeyInputId = useId();
  const jobUrlInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigation par onglets
  const [activeTab, setActiveTab] = useState<'app' | 'tracker' | 'cv-assistant' | 'database' | 'history' | 'code' | 'guide' | 'settings'>('app');

  // Profil utilisateur et affichage
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Suivi des candidatures
  const [applications, setApplications] = useState<ApplicationItem[]>(() => {
    try {
      const saved = localStorage.getItem('cv_move_applications');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_SAMPLE_APPLICATIONS;
  });

  // Base de données locale
  const [savedCvs, setSavedCvs] = useState<SavedCv[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);

  // Synchronisation des candidatures dans le localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cv_move_applications', JSON.stringify(applications));
    } catch {
      // ignore
    }
  }, [applications]);

  // État formulaire
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [cvText, setCvText] = useState('');
  const [jobText, setJobText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-flash-latest'>('gemini-3.8-flash');

  // Chargement initial depuis la base de données locale
  useEffect(() => {
    const initDb = async () => {
      try {
        const [cvList, appList, analysesList, stats, profileData] = await Promise.all([
          localDbClient.getCvs(),
          localDbClient.getApplications(),
          localDbClient.getAnalyses(),
          localDbClient.fetchStats(),
          localDbClient.getProfile(),
        ]);
        if (cvList && cvList.length > 0) {
          setSavedCvs(cvList);
          const defaultCv = cvList.find((c) => c.isDefault) || cvList[0];
          if (defaultCv) {
            setCvText(defaultCv.rawText);
            setSelectedCvId(defaultCv.id);
          }
        }
        if (appList && appList.length > 0) {
          setApplications(appList);
        }
        if (analysesList && analysesList.length > 0) {
          setHistory(analysesList);
        }
        if (stats) {
          setDbStats(stats);
        }
        if (profileData) {
          setUserProfile(profileData);
        }
      } catch (err) {
        console.warn('Initialisation BDD locale :', err);
      }
    };
    initDb();
  }, []);

  // Injecter l'en-tête du profil utilisateur dans le CV actif
  const handleInjectProfileToCv = (headerText: string) => {
    setCvText((prev) => {
      const cleanPrev = prev.trim();
      return `${headerText}\n${cleanPrev}`;
    });
    setCvSaveSuccess("✅ Coordonnées et profil injectés avec succès dans le CV actif !");
    setTimeout(() => setCvSaveSuccess(null), 3500);
  };

  // Enregistrer le CV actuellement affiché dans la base locale
  const handleSaveCurrentCvToDb = async () => {
    if (!cvText.trim()) return;
    const title = uploadedFileInfo?.fileName
      ? uploadedFileInfo.fileName.replace(/\.[^/.]+$/, '')
      : `CV Personnel (${new Date().toLocaleDateString('fr-FR')})`;

    try {
      const newCv: SavedCv = {
        id: `cv-${Date.now()}`,
        title,
        targetRole: 'Poste visé',
        fileName: uploadedFileInfo?.fileName || 'cv_texte.txt',
        fileType:
          uploadedFileInfo?.fileType === 'pdf' ||
          uploadedFileInfo?.fileType === 'docx' ||
          uploadedFileInfo?.fileType === 'txt'
            ? uploadedFileInfo.fileType
            : 'manual',
        rawText: cvText.trim(),
        isDefault: savedCvs.length === 0,
        fileSize: new Blob([cvText]).size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await localDbClient.saveCv(newCv);
      setSavedCvs((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)]);
      setSelectedCvId(saved.id);
      const updatedStats = await localDbClient.fetchStats();
      setDbStats(updatedStats);
      setCvSaveSuccess('✅ CV enregistré avec succès dans votre base locale !');
      setTimeout(() => setCvSaveSuccess(null), 3500);
    } catch {
      setCvSaveSuccess("❌ Erreur lors de l'enregistrement du CV.");
      setTimeout(() => setCvSaveSuccess(null), 3500);
    }
  };

  // Vérifier la présence de la clé API côté serveur
  useEffect(() => {
    fetch('/api/key-status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.hasServerKey) {
          setHasServerKey(true);
        }
      })
      .catch(() => {});
  }, []);

  // État d'importation de fichier CV
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<ExtractedFileResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // État de récupération de l'URL
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlFetchErrorInfo, setUrlFetchErrorInfo] = useState<UrlFetchErrorInfo | null>(null);
  const [urlFetchSuccess, setUrlFetchSuccess] = useState<string | null>(null);

  // État d'analyse
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [resultView, setResultView] = useState<'raw' | 'cards'>('raw');

  // État de l'historique persistant
  const [history, setHistory] = useState<AnalysisHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('cv_move_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [confirmDeleteHistoryId, setConfirmDeleteHistoryId] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [cvSaveSuccess, setCvSaveSuccess] = useState<string | null>(null);
  const [isCvOptimizationModalOpen, setIsCvOptimizationModalOpen] = useState(false);

  // Sauvegarder l'historique dans le localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cv_move_history', JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  // Extraction du score
  const extractScore = (text: string | null): number | null => {
    if (!text) return null;
    const match = text.match(/(\d{1,3})\s*(?:\/|\s*sur\s*)\s*100/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num >= 0 && num <= 100) return num;
    }
    return null;
  };

  // Traitement du fichier uploadé (PDF / DOCX / TXT)
  const handleFileUpload = async (file: File) => {
    setFileError(null);
    setIsParsingFile(true);

    try {
      const result = await parseCvFile(file);
      setCvText(result.text);
      setUploadedFileInfo(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue lors de la lecture du fichier.';
      setFileError(msg);
      setUploadedFileInfo(null);
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Récupération de l'annonce via URL (appel endpoint proxy /api/fetch-job-url)
  const handleFetchJobFromUrl = async () => {
    setUrlFetchErrorInfo(null);
    setUrlFetchSuccess(null);

    const targetUrl = jobUrl.trim();
    if (!targetUrl) {
      setUrlFetchErrorInfo({
        message: "Veuillez saisir l'adresse URL complète de l'annonce.",
      });
      return;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      setUrlFetchErrorInfo({
        message: "L'URL doit commencer par 'http://' ou 'https://'.",
      });
      return;
    }

    setIsFetchingUrl(true);

    try {
      const response = await fetch('/api/fetch-job-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const isAntiBot =
          Boolean(data?.isProtectedSite) ||
          [401, 403, 429].includes(response.status) ||
          /indeed|linkedin|glassdoor|hellowork/i.test(targetUrl);
        const platform =
          data?.platform ||
          (/indeed/i.test(targetUrl)
            ? 'Indeed'
            : /linkedin/i.test(targetUrl)
            ? 'LinkedIn'
            : /glassdoor/i.test(targetUrl)
            ? 'Glassdoor'
            : null);

        setUrlFetchErrorInfo({
          message:
            data?.error ||
            `${platform || 'Ce site'} bloque l'accès automatique (Code ${response.status}).`,
          isProtected: isAntiBot,
          platform,
          url: targetUrl,
          statusCode: response.status,
          advice: data?.advice,
        });
        return;
      }

      if (!data.text) {
        setUrlFetchErrorInfo({
          message: "Aucun contenu textuel n'a pu être extrait de cette page.",
          url: targetUrl,
        });
        return;
      }

      setJobText(data.text);
      setUrlFetchErrorInfo(null);
      setUrlFetchSuccess(
        `Annonce récupérée avec succès ! (${data.charCount || data.text.length} caractères)`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la récupération.';
      setUrlFetchErrorInfo({
        message,
        url: targetUrl,
      });
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Coller le texte de l'annonce depuis le presse-papier avec conservation de l'URL source
  const handlePasteJobFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setUrlFetchErrorInfo({
          message:
            "La lecture automatique du presse-papier n'est pas autorisée dans ce navigateur. Utilisez le raccourci Ctrl+V directement dans la zone de texte ci-dessous.",
        });
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        setUrlFetchErrorInfo({
          message:
            "Votre presse-papier est vide. Copiez d'abord le texte de l'offre (sélectionnez le descriptif sur la page de l'offre et faites Ctrl+C), puis cliquez sur ce bouton.",
        });
        return;
      }

      const currentUrl = jobUrl.trim();
      const hasUrl = currentUrl.startsWith('http://') || currentUrl.startsWith('https://');
      const alreadyIncludesUrl = text.includes('http://') || text.includes('https://');

      const formatted = hasUrl && !alreadyIncludesUrl
        ? `URL source : ${currentUrl}\n\n${text.trim()}`
        : text.trim();

      setJobText(formatted);
      setUrlFetchErrorInfo(null);
      setUrlFetchSuccess(
        `✅ Descriptif collé depuis votre presse-papier (${text.length} caractères) !`
      );
      confetti({ particleCount: 45, spread: 55, origin: { y: 0.6 } });
    } catch (err) {
      console.warn('Erreur lecture presse-papier:', err);
      setUrlFetchErrorInfo({
        message:
          "Accès au presse-papier non autorisé par votre navigateur. Vous pouvez coller le texte directement avec le raccourci Ctrl+V dans la zone de texte « Texte de l'Offre ».",
      });
    }
  };

  // Copier dans le presse-papier
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStatus(label);
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  // Télécharger un fichier texte
  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Charger un exemple pré-rempli
  const loadPreset = (preset: SamplePreset) => {
    setCvText(preset.cv);
    setJobText(preset.job);
    setJobUrl(preset.jobUrl || '');
    setUploadedFileInfo(null);
    setErrorMessage(null);
    setFileError(null);
    setUrlFetchErrorInfo(null);
    setUrlFetchSuccess(null);
  };

  // Réinitialiser les champs
  const handleReset = () => {
    setCvText('');
    setJobText('');
    setJobUrl('');
    setAnalysisResult(null);
    setErrorMessage(null);
    setFileError(null);
    setUrlFetchErrorInfo(null);
    setUrlFetchSuccess(null);
    setUploadedFileInfo(null);
    setSelectedHistoryId(null);
  };

  // Charger un élément d'historique dans l'éditeur
  const handleLoadHistoryItem = (item: AnalysisHistoryItem) => {
    setCvText(item.cvText);
    setJobText(item.jobText);
    setJobUrl(item.jobUrl || '');
    setAnalysisResult(item.analysisResult);
    setSelectedHistoryId(item.id);
    setErrorMessage(null);
    setActiveTab('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Supprimer un élément d'historique
  const handleDeleteHistoryItem = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
    }
    setConfirmDeleteHistoryId(null);
    try {
      await localDbClient.deleteAnalysis(id);
    } catch (err) {
      console.warn('Erreur suppression analyse locale :', err);
    }
  };

  // Vider tout l'historique
  const handleClearHistory = () => {
    setHistory([]);
    setSelectedHistoryId(null);
    setConfirmClearHistory(false);
  };

  // Lancer l'analyse Gemini
  const handleRunAnalysis = async (useDemoFallback = false) => {
    setErrorMessage(null);

    const missing: string[] = [];
    if (!apiKey.trim() && !hasServerKey && !useDemoFallback) {
      missing.push('la Clé API Google (dans la barre latérale)');
    }
    if (!cvText.trim()) {
      missing.push('le texte du CV (ou importez un fichier)');
    }
    if (!jobText.trim()) {
      missing.push("le texte de l'offre d'emploi (ou déposez une URL)");
    }

    if (missing.length > 0) {
      setErrorMessage(
        `Veuillez renseigner tous les champs requis : ${missing.join(', ')}.`
      );
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      let finalResult = '';

      if (useDemoFallback) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        finalResult = `### Score de compatibilité
**88 / 100** (Excellente adéquation avec le poste)

---

### Points forts
1. **Compétences clés directement alignées** : Maîtrise solide et concrète des technologies et exigences mentionnées dans l'offre.
2. **Niveau d'expérience et autonomie prouvés** : Parcours avec réalisations chiffrées et livrables récents en adéquation directe avec les attentes.
3. **Méthodologie collaborative et communication** : Pratique démontrée de travail en équipe agile et gestion de projets transverses.

---

### Points faibles / Manques
1. **Outils ou méthodologies cloud spécifiques** : Certains services ou environnements mentionnés dans l'annonce ne figurent pas explicitement sous ces intitulés exacts dans votre CV.
2. **Métriques d'impact business à accentuer** : Davantage valoriser l'impact financier, le gain de temps ou le ROI sur vos missions passées.

---

### Stratégie de CV
1. **Harmonisation ATS des mots-clés** : Intégrez les intitulés exacts de l'offre directement dans votre en-tête et dans les puces de descriptions de postes.
2. **Titre de CV miroir** : Reprenez dans le titre de votre CV l'intitulé exact de l'offre d'emploi pour maximiser le score de parsing ATS dès la première seconde.

---

### Lettre de motivation
> *"Passionné par les défis d'ingénierie et fort de plusieurs années d'expérience en conception de solutions performantes, c'est avec un très grand intérêt que je vous soumets ma candidature pour ce rôle. Votre culture axée sur l'excellence technique fait écho à mes récentes réalisations, et je serais ravi de mettre mon expertise au service de vos objectifs."*

---

### Préparation entretien
1. **Question :** *"Comment priorisez-vous vos tâches face à des échéances serrées et des demandes imprévues ?"*  
   *Piste de réponse :* Citez une situation réelle avec la méthode STAR (Situation, Tâche, Action, Résultat), en insistant sur la communication proactive avec l'équipe.
2. **Question :** *"Parlez-moi d'une divergence technique que vous avez eue avec un collègue et de la manière dont vous l'avez résolue."*  
   *Piste de réponse :* Mettez l'accent sur les faits, les tests comparatifs (benchmarks) et l'alignement sur l'intérêt du produit.
3. **Question :** *"Sur quelles technologies de notre stack avez-vous le moins d'expérience et comment comptez-vous monter en compétence rapidement ?"*  
   *Piste de réponse :* Démontrez votre curiosité continue et donnez un exemple concret d'outil que vous avez appris en quelques jours.`;
      } else {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvText: cvText.trim(),
            jobText: jobText.trim(),
            apiKey: apiKey.trim() || undefined,
            model: selectedModel,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success || !data.result) {
          throw new Error(data?.error || `Erreur serveur HTTP ${response.status}`);
        }

        finalResult = data.result;
      }

      if (!finalResult) {
        throw new Error("L'API Gemini n'a renvoyé aucun contenu pour cette analyse.");
      }

      setAnalysisResult(finalResult);
      confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });

      const score = extractScore(finalResult);
      const firstLineJob = jobText.trim().split('\n')[0].replace(/^[#*\s-]+/, '').slice(0, 50);
      const title = firstLineJob.length > 5 ? firstLineJob : "Analyse d'adéquation";

      const newHistoryItem: AnalysisHistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        title,
        jobSnippet: jobText.trim().slice(0, 120),
        cvSnippet: cvText.trim().slice(0, 120),
        cvText: cvText.trim(),
        jobText: jobText.trim(),
        analysisResult: finalResult,
        score,
        fileName: uploadedFileInfo?.fileName,
        fileType: uploadedFileInfo?.fileType,
        jobUrl: jobUrl.trim() || undefined,
      };

      setHistory((prev) => [newHistoryItem, ...prev]);
      setSelectedHistoryId(newHistoryItem.id);
      localDbClient.saveAnalysis(newHistoryItem).catch((e) => console.warn('Erreur sauvegarde analyse BDD', e));
      localDbClient.fetchStats().then((st) => setDbStats(st)).catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Une erreur est survenue lors de l'appel à l'API : ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Ajouter l'analyse actuelle directement au Suivi des candidatures
  const handleAddAnalysisToTracker = () => {
    const score = analysisResult ? extractScore(analysisResult) : null;
    const firstLineJob = jobText.trim().split('\n')[0].replace(/^[#*\s-]+/, '').slice(0, 60);
    const inferredRole = firstLineJob.length > 5 ? firstLineJob : 'Poste analysé';

    let inferredCompany = 'Entreprise';
    if (jobUrl) {
      try {
        const host = new URL(jobUrl).hostname.replace(/^www\./, '').split('.')[0];
        if (host && !['indeed', 'linkedin', 'hellowork', 'francetravail', 'apec'].includes(host.toLowerCase())) {
          inferredCompany = host.charAt(0).toUpperCase() + host.slice(1);
        }
      } catch {
        // ignore
      }
    }
    const matchCompany = jobText.match(/(?:chez|entreprise|société|groupe)\s+([A-Z][a-zA-Z0-9éèàîôùç\s]{2,20})/i);
    if (matchCompany && matchCompany[1]) {
      inferredCompany = matchCompany[1].trim();
    }

    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newApp: ApplicationItem = {
      id: 'app-' + Date.now(),
      company: inferredCompany,
      role: inferredRole,
      status: 'to_apply',
      appliedDate: new Date().toISOString().split('T')[0],
      followUpDate: nextWeek,
      location: 'France / Hybride',
      contractType: 'CDI',
      jobUrl: jobUrl.trim(),
      score,
      analysisId: selectedHistoryId || (history[0]?.id ?? null),
      notes: `Analyse ATS générée le ${new Date().toLocaleDateString('fr-FR')} (Score : ${score ?? 'N/A'}%).`,
      checklist: {
        cvSent: false,
        coverLetterSent: false,
        portfolioSent: false,
        followUpDone: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) => [newApp, ...prev]);
    localDbClient.saveApplication(newApp).catch((e) => console.warn('Erreur sauvegarde candidature BDD', e));
    localDbClient.fetchStats().then((st) => setDbStats(st)).catch(() => {});
    setActiveTab('tracker');
  };

  const scoreNumber = extractScore(analysisResult);

  const filteredHistory = history.filter((item) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.jobSnippet.toLowerCase().includes(q) ||
      item.cvSnippet.toLowerCase().includes(q) ||
      (item.fileName && item.fileName.toLowerCase().includes(q)) ||
      (item.jobUrl && item.jobUrl.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#F0F2F6] text-[#262730] flex flex-row font-sans">
      {/* =========================================================================
          MENU LATÉRAL (SIDEBAR) RÉORGANISÉ FONCTIONNELLEMENT
         ========================================================================= */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        userProfile={userProfile}
        apiKey={apiKey}
        hasServerKey={hasServerKey}
        selectedModel={selectedModel}
        applicationsCount={applications.length}
        historyCount={history.length}
        dbStats={dbStats}
        history={history}
        onLoadHistoryItem={handleLoadHistoryItem}
        samplePresets={SAMPLE_PRESETS}
        onLoadPreset={loadPreset}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Conteneur Principal de l'Application */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Barre d'En-tête Supérieure */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* Bouton Hamburger Mobile pour le Menu Latéral */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Ouvrir le menu latéral"
            >
              <Layers className="w-5 h-5 text-[#FF4B4B]" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-gray-900 text-sm sm:text-base leading-tight truncate">
                  {activeTab === 'app' && '🎯 Analyseur d\'Adéquation CV & Offre'}
                  {activeTab === 'cv-assistant' && '✨ Générateur Assisté CV & Lettre'}
                  {activeTab === 'tracker' && '💼 Suivi des Candidatures'}
                  {activeTab === 'history' && '🕒 Historique des Audits'}
                  {activeTab === 'database' && '🗄️ Base de Données Locale'}
                  {activeTab === 'settings' && '👤 Paramétrage & Profil Utilisateur'}
                  {activeTab === 'code' && '💻 Code Python (app.py)'}
                  {activeTab === 'guide' && '📖 Guide de Déploiement'}
                </h1>
                <span className="hidden sm:inline-flex text-[10px] bg-red-50 text-[#FF4B4B] border border-red-200 px-2 py-0.5 rounded-full font-medium">
                  {selectedModel}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block truncate">
                {activeTab === 'app' && 'Comparez votre CV à l\'offre, identifiez les écarts ATS et boostez vos chances d\'entretien'}
                {activeTab === 'cv-assistant' && 'Rédigez un CV sur-mesure ou une lettre de motivation percutante avec l\'IA'}
                {activeTab === 'tracker' && 'Gérez vos candidatures, relances et entretiens en mode Kanban interactif'}
                {activeTab === 'history' && 'Retrouvez vos rapports d\'audit passés et comparez les scores d\'adéquation'}
                {activeTab === 'database' && 'Gérez vos CVs enregistrés, suggestions IA et sauvegardes'}
                {activeTab === 'settings' && 'Gérez vos coordonnées, compétences, clé API Gemini et préférences'}
                {activeTab === 'code' && 'Script Python Streamlit complet et autonome prêt à être déployé'}
                {activeTab === 'guide' && 'Instructions pas à pas pour exécuter ou déployer gratuitement'}
              </p>
            </div>
          </div>

          {/* Raccourcis et statut en en-tête */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Statut Clé API */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                apiKey.trim()
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : hasServerKey
                  ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Gérer la clé API dans Paramétrage"
            >
              {apiKey.trim() ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Clé personnalisée</span>
                </>
              ) : hasServerKey ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  <span>Clé Studio active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Clé à configurer</span>
                </>
              )}
            </button>

            {/* Profil Candidat Clickable Pill */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 pl-2 pr-3 py-1 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 rounded-full text-xs font-semibold text-gray-800 transition-colors cursor-pointer group"
              title="Accéder à mon Profil et Paramètres"
            >
              <div className="w-6 h-6 rounded-full bg-linear-to-tr from-purple-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                {userProfile
                  ? `${userProfile.firstName?.[0] || 'A'}${userProfile.lastName?.[0] || 'M'}`.toUpperCase()
                  : 'AM'}
              </div>
              <span className="hidden sm:inline group-hover:text-purple-700">
                {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Mon Profil'}
              </span>
            </button>
          </div>
        </header>

        {/* Espace de Travail Principal */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          {/* =========================================================================
              ONGLET 1 : APPLICATION STREAMLIT (ANALYSEUR CV & OFFRE)
             ========================================================================= */}
          {activeTab === 'app' && (
            <div className="w-full flex flex-col gap-6">
              {/* En-tête et descriptif avec barre d'actions rapides */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <span>📄 Analyseur d&apos;Adéquation CV & Offre</span>
                    </h2>
                    <p className="text-sm font-medium text-[#FF4B4B] mt-0.5">
                      Audit de conformité ATS • Détection des compétences manquantes • Préparation d&apos;entretien
                    </p>
                  </div>

                  {/* Barre d'outils et raccourcis rapides */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Injecter le profil candidat */}
                    {userProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          const fullName = `${userProfile.firstName} ${userProfile.lastName}`.trim().toUpperCase() || 'CANDIDAT';
                          const title = userProfile.currentTitle ? `${userProfile.currentTitle}\n` : '';
                          const contactParts = [
                            userProfile.location,
                            userProfile.phone,
                            userProfile.email,
                            userProfile.linkedinUrl ? userProfile.linkedinUrl.replace(/^https?:\/\//, '') : '',
                          ].filter(Boolean);
                          const header = `${fullName}\n${title}${contactParts.join(' | ')}\n\n`;
                          handleInjectProfileToCv(header);
                        }}
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer font-medium"
                        title="Injecter mes coordonnées et titre dans le CV actif"
                      >
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        <span>Injecter mon profil</span>
                      </button>
                    )}

                    {/* Charger un exemple pré-rempli */}
                    <div className="relative group">
                      <button
                        type="button"
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer font-medium"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#FF4B4B]" />
                        <span>Charger un exemple</span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 hidden group-hover:block z-30">
                        {SAMPLE_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => loadPreset(preset)}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate">{preset.title}</span>
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Charger un CV sauvegardé dans la base locale */}
                    {savedCvs.length > 0 && (
                      <div className="relative group">
                        <button
                          type="button"
                          className="text-xs flex items-center gap-1.5 px-3 py-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer font-medium"
                        >
                          <Database className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mes CVs ({savedCvs.length})</span>
                          <ChevronDown className="w-3 h-3 text-emerald-600" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 hidden group-hover:block z-30 max-h-60 overflow-y-auto">
                          {savedCvs.map((cv) => (
                            <button
                              key={cv.id}
                              type="button"
                              onClick={() => {
                                setCvText(cv.rawText);
                                setSelectedCvId(cv.id);
                                setCvSaveSuccess(`✅ CV "${cv.title}" chargé avec succès !`);
                                setTimeout(() => setCvSaveSuccess(null), 3000);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex flex-col cursor-pointer"
                            >
                              <span className="font-semibold truncate">{cv.title}</span>
                              <span className="text-[10px] text-gray-400">{cv.targetRole} • {cv.fileType}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bouton Réinitialiser */}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      title="Effacer les champs et réinitialiser"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Réinitialiser</span>
                    </button>
                  </div>
                </div>

                {/* Bannière discrète si aucune clé API configurée */}
                {!apiKey.trim() && !hasServerKey && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Clé API Gemini non configurée :</strong> Pour activer les analyses complètes en direct, renseignez votre clé dans l&apos;onglet Paramétrage & Profil.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Configurer dans Paramètres
                    </button>
                  </div>
                )}

                <p className="text-sm text-gray-600 leading-relaxed">
                  Importez votre CV (PDF/DOCX) et récupérez l&apos;offre d&apos;emploi par lien web ou en collant le texte. L&apos;IA de Google analyse votre profil, calcule votre compatibilité ATS et vous prépare aux entretiens de recrutement.
                </p>
              </div>

              {/* =================================================================
                  MODULES D'IMPORTATION RAPIDE (CV FICHIER & OFFRE URL)
                 ================================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Import Fichier CV */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileUp className="w-4 h-4 text-[#FF4B4B]" />
                        <h3 className="text-sm font-bold text-gray-900">
                          📎 Importez votre CV (PDF / DOCX)
                        </h3>
                      </div>
                      <span className="text-[10px] bg-red-50 text-[#FF4B4B] px-2 py-0.5 rounded-full font-medium border border-red-200">
                        PDF, DOCX, TXT
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-3">
                      Déposez votre CV pour extraire automatiquement son texte dans le champ ci-dessous.
                    </p>

                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-[#FF4B4B] bg-red-50/40'
                          : 'border-gray-300 hover:border-gray-400 bg-gray-50/40'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />

                      {isParsingFile ? (
                        <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                          <RefreshCw className="w-5 h-5 text-[#FF4B4B] animate-spin" />
                          <p className="text-xs font-semibold text-gray-700">
                            Extraction du texte du document...
                          </p>
                        </div>
                      ) : uploadedFileInfo ? (
                        <div className="text-left bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-emerald-900 truncate">
                                {uploadedFileInfo.fileName}
                              </p>
                              <p className="text-[10px] text-emerald-700">
                                {uploadedFileInfo.fileType.toUpperCase()} • {(uploadedFileInfo.fileSize / 1024).toFixed(1)} Ko • {uploadedFileInfo.text.length} car.
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-emerald-800 font-semibold underline shrink-0">
                            Changer
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-1 space-y-1">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <p className="text-xs font-medium text-gray-700">
                            Glissez votre CV ou cliquez ici
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Max 15 Mo • .pdf, .docx, .txt
                          </p>
                        </div>
                      )}
                    </div>

                    {fileError && (
                      <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Erreur fichier :</span> {fileError}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Récupération Offre via URL */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-gray-900">
                          🔗 Récupérez l&apos;Offre via URL
                        </h3>
                      </div>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-200">
                        Web scraping
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-2">
                      Collez le lien direct vers l&apos;annonce pour en extraire automatiquement le descriptif :
                    </p>

                    <div className="space-y-2">
                      <div className="relative">
                        <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id={jobUrlInputId}
                          type="url"
                          value={jobUrl}
                          onChange={(e) => {
                            setJobUrl(e.target.value);
                            if (urlFetchErrorInfo) setUrlFetchErrorInfo(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleFetchJobFromUrl();
                            }
                          }}
                          placeholder="https://www.exemple.com/offres/poste-cdi..."
                          className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-gray-50/40"
                        />
                      </div>

                      {/* Détection proactive des sites avec anti-robot Cloudflare */}
                      {jobUrl.toLowerCase().includes('indeed.') && !urlFetchErrorInfo && !urlFetchSuccess && (
                        <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50/90 px-2.5 py-1.5 rounded-lg border border-amber-200">
                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            Lien Indeed détecté : les annonces Indeed sont souvent protégées contre l&apos;accès serveur direct. Si l&apos;extraction est bloquée, le bouton <strong>« Coller le presse-papier »</strong> importera votre texte en 1 clic.
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={isFetchingUrl}
                        onClick={handleFetchJobFromUrl}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          isFetchingUrl
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                      >
                        {isFetchingUrl ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Récupération et nettoyage de l&apos;annonce...</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>📥 Extraire l&apos;annonce depuis ce lien</span>
                          </>
                        )}
                      </button>
                    </div>

                    {urlFetchSuccess && (
                      <div className="mt-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{urlFetchSuccess}</span>
                      </div>
                    )}

                    {urlFetchErrorInfo && urlFetchErrorInfo.isProtected ? (
                      /* Panneau d'assistance dédié en cas de protection anti-robot (Indeed, LinkedIn, Cloudflare) */
                      <div className="mt-3 p-3.5 bg-amber-50/90 border-2 border-amber-300 rounded-xl text-amber-950 text-xs shadow-xs space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-xs">
                                Protection anti-robot détectée ({urlFetchErrorInfo.platform || 'Site protégé'})
                              </span>
                              <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                HTTP {urlFetchErrorInfo.statusCode || 403} • Cloudflare WAF
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-700 leading-relaxed">
                              {urlFetchErrorInfo.platform || 'Ce site'} interdit l&apos;accès direct automatisé depuis des serveurs distants. Mais vous pouvez importer l&apos;annonce sans ressaisir en 2 clics :
                            </p>
                          </div>
                        </div>

                        {/* Boutons d'action guidés */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/90">
                          <a
                            href={urlFetchErrorInfo.url || jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 shadow-2xs transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            <span>1. Ouvrir l&apos;offre sur {urlFetchErrorInfo.platform || 'le site'}</span>
                          </a>

                          <button
                            type="button"
                            onClick={handlePasteJobFromClipboard}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>2. 📋 Coller le presse-papier</span>
                          </button>
                        </div>

                        <p className="text-[10px] text-amber-800 bg-amber-100/70 p-2 rounded-md leading-normal">
                          👉 <strong>Méthode en 3 secondes :</strong> Ouvrez l&apos;offre, sélectionnez le texte du poste et faites <strong>Ctrl+C</strong> (ou Copier). Revenez ici et cliquez sur <em>« 2. Coller le presse-papier »</em>.
                        </p>
                      </div>
                    ) : urlFetchErrorInfo ? (
                      <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold">Information d&apos;extraction :</p>
                          <p className="text-[11px] leading-tight">{urlFetchErrorInfo.message}</p>
                          <p className="text-[10px] text-amber-700">
                            💡 Vous pouvez utiliser le bouton « Coller presse-papier » sur la zone de l&apos;offre ci-dessous.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* =================================================================
                  DEUX GRANDES ZONES DE TEXTE (CV & OFFRE D'EMPLOI)
                 ================================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Zone 1 : CV */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor={cvInputId}
                      className="text-sm font-bold text-gray-800 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-[#FF4B4B]" />
                      <span>1. Texte de votre CV (éditable)</span>
                    </label>
                    <span className="text-xs text-gray-400">
                      {cvText.length > 0 ? `${cvText.length} car.` : 'Obligatoire'}
                    </span>
                  </div>

                  {/* Sélecteur de CVs sauvegardés en base locale */}
                  <div className="mb-2.5 p-2 bg-purple-50/70 border border-purple-200/90 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-purple-900">
                      <Database className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      <span>Ma BDD de CVs :</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        value={selectedCvId}
                        onChange={(e) => {
                          const found = savedCvs.find((c) => c.id === e.target.value);
                          if (found) {
                            setCvText(found.rawText);
                            setSelectedCvId(found.id);
                          }
                        }}
                        className="px-2 py-1 bg-white border border-purple-300 rounded-md text-[11px] font-medium text-gray-800"
                      >
                        <option value="">-- Choisir parmi {savedCvs.length} CV(s) --</option>
                        {savedCvs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.isDefault ? '⭐ ' : ''}{c.title}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleSaveCurrentCvToDb}
                        disabled={!cvText.trim()}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Enregistrer ce CV dans ma base locale"
                      >
                        <Save className="w-3 h-3" />
                        <span>Enregistrer en BDD</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-2.5">
                    Texte extrait du document ou collé manuellement (expériences, compétences, formations)...
                  </p>
                  <textarea
                    id={cvInputId}
                    rows={12}
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    placeholder="Collez ici le texte intégral de votre CV ou importez un fichier PDF/DOCX ci-dessus..."
                    className="w-full p-3.5 text-xs sm:text-sm font-sans border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#FF4B4B] focus:border-[#FF4B4B] resize-y bg-gray-50/30 leading-relaxed text-gray-800 placeholder-gray-400 flex-1 min-h-[260px]"
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCvOptimizationModalOpen(true)}
                      disabled={!cvText.trim()}
                      className="text-xs px-3 py-1.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="Créer une version optimisée de votre CV intégrant les mots-clés et compétences de l'offre"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>✨ Optimiser / Adapter ce CV</span>
                    </button>

                    {cvText && (
                      <button
                        type="button"
                        onClick={() => {
                          setCvText('');
                          setUploadedFileInfo(null);
                        }}
                        className="text-[11px] text-gray-400 hover:text-red-500"
                      >
                        Effacer le CV
                      </button>
                    )}
                  </div>
                </div>

                {/* Zone 2 : Offre d'emploi */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor={jobInputId}
                      className="text-sm font-bold text-gray-800 flex items-center gap-2"
                    >
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <span>2. Texte de l&apos;Offre d&apos;Emploi (éditable)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePasteJobFromClipboard}
                        className="text-[11px] flex items-center gap-1 px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md font-medium transition-colors cursor-pointer"
                        title="Coller directement depuis votre presse-papier"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Coller presse-papier</span>
                      </button>
                      <span className="text-xs text-gray-400">
                        {jobText.length > 0 ? `${jobText.length} car.` : 'Obligatoire'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2.5">
                    Texte extrait depuis le lien web ou collé manuellement (missions, profil, compétences)...
                  </p>
                  <textarea
                    id={jobInputId}
                    rows={12}
                    value={jobText}
                    onChange={(e) => setJobText(e.target.value)}
                    placeholder="Collez ici le texte complet de l'annonce ou utilisez le champ d'extraction par URL ci-dessus..."
                    className="w-full p-3.5 text-xs sm:text-sm font-sans border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#FF4B4B] focus:border-[#FF4B4B] resize-y bg-gray-50/30 leading-relaxed text-gray-800 placeholder-gray-400 flex-1 min-h-[260px]"
                  />
                  {jobText && (
                    <button
                      type="button"
                      onClick={() => {
                        setJobText('');
                        setJobUrl('');
                        setUrlFetchSuccess(null);
                      }}
                      className="self-end text-[11px] text-gray-400 hover:text-red-500 mt-1.5"
                    >
                      Effacer l&apos;offre
                    </button>
                  )}
                </div>
              </div>

              {/* Bouton d'action principal */}
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleRunAnalysis(false)}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-base shadow-md transition-all flex items-center justify-center gap-2.5 ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-[#FF4B4B] hover:bg-[#e03a3a] active:scale-[0.99] text-white hover:shadow-lg'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Analyse en cours par l&apos;IA Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>🚀 Lancer l&apos;analyse de compatibilité</span>
                    </>
                  )}
                </button>

                {!apiKey.trim() && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (!cvText || !jobText) {
                          loadPreset(SAMPLE_PRESETS[0]);
                        }
                        handleRunAnalysis(true);
                      }}
                      className="text-xs text-gray-500 hover:text-[#FF4B4B] underline"
                    >
                      💡 Vous n&apos;avez pas encore de clé API ? Cliquez ici pour tester une simulation instantanée
                    </button>
                  </div>
                )}
              </div>

              {/* Notification d'erreur */}
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-3 shadow-xs">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Erreur de validation ou d&apos;API :</p>
                    <p className="text-xs sm:text-sm text-red-800">{errorMessage}</p>
                    <p className="text-xs text-red-600 mt-2">
                      💡 Vérifiez que votre clé API Google est correctement renseignée dans la barre latérale
                      et que les deux champs contiennent du texte.
                    </p>
                  </div>
                </div>
              )}

              {/* Indicateur de chargement */}
              {isLoading && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-xs text-center space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-red-50 text-[#FF4B4B] animate-pulse">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-gray-900">
                      Analyse ATS & Recrutement en cours...
                    </h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      L&apos;IA examine chaque critère, évalue la compatibilité, extrait les mots-clés manquants
                      et formule vos questions d&apos;entretien.
                    </p>
                  </div>
                </div>
              )}

              {/* =================================================================
                  RÉSULTATS DE L'ANALYSE (ST.MARKDOWN)
                 ================================================================= */}
              {analysisResult && !isLoading && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-0">
                  <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-emerald-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-sm sm:text-base">
                        ✅ Analyse complétée avec succès !
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white border border-emerald-300 rounded-lg p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setResultView('raw')}
                          className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                            resultView === 'raw'
                              ? 'bg-emerald-600 text-white'
                              : 'text-emerald-900 hover:bg-emerald-50'
                          }`}
                        >
                          Markdown brut
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultView('cards')}
                          className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                            resultView === 'cards'
                              ? 'bg-emerald-600 text-white'
                              : 'text-emerald-900 hover:bg-emerald-50'
                          }`}
                        >
                          Fiche Visuelle
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(analysisResult, 'result')}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50 flex items-center gap-1 font-medium transition-colors"
                        title="Copier le rapport"
                      >
                        {copiedStatus === 'result' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Copier</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCvOptimizationModalOpen(true)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center gap-1.5 font-bold shadow-xs transition-colors cursor-pointer"
                        title="Créer un nouveau CV ou modifier l'actuel en intégrant les modifications proposées par l'audit"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>✨ Adapter mon CV à cette offre</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddAnalysisToTracker}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-bold shadow-xs transition-colors cursor-pointer"
                        title="Ajouter cette opportunité à mon tableau de suivi des candidatures"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>➕ Suivre cette candidature</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('cv-assistant')}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                        title="Optimiser mon CV avec les méthodes STAR et l'IA"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>✨ Améliorer mon CV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadFile('rapport_cv_move_personnel.md', analysisResult)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50 flex items-center gap-1 font-medium transition-colors"
                        title="Télécharger en fichier .md"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Télécharger</span>
                      </button>
                    </div>
                  </div>

                  {scoreNumber !== null && (
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-xs ${
                            scoreNumber >= 75
                              ? 'bg-emerald-600'
                              : scoreNumber >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                        >
                          {scoreNumber}
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                            Score de compatibilité global
                          </div>
                          <div className="text-sm font-bold text-gray-900">
                            {scoreNumber >= 80
                              ? 'Excellente adéquation (Fortes chances de présélection ATS)'
                              : scoreNumber >= 65
                              ? 'Bonne adéquation (Quelques ajustements recommandés)'
                              : 'Compatibilité modérée (Optimisation des compétences requise)'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 hidden md:block">
                        Note sur 100 enregistrée dans votre historique
                      </div>
                    </div>
                  )}

                  {resultView === 'raw' ? (
                    <div className="p-6 sm:p-8">
                      <div
                        className="prose prose-sm max-w-none text-gray-800 leading-relaxed space-y-4
                          [&>h1]:text-xl [&>h1]:font-bold [&>h1]:text-gray-900 [&>h1]:border-b [&>h1]:pb-2
                          [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-6 [&>h2]:mb-2
                          [&>h3]:text-base [&>h3]:font-bold [&>h3]:text-[#FF4B4B] [&>h3]:mt-4 [&>h3]:mb-1
                          [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1.5
                          [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1.5
                          [&>blockquote]:border-l-4 [&>blockquote]:border-[#FF4B4B] [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:bg-red-50/40 [&>blockquote]:py-2 [&>blockquote]:rounded-r-lg
                          [&>hr]:border-gray-200 [&>hr]:my-6"
                        dangerouslySetInnerHTML={{ __html: marked.parse(analysisResult) as string }}
                      />
                    </div>
                  ) : (
                    <div className="p-6 sm:p-8 space-y-6">
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                          <Target className="w-4 h-4 text-[#FF4B4B]" />
                          <span>Synthèse d&apos;audit ATS</span>
                        </div>
                        <div
                          className="text-xs text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: marked.parse(analysisResult) as string }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* =========================================================================
            ONGLET 2 : SUIVI DES CANDIDATURES (KANBAN & TRACKER)
           ========================================================================= */}
        {activeTab === 'tracker' && (
          <ApplicationTracker
            applications={applications}
            setApplications={setApplications}
            analyses={history}
            onOpenAnalysis={(analysisId) => {
              const item = history.find((h) => h.id === analysisId);
              if (item) {
                handleLoadHistoryItem(item);
              } else {
                setActiveTab('history');
              }
            }}
            onNewAnalysisWithJob={(jobT, jobU) => {
              setJobText(jobT);
              if (jobU) setJobUrl(jobU);
              setActiveTab('app');
            }}
          />
        )}

        {/* =========================================================================
            ONGLET 3 : ASSISTANT & GUIDE CV (OUTILS IA, STAR, MODÈLES)
           ========================================================================= */}
        {activeTab === 'cv-assistant' && (
          <CvAssistant
            currentCvText={cvText}
            currentJobText={jobText}
            onApplyToCv={(newText) => {
              setCvText(newText);
              setCvSaveSuccess("✅ CV actif mis à jour avec le texte généré !");
              setTimeout(() => setCvSaveSuccess(null), 3000);
            }}
            onNavigateToAnalyzer={() => {
              setActiveTab('app');
            }}
            onNavigateToTracker={() => {
              setActiveTab('tracker');
            }}
            apiKey={apiKey}
            hasServerKey={hasServerKey}
          />
        )}

        {/* =========================================================================
            ONGLET 4 : BASE DE DONNÉES LOCALE (PROFIL, CVS, CANDIDATURES, ANALYSES)
           ========================================================================= */}
        {activeTab === 'database' && (
          <DatabaseManager
            onLoadCvToAnalyzer={(text) => {
              setCvText(text);
              setActiveTab('app');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAnalysis={(analysisId) => {
              const item = history.find((h) => h.id === analysisId);
              if (item) {
                handleLoadHistoryItem(item);
              } else {
                setActiveTab('history');
              }
            }}
            onNavigateToTab={(tab) => {
              setActiveTab(tab as any);
            }}
          />
        )}

        {/* =========================================================================
            ONGLET 5 : HISTORIQUE DÉDIÉ
           ========================================================================= */}
        {activeTab === 'history' && (
          <div className="w-full bg-white rounded-xl border border-gray-200 p-6 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-600" />
                  <span>Historique des analyses de candidatures</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Retrouvez et comparez vos audits passés, avec le CV, l&apos;offre d&apos;emploi et le rapport généré.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {history.length > 0 && (
                  confirmClearHistory ? (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                      <span className="text-xs text-red-700 font-semibold">Vider tout ?</span>
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        className="text-xs px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold cursor-pointer"
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearHistory(false)}
                        className="text-xs px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-bold cursor-pointer"
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearHistory(true)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Vider l&apos;historique</span>
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('app')}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#FF4B4B] text-white hover:bg-[#e03a3a] flex items-center gap-1.5 transition-colors font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Nouvelle analyse</span>
                </button>
              </div>
            </div>

            {history.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Rechercher par intitulé de poste, URL source, nom de fichier ou mot-clé..."
                  className="w-full text-xs pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#FF4B4B]"
                />
              </div>
            )}

            {history.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <History className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900">Aucune analyse enregistrée</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Dès que vous lancerez une analyse de compatibilité, elle sera automatiquement mémorisée ici
                    avec son score, le CV et l&apos;offre correspondante.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('app')}
                  className="text-xs font-semibold text-[#FF4B4B] hover:underline pt-2"
                >
                  → Commencer ma première analyse
                </button>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                Aucun résultat correspondant à votre recherche &quot;{historySearchQuery}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all flex flex-col justify-between bg-white relative group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                            {item.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {item.timestamp}
                            </span>
                            {item.fileName && (
                              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-mono">
                                📎 {item.fileName}
                              </span>
                            )}
                            {item.jobUrl && (
                              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Globe className="w-2.5 h-2.5" />
                                URL
                              </span>
                            )}
                          </div>
                        </div>

                        {item.score !== null && (
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              item.score >= 75
                                ? 'bg-emerald-600'
                                : item.score >= 50
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          >
                            {item.score}%
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-2 text-[11px] text-gray-600 space-y-1">
                        <div>
                          <span className="font-semibold text-gray-800">Offre :</span>{' '}
                          <span className="line-clamp-2">{item.jobSnippet}</span>
                        </div>
                        {item.jobUrl && (
                          <div className="truncate text-[10px] text-blue-600">
                            <a
                              href={item.jobUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>{item.jobUrl}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleLoadHistoryItem(item)}
                        className="text-xs font-semibold text-[#FF4B4B] hover:text-[#d03232] flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Consulter & Charger</span>
                      </button>

                      {confirmDeleteHistoryId === item.id ? (
                        <div
                          className="flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shadow-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-red-700 font-bold">Supprimer ?</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Oui
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteHistoryId(null);
                            }}
                            className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteHistoryId(item.id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                          title="Supprimer cette entrée"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ONGLET : PARAMÉTRAGE & PROFIL UTILISATEUR
           ========================================================================= */}
        {activeTab === 'settings' && (
          <SettingsAndProfile
            apiKey={apiKey}
            setApiKey={setApiKey}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            hasServerKey={hasServerKey}
            onInjectProfileToCv={handleInjectProfileToCv}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
            dbStats={dbStats}
            onRefreshDbStats={async () => {
              const stats = await localDbClient.fetchStats();
              setDbStats(stats);
            }}
            savedCvs={savedCvs}
            onProfileUpdated={(updated) => setUserProfile(updated)}
          />
        )}

        {/* =========================================================================
            ONGLET 3 : CODE PYTHON (APP.PY ET REQUIREMENTS.TXT)
           ========================================================================= */}
        {activeTab === 'code' && (
          <div className="w-full bg-white rounded-xl border border-gray-200 p-6 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-emerald-600" />
                  <span>Code source Python : app.py & requirements.txt</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Script Streamlit complet incluant l&apos;upload PDF/DOCX, le scraping d&apos;URL et l&apos;historique de session.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(PYTHON_APP_CODE, 'python_code')}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 flex items-center gap-1.5 font-medium transition-colors"
                >
                  {copiedStatus === 'python_code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      <span>Copier app.py</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => downloadFile('app.py', PYTHON_APP_CODE)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 font-medium transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger app.py</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
                <span className="font-bold">📄 app.py (Complet et prêt à l&apos;emploi)</span>
                <span>Python 3.9+ / Streamlit</span>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed border border-gray-800">
                <code>{PYTHON_APP_CODE}</code>
              </pre>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-600 font-mono">
                <span className="font-bold">📦 requirements.txt</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(REQUIREMENTS_TXT, 'req_code')}
                  className="text-xs text-[#FF4B4B] hover:underline"
                >
                  {copiedStatus === 'req_code' ? 'Copié !' : 'Copier'}
                </button>
              </div>
              <pre className="bg-gray-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-gray-800">
                <code>{REQUIREMENTS_TXT}</code>
              </pre>
            </div>
          </div>
        )}

        {/* =========================================================================
            ONGLET 4 : GUIDE DÉPLOIEMENT & ATS
           ========================================================================= */}
        {activeTab === 'guide' && (
          <div className="w-full bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Guide de démarrage & Déploiement</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Toutes les instructions pour exécuter l&apos;application sur votre machine ou en ligne gratuitement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  <span>1. Exécution locale (en 3 étapes)</span>
                </div>
                <ol className="list-decimal list-inside text-xs text-gray-700 space-y-2 leading-relaxed">
                  <li>
                    Placez <code>app.py</code> et <code>requirements.txt</code> dans un même dossier.
                  </li>
                  <li>
                    Ouvrez votre terminal et installez les dépendances :
                    <pre className="bg-gray-900 text-gray-100 p-2 rounded mt-1 font-mono text-[11px]">
                      pip install -r requirements.txt
                    </pre>
                  </li>
                  <li>
                    Lancez l&apos;application Streamlit :
                    <pre className="bg-gray-900 text-emerald-400 p-2 rounded mt-1 font-mono text-[11px]">
                      streamlit run app.py
                    </pre>
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <span>2. Déploiement gratuit sur Streamlit Cloud</span>
                </div>
                <ol className="list-decimal list-inside text-xs text-gray-700 space-y-2 leading-relaxed">
                  <li>Déposez <code>app.py</code> et <code>requirements.txt</code> sur un dépôt GitHub.</li>
                  <li>Connectez-vous sur <a href="https://share.streamlit.io" target="_blank" rel="noreferrer" className="text-blue-600 underline">share.streamlit.io</a>.</li>
                  <li>Sélectionnez votre dépôt et cliquez sur <strong>Deploy</strong>.</li>
                  <li>Votre application sera en ligne 24/7 avec une URL publique partageable !</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Modal d'optimisation intelligente et création de nouveau CV */}
      <CvOptimizationModal
        isOpen={isCvOptimizationModalOpen}
        onClose={() => setIsCvOptimizationModalOpen(false)}
        originalCvText={cvText}
        jobText={jobText}
        analysisResult={analysisResult}
        apiKey={apiKey}
        hasServerKey={hasServerKey}
        onReplaceCurrentCv={(newText) => {
          setCvText(newText);
          setCvSaveSuccess("✅ CV actif mis à jour avec la version optimisée !");
          setTimeout(() => setCvSaveSuccess(null), 3500);
        }}
        onSaveNewCvToDb={async (title, text) => {
          const now = new Date().toISOString();
          const saved = await localDbClient.saveCv({
            id: `cv-${Date.now()}`,
            title,
            targetRole: 'Optimisé',
            fileName: `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`,
            fileType: 'manual',
            rawText: text,
            isDefault: false,
            fileSize: new Blob([text]).size,
            createdAt: now,
            updatedAt: now,
          });
          const updatedList = await localDbClient.getCvs();
          setSavedCvs(updatedList);
          setSelectedCvId(saved.id);
          const updatedStats = await localDbClient.fetchStats();
          setDbStats(updatedStats);
        }}
        onNavigateToTab={(t) => setActiveTab(t as any)}
      />
    </div>
  );
}
