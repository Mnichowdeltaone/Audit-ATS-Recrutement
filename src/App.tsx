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
} from 'lucide-react';
import { marked } from 'marked';
import confetti from 'canvas-confetti';
import { parseCvFile, ExtractedFileResult } from './utils/fileExtractor';
import { extractProfileFromCv } from './utils/profileExtractor';
import ApplicationTracker from './components/ApplicationTracker';
import CvAssistant from './components/CvAssistant';
import DatabaseManager from './components/DatabaseManager';
import CvOptimizationModal from './components/CvOptimizationModal';
import SettingsAndProfile from './components/SettingsAndProfile';
import Sidebar from './components/Sidebar';
import InteractiveGuide from './components/InteractiveGuide';
import InteractiveTourModal from './components/InteractiveTourModal';
import VisualAnalysisModal from './components/VisualAnalysisModal';
import { parseAnalysisResult } from './utils/analysisParser';
import { SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB } from './utils/sampleData';
import { localDbClient } from './services/localDbClient';
import { ApplicationItem, SavedCv, DatabaseStats, UserProfile, EvolutionStep, AnalysisHistoryItem } from './types';
import { buildEvolutionStep, detectCvChanges } from './utils/cvEvolutionHelper';

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

  // Suivi des candidatures persistant
  const [applications, setApplications] = useState<ApplicationItem[]>(() => {
    return localDbClient.getLocalApplications();
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
        if (cvList && cvList.length > 0) {
          setSavedCvs(cvList);
          const defaultCv = cvList.find((c) => c.isDefault) || cvList[0];
          if (defaultCv) {
            setSelectedCvId(defaultCv.id);
            setCvText((prev) => (prev.trim() ? prev : defaultCv.rawText));
          }
        }
        if (appList) {
          setApplications(appList);
        }
        if (analysesList) {
          setHistory(analysesList);
        }
        if (stats) {
          setDbStats(stats);
        }
        if (profileData) {
          setUserProfile(profileData);
        }
        if (profilesList && profilesList.length > 0) {
          setUserProfiles(profilesList);
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
  const [resultView, setResultView] = useState<'raw' | 'cards'>('cards');

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
      setIsVisualModalOpen(true);
      confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });

      const score = extractScore(finalResult);
      const firstLineJob = jobText.trim().split('\n')[0].replace(/^[#*\s-]+/, '').slice(0, 50);
      const title = firstLineJob.length > 5 ? firstLineJob : "Analyse d'adéquation";

      // Calcul des étapes d'évolution (V1 -> Traitement -> V2...)
      let newSteps: EvolutionStep[] = [];
      let newVersion = 1;

      if (evolutionSteps.length > 0) {
        // C'est une ré-analyse (V2, V3...) après modifications
        const previousScore = evolutionSteps.slice().reverse().find((s) => s.score !== null)?.score ?? null;
        const lastCv = evolutionSteps.slice().reverse().find((s) => s.cvText)?.cvText || cvText;
        const diff = detectCvChanges(lastCv, cvText);
        const nextVer = (currentEvolutionVersion || 1) + 1;
        newVersion = nextVer;

        const customChanges: string[] = [];
        if (diff.addedKeywords.length > 0) {
          customChanges.push(`Mots-clés détectés : ${diff.addedKeywords.join(', ')}`);
        }
        if (diff.linesAddedCount > 0) {
          customChanges.push(`${diff.linesAddedCount} ligne(s) ajoutée(s) ou enrichie(s)`);
        }
        if (customChanges.length === 0) {
          customChanges.push('Réévaluation de conformité ATS après modifications du CV');
        }

        const newStep = buildEvolutionStep({
          version: nextVer,
          type: 're_analysis',
          title: `3. Nouvelle analyse (Version optimisée V${nextVer})`,
          cvText: cvText.trim(),
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
          title: "1. Première analyse (Audit Initial)",
          cvText: cvText.trim(),
          score,
          analysisResult: finalResult,
          summaryNote: "Audit initial de compatibilité ATS avec calcul des 5 piliers recruteur.",
        });
        newSteps = [v1Step];
        newVersion = 1;
      }

      setEvolutionSteps(newSteps);
      setCurrentEvolutionVersion(newVersion);

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
        currentVersion: newVersion,
        evolutionSteps: newSteps,
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
        userProfiles={userProfiles}
        onSelectProfile={handleSelectProfile}
        onOpenTour={() => setIsTourModalOpen(true)}
        apiKey={apiKey}
        hasServerKey={hasServerKey}
        selectedModel={selectedModel}
        applicationsCount={applications.length}
        historyCount={history.length}
        dbStats={dbStats}
        history={history}
        onLoadHistoryItem={handleLoadHistoryItem}
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
                  {activeTab === 'guide' && '💡 Mode d\'Emploi Interactif & Astuces'}
                  {(activeTab === 'settings' || activeTab === 'code') && '👤 Espace Personnel & Technique'}
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
                {activeTab === 'guide' && 'Guide pas-à-pas, simulateur ATS interactif, quiz recruteur et checklist pour réussir vos candidatures'}
                {(activeTab === 'settings' || activeTab === 'code') && 'Profil candidat, sauvegarde de la clé API Gemini, base locale et documentation technique'}
              </p>
            </div>
          </div>

          {/* Raccourcis et statut en en-tête */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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
              ONGLET 1 : APPLICATION STREAMLIT (ANALYSEUR CV & OFFRE)
             ========================================================================= */}
          {activeTab === 'app' && (
            <div className="w-full flex flex-col gap-6">
              {/* 🌟 BANDEAU D'ACCUEIL COLORÉ & FUN AVEC DÉMO ET VISITE GUIDÉE */}
              <div className="bg-linear-to-r from-purple-700 via-indigo-600 to-blue-600 rounded-3xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner shrink-0">
                    🚀
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black flex items-center gap-2">
                      <span>Prêt à propulser votre candidature vers le succès ?</span>
                    </h2>
                    <p className="text-xs text-purple-100 mt-0.5">
                      Testez en 1 clic notre exemple complet de démonstration (CV Trésorier + Offre) pour découvrir l&apos;analyseur.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0 relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setCvText(SAMPLE_DEMO_CV);
                      setJobText(SAMPLE_DEMO_JOB);
                      setSelectedCvId('');
                      confetti({ particleCount: 50, spread: 70 });
                      setCvSaveSuccess("🚀 Données d'essai (CV Trésorier + Offre) chargées en 1 clic ! Vous pouvez lancer l'analyse ci-dessous.");
                      setTimeout(() => setCvSaveSuccess(null), 4000);
                    }}
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-950 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Zap className="w-4 h-4 fill-current text-purple-900" />
                    <span>⚡ Charger Démo 1-Clic</span>
                  </button>
                </div>
              </div>

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
                  <div className="mb-2 p-2 bg-purple-50/70 border border-purple-200/90 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
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

                  {/* Synchronisation Profil <-> CV Actuel (Multi-Profils) */}
                  <div className="mb-2.5 p-2.5 bg-linear-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/90 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold text-[10px] shadow-2xs">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-gray-900 text-[11px]">Profil cible :</span>
                          <select
                            value={userProfile?.id || ''}
                            onChange={(e) => handleSelectProfile(e.target.value)}
                            className="px-2 py-0.5 bg-white border border-purple-300 rounded font-bold text-purple-900 text-[11px] shadow-2xs cursor-pointer focus:outline-none max-w-[170px] truncate"
                            title="Sélectionner le profil à afficher ou remplir"
                          >
                            {userProfiles.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.isDefault ? '⭐ ' : ''}{p.name || p.currentTitle || `${p.firstName} ${p.lastName}` || 'Profil'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-[10px] text-gray-600 truncate mt-0.5">
                          {userProfile?.firstName
                            ? `${userProfile.firstName} ${userProfile.lastName} • ${userProfile.currentTitle || 'Titre non défini'}`
                            : 'Profil non renseigné'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePopulateProfileFromCurrentCv(userProfile?.id, false)}
                        disabled={isExtractingProfile || !cvText.trim()}
                        className="px-2.5 py-1 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-md text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        title="Remplir automatiquement ce profil avec le texte du CV actuel (nom, contact, compétences, etc.)"
                      >
                        {isExtractingProfile ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-white" />
                            <span>Extraction...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>Remplir le profil avec ce CV</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePopulateProfileFromCurrentCv(undefined, true)}
                        disabled={isExtractingProfile || !cvText.trim()}
                        className="px-2 py-1 bg-white hover:bg-purple-50 border border-purple-300 text-purple-700 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                        title="Créer un nouveau profil candidat à partir de ce CV"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nouveau profil</span>
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
                  {cvText && (
                    <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setCvText('');
                          setUploadedFileInfo(null);
                        }}
                        className="text-[11px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Effacer le CV
                      </button>
                    </div>
                  )}
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
                        if (!cvText.trim() || !jobText.trim()) {
                          setErrorMessage("Veuillez d'abord coller ou importer votre CV et l'offre d'emploi pour lancer la simulation.");
                          return;
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
                  <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-emerald-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-extrabold text-sm sm:text-base">
                        Analyse complétée avec succès !
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Bascule Synthèse Visuelle / Texte brut */}
                      <div className="flex items-center bg-white border border-emerald-300 rounded-xl p-0.5 text-xs shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setResultView('cards')}
                          className={`px-3 py-1 rounded-lg transition-colors font-bold cursor-pointer ${
                            resultView === 'cards'
                              ? 'bg-emerald-600 text-white'
                              : 'text-emerald-900 hover:bg-emerald-50'
                          }`}
                        >
                          Synthèse
                        </button>
                        <button
                          type="button"
                          onClick={() => setResultView('raw')}
                          className={`px-3 py-1 rounded-lg transition-colors font-bold cursor-pointer ${
                            resultView === 'raw'
                              ? 'bg-emerald-600 text-white'
                              : 'text-emerald-900 hover:bg-emerald-50'
                          }`}
                        >
                          Texte brut
                        </button>
                      </div>

                      {/* Bouton d'accès au rapport visuel & suivi des versions */}
                      <button
                        type="button"
                        onClick={() => {
                          setVisualModalDefaultTab('report');
                          setIsVisualModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-linear-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
                        title="Ouvrir le rapport visuel complet, les graphiques et le suivi des évolutions"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Rapport Visuel & Suivi ↗</span>
                        {evolutionSteps.length > 1 && (
                          <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                            V{currentEvolutionVersion}
                          </span>
                        )}
                      </button>

                      {/* Bouton Unique : Adapter mon CV */}
                      <button
                        type="button"
                        onClick={() => setIsCvOptimizationModalOpen(true)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 font-bold shadow-xs transition-colors cursor-pointer"
                        title="Créer un nouveau CV ou modifier l'actuel en intégrant les modifications proposées par l'audit"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Adapter mon CV</span>
                      </button>

                      {/* Raccourcis discrets avec tooltips : Suivre Kanban, Copier, Télécharger */}
                      <div className="flex items-center gap-1 pl-1 border-l border-emerald-200">
                        <button
                          type="button"
                          onClick={handleAddAnalysisToTracker}
                          className="p-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Ajouter cette opportunité à mon Kanban"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(analysisResult, 'result')}
                          className="p-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Copier le rapport"
                        >
                          {copiedStatus === 'result' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadFile('rapport_cv_move_personnel.md', analysisResult)}
                          className="p-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Télécharger en fichier Markdown"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                    (() => {
                      const p = parseAnalysisResult(analysisResult, cvText, jobText);
                      return (
                        <div className="p-6 sm:p-8 space-y-7">
                          {/* 4 KPIs Clés */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                            <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl shadow-2xs">
                              <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider block">Filtres ATS</span>
                              <div className="text-2xl font-black text-indigo-950 mt-0.5">{p.kpis.atsPassProbability}%</div>
                              <span className="text-[11px] text-indigo-800 font-medium">Passage quasi-assuré</span>
                            </div>
                            <div className="p-4 bg-emerald-50/80 border border-emerald-100 rounded-2xl shadow-2xs">
                              <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider block">Mots-Clés Requis</span>
                              <div className="text-2xl font-black text-emerald-950 mt-0.5">{p.kpis.keywordMatchRate}%</div>
                              <span className="text-[11px] text-emerald-800 font-medium">Couverture forte</span>
                            </div>
                            <div className="p-4 bg-amber-50/80 border border-amber-100 rounded-2xl shadow-2xs">
                              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider block">Lecture Recruteur</span>
                              <div className="text-2xl font-black text-amber-950 mt-0.5">{p.kpis.recruiterReadTime}</div>
                              <span className="text-[11px] text-amber-800 font-medium">Attention captée</span>
                            </div>
                            <div className="p-4 bg-blue-50/80 border border-blue-100 rounded-2xl shadow-2xs">
                              <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider block">Chance d&apos;Entretien</span>
                              <div className="text-2xl font-black text-blue-950 mt-0.5">{p.kpis.interviewChance}%</div>
                              <span className="text-[11px] text-blue-800 font-medium">Forte probabilité</span>
                            </div>
                          </div>

                          {/* Graphique des 5 Axes */}
                          <div className="bg-gray-50/90 rounded-3xl border border-gray-200 p-5 space-y-4 shadow-2xs">
                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                              <Sliders className="w-4 h-4 text-purple-600" />
                              <span>Graphique d&apos;évaluation multi-critères</span>
                            </h4>
                            <div className="space-y-3">
                              {p.axisScores.map((ax, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-gray-800">
                                    <span>{ax.axis}</span>
                                    <span className="font-black text-purple-700">{ax.score}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div
                                      className="bg-linear-to-r from-purple-600 via-indigo-600 to-emerald-500 h-2.5 rounded-full transition-all duration-700"
                                      style={{ width: `${ax.score}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Les 3 Points Forts */}
                          <div className="space-y-3">
                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Vos 3 Points Forts Majeurs Valorisés</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {p.strengths.map((s, idx) => (
                                <div key={idx} className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5 shadow-2xs">
                                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    Point Fort #{idx + 1}
                                  </span>
                                  <h5 className="font-extrabold text-xs text-gray-900">{s.title}</h5>
                                  <p className="text-xs text-gray-600 leading-relaxed font-normal">{s.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* =========================================================
                              BLOC SUIVI DES ÉVOLUTIONS DU CV & DE L'ANALYSE (ÉTAPES DE TRAITEMENT)
                             ========================================================= */}
                          <div className="bg-linear-to-r from-gray-900 via-indigo-950 to-purple-950 rounded-3xl p-6 text-white space-y-5 border border-purple-500/20 shadow-md">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                                    Parcours d&apos;Amélioration Continue
                                  </span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs font-bold text-amber-300">
                                    Version active : V{currentEvolutionVersion}
                                  </span>
                                </div>
                                <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                  <span>📈 Suivi des Évolutions du CV & de l&apos;Analyse</span>
                                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                                    {evolutionSteps.length} étape(s)
                                  </span>
                                </h4>
                                <p className="text-xs text-purple-200">
                                  Chaque étape est conservée : 1. Première analyse ➔ 2. Traitement des recommandations ➔ 3. Nouvelle analyse optimisée.
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVisualModalDefaultTab('evolution');
                                    setIsVisualModalOpen(true);
                                  }}
                                  className="text-xs text-purple-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-1.5 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                  title="Consulter l'historique complet des versions et des écarts"
                                >
                                  <History className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Détail des étapes</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Stepper horizontal visuel des étapes */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Étape 1 */}
                              <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-black text-blue-300 flex items-center gap-1.5">
                                    <span>1️⃣</span>
                                    <span>Première analyse</span>
                                  </span>
                                  <span className="bg-blue-500/30 text-blue-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    Audit Initial
                                  </span>
                                </div>
                                <div className="text-xs text-gray-300 leading-snug">
                                  Détection des lacunes, score ATS de départ et calcul des 5 piliers.
                                </div>
                              </div>

                              {/* Étape 2 */}
                              <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-black text-purple-300 flex items-center gap-1.5">
                                    <span>2️⃣</span>
                                    <span>Traitement recos</span>
                                  </span>
                                  <span className="bg-purple-500/30 text-purple-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    Optimisation CV
                                  </span>
                                </div>
                                <div className="text-xs text-gray-300 leading-snug">
                                  Intégration des mots-clés, méthodes STAR et ajustements recommandés.
                                </div>
                              </div>

                              {/* Étape 3 */}
                              <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-black text-emerald-300 flex items-center gap-1.5">
                                    <span>3️⃣</span>
                                    <span>Nouvelle analyse</span>
                                  </span>
                                  <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    Score augmenté
                                  </span>
                                </div>
                                <div className="text-xs text-gray-300 leading-snug">
                                  Calcul du gain de score (+pts) et comparatif direct avant / après.
                                </div>
                              </div>
                            </div>

                            {/* Action de re-analyse */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/10">
                              <div className="text-xs text-purple-200 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                                <span>Après avoir adapté votre CV, recalculez instantanément votre nouveau score.</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRunAnalysis(!apiKey && !hasServerKey)}
                                disabled={isLoading}
                                className="px-4 py-2 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-105 active:scale-95 shrink-0"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                <span>{isLoading ? 'Analyse en cours...' : '🔄 Re-analyser ce CV (Créer V' + (currentEvolutionVersion + 1) + ')'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
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
            userProfile={userProfile}
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
            onLoadSampleData={(sampleCv, sampleJob) => {
              setCvText(sampleCv);
              setJobText(sampleJob);
              setSelectedCvId('');
              setCvSaveSuccess("🚀 Données d'exemple (CV Trésorier + Offre) chargées avec succès !");
              setTimeout(() => setCvSaveSuccess(null), 3500);
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
        onLoadSampleData={(sampleCv, sampleJob) => {
          setCvText(sampleCv);
          setJobText(sampleJob);
          setSelectedCvId('');
          setCvSaveSuccess("🚀 Données de démonstration chargées avec succès !");
          setTimeout(() => setCvSaveSuccess(null), 3500);
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
    </div>
  );
}
