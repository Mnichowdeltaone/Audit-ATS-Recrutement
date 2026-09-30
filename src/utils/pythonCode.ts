// Code source Python Streamlit autonome et dépendances pour CV Move Personnel

export const PYTHON_APP_CODE = `import io
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
        texte_paragraphes = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        texte_paragraphes.append(cell.text.strip())
        texte_complet = "\\n".join(texte_paragraphes)
        if not texte_complet.strip():
            raise ValueError("Aucun texte trouvé dans ce document Word.")
        return texte_complet

    elif file_name.endswith(".txt"):
        return uploaded_file.read().decode("utf-8", errors="replace")

    else:
        raise ValueError("Format de fichier non pris en charge. Utilisez PDF, DOCX ou TXT.")

# ==============================================================================
# Récupération automatique du contenu de l'annonce via URL
# ==============================================================================
def recuperer_texte_depuis_url(url: str) -> tuple[str, str]:
    if requests is None or BeautifulSoup is None:
        raise ImportError("Installez 'requests' et 'beautifulsoup4' pour utiliser cette fonctionnalité.")

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    response = requests.get(url, headers=headers, timeout=12)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for balise in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]):
        balise.decompose()

    titre = ""
    if soup.title and soup.title.string:
        titre = soup.title.string.strip()

    texte_brut = soup.get_text(separator="\\n")
    lignes = [ligne.strip() for ligne in texte_brut.splitlines() if ligne.strip()]
    texte_nettoye = "\\n".join(lignes)

    if len(texte_nettoye) > 20000:
        texte_nettoye = texte_nettoye[:20000] + "\\n... [Contenu tronqué pour respecter la limite]"

    return titre, texte_nettoye

# ==============================================================================
# Barre latérale (Configuration API & Historique)
# ==============================================================================
with st.sidebar:
    st.header("⚙️ Configuration")
    api_key = st.text_input(
        "Clé API Google Gemini :",
        type="password",
        help="Obtenez gratuitement votre clé sur https://aistudio.google.com/app/apikey",
    )

    selected_model_name = st.selectbox(
        "Modèle IA :",
        options=["gemini-1.5-flash", "gemini-1.5-pro"],
        index=0,
    )

    if not api_key:
        st.warning("⚠️ L'application nécessite une clé API Gemini.")
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
st.title("📄 CV Move Personnel - Analyseur ATS & Offre")
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
    if not api_key:
        st.error("Veuillez renseigner votre clé API Gemini dans le menu latéral.")
    elif not texte_du_cv.strip() or not texte_de_l_offre.strip():
        st.warning("Veuillez renseigner à la fois le texte du CV et le texte de l'offre.")
    else:
        with st.spinner("Analyse approfondie en cours avec l'IA Google Gemini..."):
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(selected_model_name)
                prompt = f"""Tu es un expert senior en recrutement international et un spécialiste des systèmes de suivi des candidatures (ATS - Applicant Tracking System).
Analyse minutieusement l'adéquation entre le CV et l'offre d'emploi ci-dessous.

=== TEXTE DU CV ===
{texte_du_cv}

=== TEXTE DE L'OFFRE ===
{texte_de_l_offre}

Fournis une analyse structurée en Markdown comprenant :
- Un score global d'adéquation sur 100 (ex: 82/100) avec une justification synthétique.
- Points forts et correspondances directes (compétences, expériences, réalisations validées).
- Écarts et compétences manquantes indispensables selon l'offre.
- Optimisations concrètes recommandées pour passer les filtres ATS.
- Préparation entretien : 3 questions difficiles qu'un recruteur pourrait poser avec des pistes de réponse."""
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

export const REQUIREMENTS_TXT = `streamlit>=1.35.0
google-generativeai>=0.7.0
pypdf>=4.0.0
python-docx>=1.1.0
beautifulsoup4>=4.12.0
requests>=2.31.0
`;
