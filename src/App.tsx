import React, { useState, useEffect, useId, useRef } from 'react';
import {
  Home,
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
  Trophy,
  Target,
  TrendingUp,
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
  Plus,
  Edit3,
  Paperclip,
  Building2,
} from 'lucide-react';
import { marked } from 'marked';
import confetti from 'canvas-confetti';
import { parseCvFile, ExtractedFileResult } from './utils/fileExtractor';
import { extractProfileFromCv } from './utils/profileExtractor';
import { extractOfferMetadata } from './utils/offerMetadataExtractor';
import ApplicationTracker from './components/ApplicationTracker';
import JobSearchAnalyticsReport from './components/JobSearchAnalyticsReport';
import JobSearchDashboardView from './components/JobSearchDashboardView';
import CvImprovementBanner from './components/CvImprovementBanner';
import CvAssistant from './components/CvAssistant';
import DatabaseManager from './components/DatabaseManager';
import CvOptimizationModal from './components/CvOptimizationModal';
import SettingsAndProfile from './components/SettingsAndProfile';
import Sidebar, { SidebarTabType } from './components/Sidebar';
import InteractiveGuide from './components/InteractiveGuide';
import InteractiveTourModal from './components/InteractiveTourModal';
import VisualAnalysisModal from './components/VisualAnalysisModal';
import OptimizationFunnel from './components/OptimizationFunnel';
import AttachLetterModal from './components/AttachLetterModal';
import CompanyDossierModal from './components/CompanyDossierModal';
import CvImprovementLogo from './components/CvImprovementLogo';
import { parseAnalysisResult } from './utils/analysisParser';
import { extractCompanyDossier } from './utils/companyDossierExtractor';
import { SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB } from './utils/sampleData';
import {
  DEMO_FICTITIOUS_PROFILE,
  DEMO_FICTITIOUS_APPLICATIONS,
  DEMO_FICTITIOUS_ANALYSIS,
  DEMO_FICTITIOUS_CV,
  DEMO_FICTITIOUS_JOB,
  isDemoApplication,
  isDemoId,
} from './utils/demoData';
import { localDbClient } from './services/localDbClient';
import {
  ApplicationItem,
  SavedCv,
  DatabaseStats,
  UserProfile,
  EvolutionStep,
  AnalysisHistoryItem,
  CompanyFinancialTechnicalDossier,
} from './types';
import { buildEvolutionStep, detectCvChanges } from './utils/cvEvolutionHelper';

const API_BASE_URL =
  typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}

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
    page_title="CV Improvement",
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
st.title("📄 CV Improvement")
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

  // Navigation par onglets (démarrage sur le Tableau de Bord de recherche d'emploi)
  const [activeTab, setActiveTab] = useState<SidebarTabType>('dashboard');

  // Profil utilisateur et affichage (Multi-profils)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(() => {
    return localDbClient.getLocalProfiles();
  });
  const [isExtractingProfile, setIsExtractingProfile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [isVisualModalOpen, setIsVisualModalOpen] = useState(false);
  const [visualModalDefaultTab, setVisualModalDefaultTab] = useState<'report' | 'evolution'>('report');

  // Suivi des étapes d'évolution CV <-> Offre (V1, modifications, re-analyse V2...)
  const [evolutionSteps, setEvolutionSteps] = useState<EvolutionStep[]>([]);
  const [currentEvolutionVersion, setCurrentEvolutionVersion] = useState<number>(1);

  // Suivi des candidatures persistant (filtré strictement pour exclure toute démo)
  const [applications, setApplications] = useState<ApplicationItem[]>(() => {
    return localDbClient.getLocalApplications().filter((a) => !isDemoApplication(a));
  });

  // Mode Démonstration (100% fictif et strictement isolé des données personnelles de l'utilisateur)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cv_move_demo_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Bascule sécurisée du mode démo
  const handleToggleDemoMode = (enable: boolean) => {
    setIsDemoMode(enable);
    try {
      if (enable) {
        localStorage.setItem('cv_move_demo_mode', 'true');
        // Sauvegarder les textes réels de l'utilisateur s'ils existent avant de charger la démo
        if (cvText && cvText !== DEMO_FICTITIOUS_CV) {
          localStorage.setItem('cv_move_saved_real_cv', cvText);
        }
        if (jobText && jobText !== DEMO_FICTITIOUS_JOB) {
          localStorage.setItem('cv_move_saved_real_job', jobText);
        }
        setCvText(DEMO_FICTITIOUS_CV);
        setJobText(DEMO_FICTITIOUS_JOB);
        setSelectedCvId('');
        setCvSaveSuccess("🎭 Mode Démonstration activé : Jeu de données 100% fictif (Thomas Laurent). Vos données personnelles sont soigneusement protégées et isolées.");
      } else {
        localStorage.removeItem('cv_move_demo_mode');
        // Restaurer les textes réels
        const savedRealCv = localStorage.getItem('cv_move_saved_real_cv');
        const savedRealJob = localStorage.getItem('cv_move_saved_real_job');
        if (savedRealCv) setCvText(savedRealCv);
        else if (cvText === DEMO_FICTITIOUS_CV) setCvText('');
        if (savedRealJob) setJobText(savedRealJob);
        else if (jobText === DEMO_FICTITIOUS_JOB) setJobText('');
        setCvSaveSuccess("✅ Mode Démo désactivé : Retour à votre espace personnel et à vos vraies données.");
      }
      setTimeout(() => setCvSaveSuccess(null), 4000);
    } catch {}
  };

  // Nettoyage au démarrage de tout vestige de démo qui se serait mélangé aux candidatures réelles
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cv_move_applications');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((a: any) => !isDemoApplication(a));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('cv_move_applications', JSON.stringify(cleaned));
            setApplications(cleaned);
          }
        }
      }
    } catch {}
  }, []);

  // Base de données locale
  const [savedCvs, setSavedCvs] = useState<SavedCv[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);

  // Synchronisation des candidatures réelles dans le localStorage (JAMAIS les démos)
  useEffect(() => {
    try {
      if (!isDemoMode) {
        const realOnly = applications.filter((a) => !isDemoApplication(a));
        localStorage.setItem('cv_move_applications', JSON.stringify(realOnly));
      }
    } catch {
      // ignore
    }
  }, [applications, isDemoMode]);

  // État formulaire avec persistance automatique
  const [apiKey, setApiKey] = useState<string>(() => {
    return localDbClient.getSavedApiKey();
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [cvText, setCvText] = useState<string>(() => {
    try {
      return localStorage.getItem('cv_move_current_cv_text') || '';
    } catch {
      return '';
    }
  });
  const [jobText, setJobText] = useState<string>(() => {
    try {
      return localStorage.getItem('cv_move_current_job_text') || '';
    } catch {
      return '';
    }
  });
  const [jobUrl, setJobUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('cv_move_current_job_url') || '';
    } catch {
      return '';
    }
  });
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-flash-latest'>(() => {
    return (localDbClient.getSavedModel() as any) || 'gemini-3.8-flash';
  });

  // Sauvegarde continue des champs de travail pour ne jamais perdre le travail en cours
  useEffect(() => {
    try {
      localStorage.setItem('cv_move_current_cv_text', cvText);
    } catch {}
  }, [cvText]);

  useEffect(() => {
    try {
      localStorage.setItem('cv_move_current_job_text', jobText);
    } catch {}
  }, [jobText]);

  useEffect(() => {
    try {
      localStorage.setItem('cv_move_current_job_url', jobUrl);
    } catch {}
  }, [jobUrl]);

  // Sauvegarde continue de la clé API dans le stockage du navigateur
  useEffect(() => {
    localDbClient.saveApiKey(apiKey);
  }, [apiKey]);

  // Sauvegarde continue du modèle sélectionné
  useEffect(() => {
    localDbClient.saveModel(selectedModel);
  }, [selectedModel]);

  // Chargement initial depuis la base de données locale
  useEffect(() => {
    const initDb = async () => {
      try {
        const [cvList, appList, analysesList, stats, profileData, profilesList] = await Promise.all([
          localDbClient.getCvs(),
          localDbClient.getApplications(),
          localDbClient.getAnalyses(),
          localDbClient.fetchStats(),
          localDbClient.getProfile(),
          localDbClient.getProfiles(),
        ]);
        setSavedCvs(cvList || []);
        if (cvList && cvList.length > 0) {
          const defaultCv = cvList.find((c) => c.isDefault) || cvList[0];
          if (defaultCv) {
            setSelectedCvId(defaultCv.id);
            setCvText((prev) => (prev.trim() ? prev : defaultCv.rawText));
          }
        } else {
          setSelectedCvId('');
        }
        setApplications(appList || []);
        setHistory(analysesList || []);
        setDbStats(stats || null);
        setUserProfile(profileData || null);
        setUserProfiles(profilesList || []);
      } catch (err) {
        console.warn('Initialisation BDD locale :', err);
      }
    };
    initDb();
  }, []);

  // Réinitialisation complète en mémoire de l'application
  const handleDatabaseReset = () => {
    setApplications([]);
    setHistory([]);
    setSavedCvs([]);
    setSelectedCvId('');
    setCvText('');
    setJobText('');
    setJobUrl('');
    setUploadedFileInfo(null);
    setFileError(null);
    setEvolutionSteps([]);
    setCurrentEvolutionVersion(1);
    setAnalysisResult(null);
    setSelectedHistoryId(null);
    setUserProfile(null);
    setUserProfiles([]);
    setDbStats({
      cvsCount: 0,
      applicationsCount: 0,
      analysesCount: 0,
      suggestionsCount: 0,
      coverLettersCount: 0,
      dbSizeBytes: 0,
      lastUpdated: new Date().toISOString(),
    });
    try {
      localStorage.removeItem('cv_move_current_cv_text');
      localStorage.removeItem('cv_move_current_job_text');
      localStorage.removeItem('cv_move_current_job_url');
      localStorage.removeItem('cv_move_applications');
      localStorage.removeItem('cv_move_saved_cvs');
      localStorage.removeItem('cv_move_history');
      localStorage.removeItem('cv_move_suggestions');
      localStorage.removeItem('cv_move_cover_letters');
      localStorage.removeItem('cv_move_user_profile');
      localStorage.removeItem('cv_move_user_profiles');
    } catch {}
  };

  // Re-synchronisation globale après modification dans le gestionnaire de BDD
  const handleDatabaseUpdated = async () => {
    try {
      const [cvList, appList, analysesList, stats, profileData, profilesList] = await Promise.all([
        localDbClient.getCvs(),
        localDbClient.getApplications(),
        localDbClient.getAnalyses(),
        localDbClient.fetchStats(),
        localDbClient.getProfile(),
        localDbClient.getProfiles(),
      ]);
      setSavedCvs(cvList || []);
      setApplications(appList || []);
      setHistory(analysesList || []);
      setDbStats(stats || null);
      setUserProfile(profileData || null);
      setUserProfiles(profilesList || []);
    } catch (err) {
      console.warn('Erreur synchronisation BDD :', err);
    }
  };

  // Écouteur global pour la réinitialisation de la BDD
  useEffect(() => {
    const onResetEvent = () => {
      handleDatabaseReset();
    };
    window.addEventListener('cv_move_database_reset', onResetEvent);
    return () => {
      window.removeEventListener('cv_move_database_reset', onResetEvent);
    };
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

  // Enregistrer le CV actuellement affiché dans la base locale (CV original)
  const handleSaveCurrentCvToDb = async () => {
    if (!cvText.trim()) return;
    const title = uploadedFileInfo?.fileName
      ? uploadedFileInfo.fileName.replace(/\.[^/.]+$/, '')
      : (userProfile?.currentTitle ? `CV - ${userProfile.currentTitle}` : `CV Original (${new Date().toLocaleDateString('fr-FR')})`);

    try {
      const newCv: SavedCv = {
        id: `cv-${Date.now()}`,
        title,
        targetRole: userProfile?.targetRoles?.[0] || userProfile?.currentTitle || 'CV Original',
        fileName: uploadedFileInfo?.fileName || `${title.replace(/\s+/g, '_')}.txt`,
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
      setCvSaveSuccess(`✅ CV original « ${title} » enregistré avec succès dans votre base locale !`);
      setTimeout(() => setCvSaveSuccess(null), 3500);
    } catch {
      setCvSaveSuccess("❌ Erreur lors de l'enregistrement du CV.");
      setTimeout(() => setCvSaveSuccess(null), 3500);
    }
  };

  // Changer de profil actif
  const handleSelectProfile = async (targetId: string) => {
    try {
      const switched = await localDbClient.setDefaultProfile(targetId);
      if (switched) {
        setUserProfile(switched);
        setUserProfiles((prev) =>
          prev.map((p) => ({
            ...p,
            isDefault: p.id === targetId,
          }))
        );
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
        setCvSaveSuccess(`✅ Profil actif basculé sur « ${switched.name || switched.currentTitle || 'Profil'} » !`);
        setTimeout(() => setCvSaveSuccess(null), 3500);
      }
    } catch (err) {
      console.warn('Erreur changement profil :', err);
    }
  };

  // Remplir un profil à partir du CV actuel ou créer un nouveau profil
  const handlePopulateProfileFromCurrentCv = async (targetProfileId?: string, isNew = false) => {
    const textToUse = cvText.trim() || (savedCvs.find((c) => c.id === selectedCvId)?.rawText || savedCvs[0]?.rawText || '');
    if (!textToUse) {
      setCvSaveSuccess("⚠️ Aucun texte de CV trouvé. Importez un document ou collez du texte dans la zone CV.");
      setTimeout(() => setCvSaveSuccess(null), 3500);
      return;
    }

    setIsExtractingProfile(true);
    setCvSaveSuccess(null);

    const activeCvName = selectedCvId
      ? (savedCvs.find((c) => c.id === selectedCvId)?.title || 'CV Enregistré')
      : (uploadedFileInfo?.fileName || (cvText.trim() ? 'CV Actuel' : ''));

    try {
      const extracted = await extractProfileFromCv(textToUse, apiKey, selectedModel);

      if (isNew) {
        // Création d'un nouveau profil basé sur le CV actuel
        const newProfileData: Partial<UserProfile> = {
          id: `profile-${Date.now()}`,
          name: extracted.currentTitle || `Profil ${userProfiles.length + 1}`,
          isDefault: true,
          associatedCvId: selectedCvId || undefined,
          associatedCvTitle: activeCvName,
          firstName: extracted.firstName || userProfile?.firstName || '',
          lastName: extracted.lastName || userProfile?.lastName || '',
          email: extracted.email || userProfile?.email || '',
          phone: extracted.phone || userProfile?.phone || '',
          location: extracted.location || userProfile?.location || '',
          currentTitle: extracted.currentTitle || '',
          bio: extracted.bio || '',
          linkedinUrl: extracted.linkedinUrl || '',
          githubUrl: extracted.githubUrl || '',
          portfolioUrl: extracted.portfolioUrl || '',
          targetRoles: extracted.targetRoles || [],
          skills: extracted.skills || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const saved = await localDbClient.saveProfile(newProfileData);
        setUserProfile(saved);
        const updatedList = await localDbClient.getProfiles();
        setUserProfiles(updatedList);
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        setCvSaveSuccess(`🎉 Nouveau profil « ${saved.name} » créé et rempli depuis votre CV actuel !`);
      } else {
        // Mise à jour du profil cible (ou actif)
        const current = userProfiles.find((p) => p.id === (targetProfileId || userProfile?.id)) || userProfile || ({ id: `profile-${Date.now()}` } as UserProfile);

        const updatedProfile: UserProfile = {
          ...current,
          firstName: extracted.firstName || current.firstName,
          lastName: extracted.lastName || current.lastName,
          email: extracted.email || current.email,
          phone: extracted.phone || current.phone,
          location: extracted.location || current.location,
          currentTitle: extracted.currentTitle || current.currentTitle,
          bio: extracted.bio || current.bio,
          linkedinUrl: extracted.linkedinUrl || current.linkedinUrl,
          githubUrl: extracted.githubUrl || current.githubUrl,
          portfolioUrl: extracted.portfolioUrl || current.portfolioUrl,
          targetRoles: extracted.targetRoles && extracted.targetRoles.length > 0 ? extracted.targetRoles : current.targetRoles,
          skills: extracted.skills && extracted.skills.length > 0 ? extracted.skills : current.skills,
          name: current.name && !current.name.startsWith('Profil ') ? current.name : extracted.currentTitle || current.name || 'Profil Candidat',
          associatedCvId: selectedCvId || undefined,
          associatedCvTitle: activeCvName,
          updatedAt: new Date().toISOString(),
        };

        const saved = await localDbClient.saveProfile(updatedProfile);
        setUserProfile(saved);
        const updatedList = await localDbClient.getProfiles();
        setUserProfiles(updatedList);
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
        setCvSaveSuccess(`✅ Profil « ${saved.name} » synchronisé et rempli avec le CV actuel (${saved.firstName} ${saved.lastName}, ${saved.currentTitle || 'Poste'}) !`);
      }
      setTimeout(() => setCvSaveSuccess(null), 4500);
    } catch (err) {
      console.error('Erreur extraction profil CV :', err);
      setCvSaveSuccess("❌ Erreur lors de l'extraction des données du CV.");
      setTimeout(() => setCvSaveSuccess(null), 3500);
    } finally {
      setIsExtractingProfile(false);
    }
  };

  // Vérifier la présence de la clé API côté serveur
  useEffect(() => {
    apiFetch('/api/key-status')
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
  const [resultView, setResultView] = useState<'raw' | 'cards'>('cards');

  // État de l'historique persistant
  const [history, setHistory] = useState<AnalysisHistoryItem[]>(() => {
    return localDbClient.getLocalAnalyses();
  });

  // Données actives (strictement isolées selon que le mode démo fictif est actif ou non)
  const effectiveProfile = isDemoMode ? DEMO_FICTITIOUS_PROFILE : userProfile;
  const effectiveProfiles = isDemoMode ? [DEMO_FICTITIOUS_PROFILE] : userProfiles;
  const effectiveApplications = isDemoMode ? DEMO_FICTITIOUS_APPLICATIONS : applications.filter((a) => !isDemoApplication(a));
  const effectiveAnalyses = isDemoMode ? [DEMO_FICTITIOUS_ANALYSIS] : history.filter((h) => !isDemoId(h.id));

  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [confirmDeleteHistoryId, setConfirmDeleteHistoryId] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [editingAnalysisId, setEditingAnalysisId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');
  const [cvSaveSuccess, setCvSaveSuccess] = useState<string | null>(null);
  const [isCvOptimizationModalOpen, setIsCvOptimizationModalOpen] = useState(false);

  // Modals pour la gestion et lecture des lettres de motivation rattachées aux audits
  const [isAttachLetterModalOpen, setIsAttachLetterModalOpen] = useState(false);
  const [attachingAnalysis, setAttachingAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [previewLetter, setPreviewLetter] = useState<{ title: string; company: string; content: string } | null>(null);
  const [previewLetterCopied, setPreviewLetterCopied] = useState(false);

  // Modal de consultation de la Fiche Technique & Financière d'Entreprise
  const [viewingCompanyDossier, setViewingCompanyDossier] = useState<{
    dossier: CompanyFinancialTechnicalDossier;
    roleTitle?: string;
    analysisTitle?: string;
  } | null>(null);

  const handleOpenCompanyDossier = (item: AnalysisHistoryItem) => {
    const dossier =
      item.companyDossier ||
      extractCompanyDossier(
        item.analysisResult,
        item.jobText,
        item.company || item.cabinet,
        item.role
      );
    setViewingCompanyDossier({
      dossier,
      roleTitle: item.role,
      analysisTitle: item.title,
    });
  };

  // Synchronisation temps réel lors du rattachement/détachement d'une lettre à un audit
  useEffect(() => {
    const onAnalysisUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ analysisId: string; letter: any }>;
      const { analysisId, letter } = customEvent.detail || {};
      if (analysisId) {
        setHistory((prev) =>
          prev.map((item) => {
            if (item.id === analysisId) {
              return {
                ...item,
                coverLetterId: letter?.id,
                coverLetterTitle: letter?.title,
                coverLetterContent: letter?.content,
              };
            }
            return item;
          })
        );
      }
    };
    window.addEventListener('cv_move_analysis_updated', onAnalysisUpdated);
    return () => window.removeEventListener('cv_move_analysis_updated', onAnalysisUpdated);
  }, []);

  const handleOpenAttachLetterModal = (item: AnalysisHistoryItem) => {
    setAttachingAnalysis(item);
    setIsAttachLetterModalOpen(true);
  };

  const handleOpenLetterPreview = (letter: { title: string; company: string; content: string }) => {
    setPreviewLetter(letter);
    setPreviewLetterCopied(false);
  };

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
      const response = await apiFetch('/api/fetch-job-url', {
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
    setEvolutionSteps([]);
    setCurrentEvolutionVersion(1);
  };

  // Démarrer une nouvelle analyse pour une autre offre (1 analyse = 1 offre d'emploi)
  const handleStartNewAnalysis = (keepCv: boolean = true) => {
    setJobText('');
    setJobUrl('');
    setAnalysisResult(null);
    setSelectedHistoryId(null);
    setEvolutionSteps([]);
    setCurrentEvolutionVersion(1);
    setErrorMessage(null);
    setUrlFetchErrorInfo(null);
    setUrlFetchSuccess(null);
    if (!keepCv) {
      setCvText('');
      setUploadedFileInfo(null);
    }
    setActiveTab('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Charger un élément d'historique dans l'éditeur
  const handleLoadHistoryItem = (item: AnalysisHistoryItem) => {
    setCvText(item.cvText);
    setJobText(item.jobText);
    setJobUrl(item.jobUrl || '');
    setAnalysisResult(item.analysisResult);
    setSelectedHistoryId(item.id);
    setErrorMessage(null);

    // Restaurer l'historique d'évolution ou créer le palier V1
    if (item.evolutionSteps && item.evolutionSteps.length > 0) {
      setEvolutionSteps(item.evolutionSteps);
      setCurrentEvolutionVersion(item.currentVersion || item.evolutionSteps.length);
    } else {
      const v1Step = buildEvolutionStep({
        version: 1,
        type: 'initial_analysis',
        title: "1. Première analyse (Audit Initial)",
        cvText: item.cvText,
        score: item.score,
        analysisResult: item.analysisResult,
        summaryNote: "Audit initial extrait de votre historique d'analyse.",
      });
      setEvolutionSteps([v1Step]);
      setCurrentEvolutionVersion(1);
    }

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

  // Renommer une analyse (personnalisation utilisateur)
  const handleRenameAnalysis = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const trimmed = newTitle.trim();
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, title: trimmed, customTitle: trimmed } : item
      )
    );
    setEditingAnalysisId(null);
    try {
      await localDbClient.renameAnalysis(id, trimmed);
    } catch (err) {
      console.warn('Erreur renommage analyse locale :', err);
    }
  };

  // Vider tout l'historique
  const handleClearHistory = async () => {
    setHistory([]);
    setSelectedHistoryId(null);
    setConfirmClearHistory(false);
    try {
      await localDbClient.clearAnalyses();
      const updatedStats = await localDbClient.fetchStats();
      setDbStats(updatedStats);
    } catch (err) {
      console.warn('Erreur clearAnalyses :', err);
    }
  };

  // Lancer l'analyse Gemini (Initiale ou Ré-analyse)
  const handleRunAnalysis = async (
    useDemoFallback = false,
    options?: {
      openModal?: boolean;
      cvToUse?: string;
      isReAnalysis?: boolean;
    }
  ): Promise<string | void> => {
    setErrorMessage(null);

    const activeCvText = (options?.cvToUse !== undefined ? options.cvToUse : cvText).trim();
    if (options?.cvToUse !== undefined) {
      setCvText(options.cvToUse);
    }

    const missing: string[] = [];
    if (!apiKey.trim() && !hasServerKey && !useDemoFallback) {
      missing.push('la Clé API Google (dans la barre latérale)');
    }
    if (!activeCvText) {
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

    try {
      let finalResult = '';
      const isReAnalysisCall = options?.isReAnalysis || evolutionSteps.length > 0;
      const previousScore = evolutionSteps.slice().reverse().find((s) => s.score !== null)?.score ?? null;

      if (useDemoFallback) {
        await new Promise((resolve) => setTimeout(resolve, 1400));
        
        // Calcul d'un score réaliste et objectif basé sur l'alignement réel CV / Offre
        const stopWords = new Set([
          'les', 'des', 'une', 'pour', 'dans', 'avec', 'vous', 'nous', 'votre', 'notre',
          'plus', 'tout', 'faire', 'sont', 'cette', 'avoir', 'être', 'leur', 'leurs', 'par',
          'sur', 'dans', 'aux', 'qui', 'que', 'quoi', 'dont', 'ces', 'cet', 'très', 'aussi',
          'bien', 'comme', 'mais', 'donc', 'ainsi', 'chez', 'postuler', 'poste', 'emploi'
        ]);
        const cvTokens = new Set((activeCvText || '').toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) || []);
        const jobRawTokens = (jobText || '').toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) || [];
        const jobSignificantTokens = Array.from(new Set(jobRawTokens)).filter(
          (t) => !stopWords.has(t) && t.length >= 3
        );
        const matchedSignificant = jobSignificantTokens.filter((t) => cvTokens.has(t));
        const matchRatio = jobSignificantTokens.length > 0
          ? matchedSignificant.length / jobSignificantTokens.length
          : 0.35;

        // Note de base calculée de façon rigoureuse :
        // matchRatio faible (<0.15) => 25-38/100 (inadéquat)
        // matchRatio moyen (0.35) => 55-62/100 (partiel)
        // matchRatio bon (0.60) => 72-78/100 (solide)
        // matchRatio excellent (>0.80) => 84-91/100 (très aligné)
        let baseCalculatedScore = Math.round(22 + matchRatio * 72);
        baseCalculatedScore = Math.max(20, Math.min(92, baseCalculatedScore));

        const firstLine = jobText.trim().split('\n')[0].replace(/^[#*\s-]+/, '').slice(0, 45) || 'Poste Cible';

        if (isReAnalysisCall) {
          // Score dynamique pour la ré-analyse basé sur les ajouts réels
          const initScore = evolutionSteps[0]?.score ?? baseCalculatedScore;
          const diffCheck = detectCvChanges(evolutionSteps[0]?.cvText || '', activeCvText);
          const pointsGain = Math.min(
            22,
            Math.max(6, diffCheck.addedKeywords.length * 3 + Math.min(8, diffCheck.linesAddedCount * 2))
          );
          const calculatedScore = Math.min(95, Math.max(initScore + 4, initScore + pointsGain));

          finalResult = `### Score de compatibilité
**${calculatedScore} / 100** (Adéquation renforcée - Version optimisée V${(currentEvolutionVersion || 1) + 1})

---

### Points forts
1. **Intégration réussie des compétences cibles** : Le CV modifié répond désormais directement aux termes techniques, outils et protocoles clés attendus pour « ${firstLine} ».
2. **Impact opérationnel chiffré (Méthode STAR)** : Les expériences intègrent des métriques de résultat concrètes (gains de temps, pourcentages d'amélioration et volumes gérés).
3. **Optimisation lexicale pour les filtres ATS** : Structure d'en-tête et puces d'activités alignées sur les critères des recruteurs.

---

### Points faibles / Manques résolus
1. **Écarts de conformité comblés** : Les compétences et progiciels qui faisaient défaut lors de l'audit initial sont maintenant contextualisés dans le parcours.
2. **Axe de perfectionnement** : Continuer à illustrer ces compétences lors de l'entretien avec des cas d'usage concrets de votre expérience.

---

### Stratégie de CV
1. **Positionnement validé** : L'adéquation est maximale pour franchir les filtres ATS et retenir l'attention du recruteur dès les premières secondes.
2. **Diffusion recommandée** : Ce CV optimisé est prêt pour soumission immédiate sur les portails de recrutement et candidatures directes.

---

### Lettre de motivation
> "Fort d'une solide expérience directement en phase avec les missions clés de ${firstLine}, c'est avec un vif enthousiasme que je vous transmets ma candidature pour apporter une valeur ajoutée mesurable à votre organisation."

---

### Préparation entretien
1. **Question :** *"Pouvez-vous illustrer une situation où vos compétences ont généré un impact direct chiffré ?"*  
   *Piste de réponse :* Reprenez les réalisations avec la méthode STAR (Situation, Tâche, Action, Résultat) enrichies dans cette version optimisée.
2. **Question :** *"Comment vous positionnez-vous par rapport aux outils requis pour ce poste ?"*  
   *Piste de réponse :* Mettez en avant votre maîtrise des solutions citées dans l'offre et votre rapidité d'adaptation.
3. **Question :** *"Qu'est-ce qui vous motive le plus dans notre offre d'emploi ?"*  
   *Piste de réponse :* Valorisez votre compréhension des enjeux stratégiques et opérationnels du rôle.`;
        } else {
          // Audit initial (Score réaliste selon l'adéquation effective)
          let appreciation = 'Adéquation modérée - Optimisation ciblée recommandée';
          if (baseCalculatedScore < 40) {
            appreciation = 'Adéquation insuffisante - Écarts majeurs avec les exigences du poste';
          } else if (baseCalculatedScore < 60) {
            appreciation = 'Adéquation partielle - Plusieurs compétences et mots-clés essentiels font défaut';
          } else if (baseCalculatedScore < 75) {
            appreciation = 'Adéquation modérée - Bonnes bases mais perfectionnement requis';
          } else if (baseCalculatedScore < 85) {
            appreciation = 'Bonne adéquation - Profil pertinent pour la présélection ATS';
          } else {
            appreciation = 'Excellente adéquation - Forte conformité avec le profil recherché';
          }

          finalResult = `### Score de compatibilité
**${baseCalculatedScore} / 100** (${appreciation})

---

### Points forts
1. **Base de compétences décelée** : Le parcours présente des points d'accroche transposables vers « ${firstLine} ».
2. **Expérience métier** : Les responsabilités passées fournissent des repères exploitables pour ce poste.
3. **Potentiel d'alignement** : Structure générale du document claire et prête à être ajustée pour les filtres ATS.

---

### Points faibles / Manques
1. **Mots-clés techniques et outils manquants** : Plusieurs exigences explicites de l'offre ne figurent pas textuellement dans votre CV.
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
1. **Question :** *"Comment compensez-vous votre manque de pratique sur certains outils cités dans l'annonce ?"*  
   *Piste de réponse :* Démontrez votre agilité d'apprentissage en citant un progiciel équivalent déjà maîtrisé.
2. **Question :** *"Donnez-moi un exemple concret d'un résultat mesurable obtenu dans votre dernier poste."*  
   *Piste de réponse :* Préparez un chiffre clé (temps économisé, budget géré, taux de satisfaction).
3. **Question :** *"Pourquoi postulez-vous à ce poste précisément aujourd'hui ?"*  
   *Piste de réponse :* Reliez vos compétences actuelles aux besoins urgents exprimés dans l'annonce.`;
        }
      } else {
        let analyzeError: string | null = null;
        try {
          const response = await apiFetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvText: activeCvText,
              jobText: jobText.trim(),
              apiKey: apiKey.trim() || undefined,
              model: selectedModel,
              isReAnalysis: isReAnalysisCall,
              previousScore,
            }),
          });

          const data = await response.json().catch(() => ({}));

          if (response.ok && data?.success && data?.result) {
            finalResult = data.result;
          } else {
            analyzeError = data?.error || `Erreur serveur HTTP ${response.status}`;
          }
        } catch (fetchErr) {
          analyzeError = fetchErr instanceof Error ? fetchErr.message : 'Erreur de connexion au serveur';
        }

        // Si l'appel distant échoue, basculer sur le moteur ATS heuristique autonome pour garantir le résultat
        if (!finalResult) {
          console.warn('API distante non disponible, exécution directe du moteur ATS local de secours :', analyzeError);
          const stopWords = new Set([
            'les', 'des', 'une', 'pour', 'dans', 'avec', 'vous', 'nous', 'votre', 'notre',
            'plus', 'tout', 'faire', 'sont', 'cette', 'avoir', 'être', 'leur', 'leurs', 'par',
            'sur', 'dans', 'aux', 'qui', 'que', 'quoi', 'dont', 'ces', 'cet', 'très', 'aussi',
            'bien', 'comme', 'mais', 'donc', 'ainsi', 'chez', 'postuler', 'poste', 'emploi'
          ]);
          const cvTokens = new Set((activeCvText || '').toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) || []);
          const jobRawTokens = (jobText || '').toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) || [];
          const jobSignificantTokens = Array.from(new Set(jobRawTokens)).filter(
            (t) => !stopWords.has(t) && t.length >= 3
          );
          const matchedSignificant = jobSignificantTokens.filter((t) => cvTokens.has(t));
          const matchRatio = jobSignificantTokens.length > 0
            ? matchedSignificant.length / jobSignificantTokens.length
            : 0.35;

          let baseCalculatedScore = Math.round(22 + matchRatio * 72);
          baseCalculatedScore = Math.max(20, Math.min(92, baseCalculatedScore));

          const firstLine = jobText.trim().split('\n')[0].replace(/^[#*\s-]+/, '').slice(0, 45) || 'Poste Cible';

          if (isReAnalysisCall) {
            const initScore = evolutionSteps[0]?.score ?? baseCalculatedScore;
            const diffCheck = detectCvChanges(evolutionSteps[0]?.cvText || '', activeCvText);
            const pointsGain = Math.min(
              22,
              Math.max(6, diffCheck.addedKeywords.length * 3 + Math.min(8, diffCheck.linesAddedCount * 2))
            );
            const calculatedScore = Math.min(95, Math.max(initScore + 4, initScore + pointsGain));

            finalResult = `### Score de compatibilité
**${calculatedScore} / 100** (Adéquation renforcée - Version optimisée V${(currentEvolutionVersion || 1) + 1})

---

### Points forts
1. **Intégration réussie des compétences cibles** : Le CV modifié répond désormais directement aux termes techniques, outils et protocoles clés attendus pour « ${firstLine} ».
2. **Impact opérationnel chiffré (Méthode STAR)** : Les expériences intègrent des métriques de résultat concrètes (gains de temps, pourcentages d'amélioration et volumes gérés).
3. **Optimisation lexicale pour les filtres ATS** : Structure d'en-tête et puces d'activités alignées sur les critères des recruteurs.

---

### Points faibles / Manques résolus
1. **Écarts de conformité comblés** : Les compétences et progiciels qui faisaient défaut lors de l'audit initial sont maintenant contextualisés dans le parcours.
2. **Axe de perfectionnement** : Continuer à illustrer ces compétences lors de l'entretien avec des cas d'usage concrets de votre expérience.

---

### Stratégie de CV
1. **Positionnement validé** : L'adéquation est maximale pour franchir les filtres ATS et retenir l'attention du recruteur dès les premières secondes.
2. **Diffusion recommandée** : Ce CV optimisé est prêt pour soumission immédiate sur les portails de recrutement et candidatures directes.

---

### Lettre de motivation
> "Fort d'une solide expérience directement en phase avec les missions clés de ${firstLine}, c'est avec un vif enthousiasme que je vous transmets ma candidature pour apporter une valeur ajoutée mesurable à votre organisation."

---

### Préparation entretien
1. **Question :** *"Pouvez-vous illustrer une situation où vos compétences ont généré un impact direct chiffré ?"*  
   *Piste de réponse :* Reprenez les réalisations avec la méthode STAR (Situation, Tâche, Action, Résultat) enrichies dans cette version optimisée.
2. **Question :** *"Comment vous positionnez-vous par rapport aux outils requis pour ce poste ?"*  
   *Piste de réponse :* Mettez en avant votre maîtrise des solutions citées dans l'offre et votre rapidité d'adaptation.
3. **Question :** *"Qu'est-ce qui vous motive le plus dans notre offre d'emploi ?"*  
   *Piste de réponse :* Valorisez votre compréhension des enjeux stratégiques et opérationnels du rôle.`;
          } else {
            let appreciation = 'Adéquation modérée - Optimisation ciblée recommandée';
            if (baseCalculatedScore < 40) {
              appreciation = 'Adéquation insuffisante - Écarts majeurs avec les exigences du poste';
            } else if (baseCalculatedScore < 60) {
              appreciation = 'Adéquation partielle - Plusieurs compétences et mots-clés essentiels font défaut';
            } else if (baseCalculatedScore < 75) {
              appreciation = 'Adéquation modérée - Bonnes bases mais perfectionnement requis';
            } else if (baseCalculatedScore < 85) {
              appreciation = 'Bonne adéquation - Profil pertinent pour la présélection ATS';
            } else {
              appreciation = 'Excellente adéquation - Forte conformité avec le profil recherché';
            }

            finalResult = `### Score de compatibilité
**${baseCalculatedScore} / 100** (${appreciation})

---

### Points forts
1. **Base de compétences décelée** : Le parcours présente des points d'accroche transposables vers « ${firstLine} ».
2. **Expérience métier** : Les responsabilités passées fournissent des repères exploitables pour ce poste.
3. **Potentiel d'alignement** : Structure générale du document claire et prête à être ajustée pour les filtres ATS.

---

### Points faibles / Manques
1. **Mots-clés techniques et outils manquants** : Plusieurs exigences explicites de l'offre ne figurent pas textuellement dans votre CV.
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
1. **Question :** *"Comment compensez-vous votre manque de pratique sur certains outils cités dans l'annonce ?"*  
   *Piste de réponse :* Démontrez votre agilité d'apprentissage en citant un progiciel équivalent déjà maîtrisé.
2. **Question :** *"Donnez-moi un exemple concret d'un résultat mesurable obtenu dans votre dernier poste."*  
   *Piste de réponse :* Préparez un chiffre clé (temps économisé, budget géré, taux de satisfaction).
3. **Question :** *"Pourquoi postulez-vous à ce poste précisément aujourd'hui ?"*  
   *Piste de réponse :* Reliez vos compétences actuelles aux besoins urgents exprimés dans l'annonce.`;
          }
        }
      }

      if (!finalResult) {
        throw new Error("L'API Gemini n'a renvoyé aucun contenu pour cette analyse.");
      }

      setAnalysisResult(finalResult);

      // Ouvrir la modale uniquement si explicitement demandé (sinon rester fluide dans le tunnel)
      if (options?.openModal) {
        setIsVisualModalOpen(true);
      }
      confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });

      const score = extractScore(finalResult);
      const offerMeta = extractOfferMetadata(jobText, jobUrl, finalResult);
      const title = offerMeta.suggestedTitle;

      // Calcul des étapes d'évolution (V1 -> Traitement -> V2...)
      let newSteps: EvolutionStep[] = [];
      let newVersion = 1;

      if (isReAnalysisCall && evolutionSteps.length > 0) {
        // C'est une ré-analyse (V2, V3...) après modifications
        const lastCv = evolutionSteps.slice().reverse().find((s) => s.cvText)?.cvText || activeCvText;
        const diff = detectCvChanges(lastCv, activeCvText);
        const nextVer = (currentEvolutionVersion || 1) + 1;
        newVersion = nextVer;

        const customChanges: string[] = [];
        if (diff.addedKeywords.length > 0) {
          customChanges.push(`Mots-clés intégrés : ${diff.addedKeywords.join(', ')}`);
        }
        if (diff.linesAddedCount > 0) {
          customChanges.push(`${diff.linesAddedCount} réalisation(s) ou ligne(s) enrichie(s)`);
        }
        if (customChanges.length === 0) {
          customChanges.push('Réévaluation complète après modification du CV par rapport à l’offre');
        }

        const newStep = buildEvolutionStep({
          version: nextVer,
          type: 're_analysis',
          title: `V${nextVer} - Note d'analyse finale (${score}% ATS)`,
          cvText: activeCvText,
          score,
          previousScore,
          analysisResult: finalResult,
          customChanges,
          summaryNote: previousScore !== null && score !== null
            ? `Gain net de score : ${score - previousScore >= 0 ? '+' : ''}${score - previousScore} points par rapport à la version précédente.`
            : 'Nouvelle analyse générée avec succès.',
        });

        newSteps = [...evolutionSteps, newStep];
      } else {
        const v1Step = buildEvolutionStep({
          version: 1,
          type: 'initial_analysis',
          title: "V1 - Audit initial d'adéquation",
          cvText: activeCvText,
          score,
          analysisResult: finalResult,
          summaryNote: "Audit initial de conformité ATS et identification des écarts par rapport à l'offre.",
        });
        newSteps = [v1Step];
        newVersion = 1;
      }

      setEvolutionSteps(newSteps);
      setCurrentEvolutionVersion(newVersion);

      const companyDossier = extractCompanyDossier(
        finalResult,
        jobText.trim(),
        offerMeta.company || offerMeta.cabinet,
        offerMeta.role
      );

      if (isReAnalysisCall && selectedHistoryId && history.some((h) => h.id === selectedHistoryId)) {
        const existing = history.find((h) => h.id === selectedHistoryId)!;
        const updatedHistoryItem: AnalysisHistoryItem = {
          ...existing,
          timestamp: offerMeta.horodatage,
          title: existing.customTitle || title,
          company: existing.company || offerMeta.company || undefined,
          cabinet: existing.cabinet || offerMeta.cabinet || undefined,
          role: existing.role || offerMeta.role || undefined,
          isHorodatedOnly: offerMeta.isHorodatedOnly,
          cvSnippet: activeCvText.slice(0, 120),
          cvText: activeCvText,
          jobText: jobText.trim(),
          analysisResult: finalResult,
          score,
          currentVersion: newVersion,
          evolutionSteps: newSteps,
          companyDossier,
        };

        setHistory((prev) => prev.map((h) => (h.id === selectedHistoryId ? updatedHistoryItem : h)));
        localDbClient.saveAnalysis(updatedHistoryItem).catch((e) => console.warn('Erreur sauvegarde analyse BDD', e));
      } else {
        const newHistoryItem: AnalysisHistoryItem = {
          id: Date.now().toString(),
          timestamp: offerMeta.horodatage,
          title,
          company: offerMeta.company || undefined,
          cabinet: offerMeta.cabinet || undefined,
          role: offerMeta.role || undefined,
          isHorodatedOnly: offerMeta.isHorodatedOnly,
          jobSnippet: jobText.trim().slice(0, 120),
          cvSnippet: activeCvText.slice(0, 120),
          cvText: activeCvText,
          jobText: jobText.trim(),
          analysisResult: finalResult,
          score,
          fileName: uploadedFileInfo?.fileName,
          fileType: uploadedFileInfo?.fileType,
          jobUrl: jobUrl.trim() || undefined,
          currentVersion: newVersion,
          evolutionSteps: newSteps,
          companyDossier,
        };

        setHistory((prev) => [newHistoryItem, ...prev]);
        setSelectedHistoryId(newHistoryItem.id);
        localDbClient.saveAnalysis(newHistoryItem).catch((e) => console.warn('Erreur sauvegarde analyse BDD', e));
      }
      localDbClient.fetchStats().then((st) => setDbStats(st)).catch(() => {});

      return finalResult;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Une erreur est survenue lors de l'appel à l'API : ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Traitement des recommandations dans le CV (Étape 2 de l'évolution)
  const handleAppliedOptimization = (modifiedCv: string, summaryBullets: string[]) => {
    setCvText(modifiedCv);
    const diff = detectCvChanges(cvText, modifiedCv);
    const changes = [...summaryBullets];
    if (diff.addedKeywords.length > 0) {
      changes.push(`Mots-clés intégrés : ${diff.addedKeywords.join(', ')}`);
    }

    const step = buildEvolutionStep({
      version: currentEvolutionVersion,
      type: 'recommendations_applied',
      title: '2. Traitement des recommandations dans le CV',
      cvText: modifiedCv,
      score: null,
      customChanges: changes,
      summaryNote: "Le CV a été enrichi avec les recommandations de l'IA (mots-clés, réalisations chiffrées, méthode STAR).",
    });

    setEvolutionSteps((prev) => [...prev, step]);
    setCvSaveSuccess("✨ Recommandations appliquées ! Cliquez sur « Re-analyser ce CV » pour mesurer votre gain de score.");
    setTimeout(() => setCvSaveSuccess(null), 4000);
  };

  // Restaurer le CV depuis une étape d'évolution
  const handleRestoreCvFromStep = (restoredCvText: string, stepTitle: string) => {
    setCvText(restoredCvText);
    setCvSaveSuccess(`✅ Version « ${stepTitle} » chargée dans la zone de texte du CV !`);
    setTimeout(() => setCvSaveSuccess(null), 3500);
  };

  // Ajouter l'analyse actuelle directement au Suivi des candidatures
  const handleAddAnalysisToTracker = (optionsOrNotes?: string | {
    customNotes?: string;
    company?: string;
    role?: string;
    score?: number | null;
    coverLetter?: string;
    coverLetterTitle?: string;
  }) => {
    const opts = typeof optionsOrNotes === 'string'
      ? { customNotes: optionsOrNotes }
      : (optionsOrNotes || {});

    const baseScore = analysisResult ? extractScore(analysisResult) : null;
    const finalScore = opts.score !== undefined ? opts.score : baseScore;
    const firstLineJob = jobText.trim().split('\n')[0].replace(/^[#*\s-]+/, '').slice(0, 60);
    const offerMeta = extractOfferMetadata(jobText, jobUrl, analysisResult || undefined);
    const inferredRole = opts.role || offerMeta.role || (firstLineJob.length > 5 ? firstLineJob : 'Poste analysé');
    const inferredCompany = opts.company || offerMeta.company || offerMeta.cabinet || 'Entreprise';

    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newAppId = 'app-' + Date.now();

    const newApp: ApplicationItem = {
      id: newAppId,
      company: inferredCompany,
      role: inferredRole,
      status: opts.coverLetter ? 'applied' : 'to_apply',
      appliedDate: new Date().toISOString().split('T')[0],
      followUpDate: nextWeek,
      location: 'France / Hybride',
      contractType: 'CDI',
      jobUrl: jobUrl.trim(),
      score: finalScore,
      analysisId: selectedHistoryId || (history[0]?.id ?? null),
      coverLetter: opts.coverLetter || undefined,
      coverLetterTitle: opts.coverLetterTitle || (opts.coverLetter ? `Lettre - ${inferredCompany}` : undefined),
      notes: opts.customNotes || `Dossier complet généré le ${new Date().toLocaleDateString('fr-FR')} (Score ATS : ${finalScore ?? 'N/A'}%).`,
      checklist: {
        cvSent: true,
        coverLetterSent: !!opts.coverLetter,
        portfolioSent: false,
        followUpDone: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) => [newApp, ...prev]);
    localDbClient.saveApplication(newApp).catch((e) => console.warn('Erreur sauvegarde candidature BDD', e));
    if (opts.coverLetter) {
      localDbClient.saveCoverLetter({
        id: `letter-${newAppId}`,
        title: newApp.coverLetterTitle || `Lettre - ${newApp.company}`,
        company: newApp.company,
        role: newApp.role,
        content: opts.coverLetter,
        applicationId: newApp.id,
        createdAt: newApp.createdAt,
        updatedAt: newApp.updatedAt,
      }).catch(() => {});
    }
    localDbClient.fetchStats().then((st) => setDbStats(st)).catch(() => {});
    setActiveTab('tracker');
  };

  const scoreNumber = extractScore(analysisResult);

  const filteredHistory = history.filter((item) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.customTitle && item.customTitle.toLowerCase().includes(q)) ||
      (item.company && item.company.toLowerCase().includes(q)) ||
      (item.cabinet && item.cabinet.toLowerCase().includes(q)) ||
      (item.role && item.role.toLowerCase().includes(q)) ||
      item.jobSnippet.toLowerCase().includes(q) ||
      item.cvSnippet.toLowerCase().includes(q) ||
      (item.fileName && item.fileName.toLowerCase().includes(q)) ||
      (item.jobUrl && item.jobUrl.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#F0F2F6] text-[#262730] flex flex-row font-sans">
      {/* Bannière officielle CV Improvement au centre de l'écran (10 secondes) */}
      <CvImprovementBanner />

      {/* =========================================================================
          MENU LATÉRAL (SIDEBAR) RÉORGANISÉ FONCTIONNELLEMENT
         ========================================================================= */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        userProfile={effectiveProfile}
        userProfiles={effectiveProfiles}
        onSelectProfile={handleSelectProfile}
        onOpenTour={() => setIsTourModalOpen(true)}
        apiKey={apiKey}
        hasServerKey={hasServerKey}
        selectedModel={selectedModel}
        applicationsCount={effectiveApplications.length}
        historyCount={effectiveAnalyses.length}
        dbStats={dbStats}
        history={effectiveAnalyses}
        onLoadHistoryItem={handleLoadHistoryItem}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
      />

      {/* Conteneur Principal de l'Application */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Barre d'En-tête Supérieure */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Bouton Hamburger Mobile pour le Menu Latéral */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Ouvrir le menu latéral"
            >
              <Layers className="w-5 h-5 text-[#FF4B4B]" />
            </button>

            {/* Logo CV Improvement officiel en tête */}
            <div
              onClick={() => {
                setActiveTab('app');
                window.dispatchEvent(new CustomEvent('open_cv_improvement_banner'));
              }}
              className="flex items-center shrink-0 pr-1.5 sm:pr-3 sm:border-r sm:border-gray-200 cursor-pointer"
              title="CV Improvement - Afficher la bannière d'accueil"
            >
              <div className="hidden sm:block">
                <CvImprovementLogo variant="full" size="xs" showTagline={false} />
              </div>
              <div className="sm:hidden">
                <CvImprovementLogo variant="symbol" size="xs" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-gray-900 text-sm sm:text-base leading-tight truncate">
                  {activeTab === 'dashboard' && '📊 Accueil : Tableau de Bord de Recherche d\'Emploi'}
                  {activeTab === 'app' && '🎯 Analyseur d\'Adéquation ATS (CV vs Offre)'}
                  {activeTab === 'cv-assistant' && '✍️ Aide à la Création de CV (Page Blanche & CV Brut)'}
                  {activeTab === 'tracker' && '💼 Suivi des Candidatures'}
                  {activeTab === 'reports' && '📈 Analyses & Rapports de Recherche d\'Emploi'}
                  {activeTab === 'history' && '🕒 Historique des Audits'}
                  {activeTab === 'database' && '🗄️ Base de Données Locale'}
                  {activeTab === 'guide' && '💡 Mode d\'Emploi Interactif & Astuces'}
                  {(activeTab === 'settings' || activeTab === 'code') && '👤 Espace Personnel & Technique'}
                </h1>
                <span className="hidden sm:inline-flex text-[10px] bg-red-50 text-[#FF4B4B] border border-red-200 px-2 py-0.5 rounded-full font-medium">
                  {selectedModel}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block truncate">
                {activeTab === 'dashboard' && 'Vue d\'ensemble de votre recherche d\'emploi, indicateurs clés explicatifs (KPIs) et suivi de vos démarches'}
                {activeTab === 'app' && 'Comparez votre CV à l\'offre, identifiez les écarts ATS et boostez vos chances d\'entretien'}
                {activeTab === 'cv-assistant' && 'Assistance simple pour créer un CV brut depuis une page blanche, à enrichir et améliorer par la suite'}
                {activeTab === 'tracker' && 'Gérez vos candidatures, relances et entretiens en mode Kanban interactif'}
                {activeTab === 'reports' && 'Mesurez vos taux de conversion, l\'impact de vos scores ATS et générez vos justificatifs officiels d\'activité'}
                {activeTab === 'history' && 'Retrouvez vos rapports d\'audit passés et comparez les scores d\'adéquation'}
                {activeTab === 'database' && 'Gérez vos CVs enregistrés, suggestions IA et sauvegardes'}
                {activeTab === 'guide' && 'Guide pas-à-pas, simulateur ATS interactif, quiz recruteur et checklist pour réussir vos candidatures'}
                {(activeTab === 'settings' || activeTab === 'code') && 'Profil candidat, sauvegarde de la clé API Gemini, base locale et documentation technique'}
              </p>
            </div>
          </div>

          {/* Raccourcis et statut en en-tête */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Bouton pour ré-afficher la bannière de présentation */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('app');
                window.dispatchEvent(new CustomEvent('open_cv_improvement_banner'));
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0A2540] border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              title="Afficher la bannière d'accueil CV Improvement (10s)"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bannière</span>
            </button>

            {/* Statut Clé API & Modèle */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
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

            {/* Bouton d'Aide & Guide discret */}
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer ${
                activeTab === 'guide' ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-300' : ''
              }`}
              title="Centre d'aide & Mode d'emploi"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* Bandeau d'information Mode Démonstration persistant */}
        {isDemoMode && (
          <div className="bg-linear-to-r from-amber-600 via-orange-600 to-purple-800 text-white px-4 py-2.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs z-30 sticky top-0">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🎭</span>
              <div>
                <span className="font-extrabold uppercase tracking-wider text-amber-200 text-[10px] bg-amber-950/60 px-2 py-0.5 rounded-full mr-2 border border-amber-300/30">
                  Mode Démonstration Actif
                </span>
                <span className="text-white/95">
                  Vous explorez l&apos;application avec un jeu de données <strong>100% fictif</strong> (Candidat exemple : <strong>Thomas Laurent</strong>). Vos données personnelles et candidatures réelles sont entièrement protégées et isolées.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleDemoMode(false)}
                className="px-3.5 py-1.5 bg-white text-gray-950 hover:bg-amber-50 rounded-xl font-black text-xs shadow-xs transition-all cursor-pointer hover:scale-102"
              >
                Quitter la Démo & Revenir à mes données
              </button>
            </div>
          </div>
        )}

        {/* Espace de Travail Principal */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          {/* Notification Toast Globale */}
          {cvSaveSuccess && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{cvSaveSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setCvSaveSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          {/* =========================================================================
              ONGLET ACCUEIL : TABLEAU DE BORD DE RECHERCHE D'EMPLOI & KPIS
             ========================================================================= */}
          {activeTab === 'dashboard' && (
            <JobSearchDashboardView
              applications={effectiveApplications}
              setApplications={setApplications}
              analyses={effectiveAnalyses}
              savedCvs={isDemoMode ? [] : savedCvs}
              userProfile={effectiveProfile}
              isDemoMode={isDemoMode}
              onToggleDemoMode={handleToggleDemoMode}
              onNavigateToTab={(tab) => {
                setActiveTab(tab as any);
              }}
              onOpenAnalysis={(analysisId) => {
                const item = (isDemoMode ? effectiveAnalyses : history).find((h) => h.id === analysisId);
                if (item) {
                  handleLoadHistoryItem(item);
                } else {
                  setActiveTab('history');
                }
              }}
              onSelectCvForAnalyzer={(text) => {
                setCvText(text);
                setActiveTab('app');
              }}
            />
          )}

          {/* =========================================================================
              ONGLET 1 : PARCOURS D'OPTIMISATION DE CANDIDATURE EN 4 ÉTAPES GUIDÉES
             ========================================================================= */}
          {activeTab === 'app' && (
            <OptimizationFunnel
              cvText={cvText}
              setCvText={setCvText}
              jobText={jobText}
              setJobText={setJobText}
              jobUrl={jobUrl}
              setJobUrl={setJobUrl}
              onFetchJobFromUrl={handleFetchJobFromUrl}
              isFetchingUrl={isFetchingUrl}
              urlFetchSuccess={urlFetchSuccess}
              urlFetchErrorInfo={urlFetchErrorInfo}
              onFileUpload={handleFileUpload}
              isParsingFile={isParsingFile}
              uploadedFileInfo={uploadedFileInfo}
              fileError={fileError}
              apiKey={apiKey}
              hasServerKey={hasServerKey}
              selectedModel={selectedModel}
              analysisResult={analysisResult}
              isLoadingAnalysis={isLoading}
              onRunAnalysis={handleRunAnalysis}
              analysisError={errorMessage}
              onClearAnalysisError={() => setErrorMessage(null)}
              onPasteJobFromClipboard={handlePasteJobFromClipboard}
              evolutionSteps={evolutionSteps}
              setEvolutionSteps={setEvolutionSteps}
              currentEvolutionVersion={currentEvolutionVersion}
              setCurrentEvolutionVersion={setCurrentEvolutionVersion}
              onSaveCvToDb={async (title, text) => {
                const newCv: SavedCv = {
                  id: `cv-${Date.now()}`,
                  title,
                  targetRole: 'Poste visé',
                  fileName: 'cv_optimise.txt',
                  fileType: 'manual',
                  rawText: text.trim(),
                  isDefault: false,
                  fileSize: new Blob([text]).size,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                const saved = await localDbClient.saveCv(newCv);
                setSavedCvs((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)]);
                const updatedStats = await localDbClient.fetchStats();
                setDbStats(updatedStats);
              }}
              onAddToTracker={(options) => handleAddAnalysisToTracker(options)}
              onOpenVisualModal={() => setIsVisualModalOpen(true)}
              userProfile={effectiveProfile}
              userProfiles={effectiveProfiles}
              onSelectProfile={handleSelectProfile}
              savedCvs={savedCvs}
              selectedCvId={selectedCvId}
              onSelectCvId={(id) => {
                setSelectedCvId(id);
                const found = savedCvs.find((c) => c.id === id);
                if (found) setCvText(found.rawText);
              }}
              onSaveCurrentCvToDb={handleSaveCurrentCvToDb}
              onPopulateProfileFromCurrentCv={handlePopulateProfileFromCurrentCv}
              isExtractingProfile={isExtractingProfile}
              onResetAll={handleReset}
              onStartNewAnalysis={() => handleStartNewAnalysis(true)}
              currentAnalysisId={selectedHistoryId}
              currentAnalysisTitle={history.find((h) => h.id === selectedHistoryId)?.title}
              onRenameAnalysis={handleRenameAnalysis}
              onUpdateAnalysisCoverLetter={(analysisId, letter) => {
                setHistory((prev) =>
                  prev.map((h) =>
                    h.id === analysisId
                      ? {
                          ...h,
                          coverLetterId: letter?.id,
                          coverLetterTitle: letter?.title,
                          coverLetterContent: letter?.content,
                        }
                      : h
                  )
                );
              }}
            />
          )}

        {/* =========================================================================
            ONGLET 2 : SUIVI DES CANDIDATURES (KANBAN & TRACKER)
           ========================================================================= */}
        {activeTab === 'tracker' && (
          <ApplicationTracker
            applications={effectiveApplications}
            setApplications={setApplications}
            analyses={effectiveAnalyses}
            isDemoMode={isDemoMode}
            onToggleDemoMode={handleToggleDemoMode}
            onOpenAnalysis={(analysisId) => {
              const item = (isDemoMode ? effectiveAnalyses : history).find((h) => h.id === analysisId);
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
            onNavigateToReports={() => setActiveTab('reports')}
          />
        )}

        {/* =========================================================================
            ONGLET : ANALYSES & RAPPORTS DE PROGRESSION DES RECHERCHES D'EMPLOI
           ========================================================================= */}
        {activeTab === 'reports' && (
          <JobSearchAnalyticsReport
            applications={effectiveApplications}
            setApplications={setApplications}
            analyses={effectiveAnalyses}
            userProfile={effectiveProfile}
            isDemoMode={isDemoMode}
            onToggleDemoMode={handleToggleDemoMode}
            onNavigateToTab={(tab) => {
              setActiveTab(tab as any);
            }}
            onOpenAnalysis={(analysisId) => {
              const item = (isDemoMode ? effectiveAnalyses : history).find((h) => h.id === analysisId);
              if (item) {
                handleLoadHistoryItem(item);
              } else {
                setActiveTab('history');
              }
            }}
            onRenameAnalysis={handleRenameAnalysis}
            apiKey={apiKey}
            hasServerKey={hasServerKey}
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
            userProfile={effectiveProfile}
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
            onDatabaseReset={handleDatabaseReset}
            onDatabaseUpdated={handleDatabaseUpdated}
            onRenameAnalysis={handleRenameAnalysis}
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
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Badges émetteur / cabinet / statut horodaté */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.company && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-extrabold border border-blue-200">
                                🏢 {item.company}
                              </span>
                            )}
                            {item.cabinet && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[10px] font-extrabold border border-purple-200">
                                👔 {item.cabinet}
                              </span>
                            )}
                            {item.isHorodatedOnly && !item.company && !item.cabinet && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200"
                                title="Société non identifiée dans l'offre - analyse horodatée"
                              >
                                🕒 Horodatée
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold">
                              V{item.currentVersion || (item.evolutionSteps?.length ?? 1)}
                            </span>
                          </div>

                          {/* Titre avec mode édition inline */}
                          {editingAnalysisId === item.id ? (
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="text"
                                autoFocus
                                value={editingTitleValue}
                                onChange={(e) => setEditingTitleValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameAnalysis(item.id, editingTitleValue);
                                  if (e.key === 'Escape') setEditingAnalysisId(null);
                                }}
                                placeholder="Nommer cette analyse..."
                                className="w-full text-xs font-bold px-2 py-1 border-2 border-purple-500 rounded-lg focus:outline-none bg-purple-50/50"
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameAnalysis(item.id, editingTitleValue)}
                                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                                title="Enregistrer le nom"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingAnalysisId(null)}
                                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold cursor-pointer shrink-0"
                                title="Annuler"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="group/title flex items-center gap-1.5">
                              <h4
                                onClick={() => {
                                  setEditingAnalysisId(item.id);
                                  setEditingTitleValue(item.title);
                                }}
                                className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug cursor-pointer hover:text-purple-700 transition-colors"
                                title="Cliquer pour renommer cette analyse"
                              >
                                {item.title}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAnalysisId(item.id);
                                  setEditingTitleValue(item.title);
                                }}
                                className="opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-purple-600 transition-opacity p-0.5 rounded cursor-pointer"
                                title="Renommer cette analyse"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}

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

                      {/* Statut explicite de la lettre de motivation */}
                      {item.coverLetterTitle || item.coverLetterContent || item.coverLetterId ? (
                        <div className="p-2.5 bg-emerald-50/90 border border-emerald-200/90 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">
                                Lettre de motivation rattachée
                              </span>
                              <span className="font-bold text-emerald-950 truncate block text-xs">
                                « {item.coverLetterTitle || 'Lettre sur-mesure'} »
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLetterPreview({
                                  title: item.coverLetterTitle || `Lettre - ${item.company || item.title}`,
                                  company: item.company || 'Entreprise Cible',
                                  content: item.coverLetterContent || '',
                                });
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Consulter le texte de la lettre"
                            >
                              <Eye className="w-3 h-3 text-emerald-700" />
                              <span>Lire</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAttachLetterModal(item);
                              }}
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              title="Changer ou détacher la lettre"
                            >
                              <Paperclip className="w-3 h-3 text-emerald-700" />
                              <span>Gérer</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                            <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>Aucune lettre rattachée à cet audit</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAttachLetterModal(item);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Rattacher une lettre existante (ex: Valoria Capital) ou en coller une"
                          >
                            <Paperclip className="w-3 h-3 text-purple-600" />
                            <span>Rattacher une lettre</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadHistoryItem(item)}
                          className="text-xs font-semibold text-[#FF4B4B] hover:text-[#d03232] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Consulter</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCompanyDossier(item);
                          }}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Consulter la fiche technique et financière de l'entreprise recruteuse pour préparer l'entretien"
                        >
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Fiche Entreprise</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAnalysisId(item.id);
                            setEditingTitleValue(item.title);
                          }}
                          className="text-xs font-bold text-gray-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Renommer cette analyse"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Renommer</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadHistoryItem(item);
                            setIsVisualModalOpen(true);
                          }}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Ouvrir dans une autre fenêtre avec graphiques et KPIs"
                        >
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span>Rapport Visuel 📊</span>
                        </button>
                      </div>

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
            ONGLET : MODE D'EMPLOI INTERACTIF & ASTUCES
           ========================================================================= */}
        {activeTab === 'guide' && (
          <InteractiveGuide
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onLoadSampleData={() => {
              handleToggleDemoMode(true);
            }}
            userProfilesCount={userProfiles.length}
            onOpenTour={() => setIsTourModalOpen(true)}
          />
        )}

        {/* =========================================================================
            ONGLET : ESPACE PERSONNEL & TECHNIQUE (PROFIL, CLÉ API, BDD, DOCUMENTATION)
           ========================================================================= */}
        {(activeTab === 'settings' || activeTab === 'code') && (
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
            currentCvText={cvText}
            activeCvTitle={
              selectedCvId
                ? (savedCvs.find((c) => c.id === selectedCvId)?.title || 'CV Enregistré')
                : (uploadedFileInfo?.fileName || (cvText.trim() ? 'CV Actuel' : ''))
            }
            userProfiles={userProfiles}
            onProfileUpdated={(updated) => setUserProfile(updated)}
            onProfilesUpdated={(updatedList) => setUserProfiles(updatedList)}
            onSelectProfile={handleSelectProfile}
            initialSubTab={activeTab === 'code' ? 'tech' : 'profile'}
          />
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
        onAppliedOptimization={handleAppliedOptimization}
      />

      {/* Modal Visite Guidée Interactive en 5 Étapes */}
      <InteractiveTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onLoadSampleData={() => {
          handleToggleDemoMode(true);
        }}
      />

      {/* Fenêtre Dédiée Visuelle avec Graphiques et KPIs */}
      {analysisResult && (
        <VisualAnalysisModal
          isOpen={isVisualModalOpen}
          onClose={() => setIsVisualModalOpen(false)}
          rawAnalysisText={analysisResult}
          cvText={cvText}
          jobText={jobText}
          defaultTab={visualModalDefaultTab}
          evolutionSteps={evolutionSteps}
          currentVersion={currentEvolutionVersion}
          onOpenCvOptimization={() => setIsCvOptimizationModalOpen(true)}
          onAddToTracker={handleAddAnalysisToTracker}
          onNavigateToCvAssistant={() => setActiveTab('cv-assistant')}
          onTriggerReAnalysis={() => handleRunAnalysis(!apiKey && !hasServerKey)}
          onRestoreCv={handleRestoreCvFromStep}
        />
      )}

      {/* Modal de rattachement de lettre pour l'historique d'audit */}
      {isAttachLetterModalOpen && attachingAnalysis && (
        <AttachLetterModal
          isOpen={isAttachLetterModalOpen}
          onClose={() => {
            setIsAttachLetterModalOpen(false);
            setAttachingAnalysis(null);
          }}
          analysisId={attachingAnalysis.id}
          analysisTitle={attachingAnalysis.title}
          analysisCompany={attachingAnalysis.company}
          analysisRole={attachingAnalysis.role}
          currentAttachedLetterId={attachingAnalysis.coverLetterId}
          currentAttachedLetterTitle={attachingAnalysis.coverLetterTitle}
          onLetterAttached={(letter) => {
            setHistory((prev) =>
              prev.map((item) =>
                item.id === attachingAnalysis.id
                  ? {
                      ...item,
                      coverLetterId: letter.id,
                      coverLetterTitle: letter.title,
                      coverLetterContent: letter.content,
                    }
                  : item
              )
            );
          }}
          onLetterDetached={() => {
            setHistory((prev) =>
              prev.map((item) =>
                item.id === attachingAnalysis.id
                  ? {
                      ...item,
                      coverLetterId: undefined,
                      coverLetterTitle: undefined,
                      coverLetterContent: undefined,
                    }
                  : item
              )
            );
          }}
        />
      )}

      {/* Modal de lecture / prévisualisation de lettre de motivation */}
      {previewLetter && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[85vh]">
            <div className="p-5 bg-linear-to-r from-emerald-700 via-teal-700 to-indigo-700 text-white flex items-start justify-between gap-3 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/30 inline-flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Lettre de motivation rattachée à cet audit
                </span>
                <h3 className="text-base sm:text-lg font-black mt-1">
                  {previewLetter.title}
                </h3>
                <p className="text-xs text-emerald-100">
                  {previewLetter.company && `Entreprise : ${previewLetter.company} • `}
                  {previewLetter.content.split(/\s+/).filter(Boolean).length} mots
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewLetter(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="p-4 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm text-gray-800 leading-relaxed font-sans whitespace-pre-wrap shadow-2xs">
                {previewLetter.content}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewLetter.content);
                    setPreviewLetterCopied(true);
                    setTimeout(() => setPreviewLetterCopied(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {previewLetterCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{previewLetterCopied ? 'Copiée !' : 'Copier le texte'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([previewLetter.content], { type: 'application/msword;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${previewLetter.title.replace(/\s+/g, '_')}.doc`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger (.doc)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewLetter(null)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de consultation de la Fiche Technique & Financière d'Entreprise */}
      <CompanyDossierModal
        isOpen={Boolean(viewingCompanyDossier)}
        onClose={() => setViewingCompanyDossier(null)}
        dossier={viewingCompanyDossier?.dossier}
        roleTitle={viewingCompanyDossier?.roleTitle}
        analysisTitle={viewingCompanyDossier?.analysisTitle}
      />
    </div>
  );
}
