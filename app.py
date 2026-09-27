import io
import os
import re
import json
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

DB_FILE = os.path.join(os.path.dirname(__file__), "data", "local_database.json")

def charger_bdd_locale() -> dict:
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def sauvegarder_bdd_locale(donnees: dict):
    try:
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        tmp = f"{DB_FILE}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(donnees, f, ensure_ascii=False, indent=2)
        os.replace(tmp, DB_FILE)
    except Exception as e:
        st.error(f"Erreur d'écriture BDD locale : {e}")

# ==============================================================================
# Initialisation de l'état de session depuis la base de données locale
# ==============================================================================
bdd_locale = charger_bdd_locale()

if "profile" not in st.session_state:
    st.session_state["profile"] = bdd_locale.get("profile", {
        "firstName": "Alex",
        "lastName": "Martin",
        "email": "alex.martin.pro@email.fr",
        "phone": "+33 6 12 34 56 78",
        "location": "Paris / Télétravail",
        "currentTitle": "Product Owner Senior",
        "bio": "Product Owner avec 6 ans d'expérience dans les solutions SaaS.",
        "skills": ["Agile", "Scrum", "Jira", "TypeScript", "SQL"],
    })

if "cvs" not in st.session_state:
    st.session_state["cvs"] = bdd_locale.get("cvs", [])

if "analysis_history" not in st.session_state:
    st.session_state["analysis_history"] = bdd_locale.get("analyses", [])

if "applications" not in st.session_state:
    st.session_state["applications"] = bdd_locale.get("applications", [
        {
            "id": "app-1",
            "company": "Doctolib",
            "role": "Product Owner Senior - Santé Digitale",
            "status": "🎯 Entretien",
            "appliedDate": "2026-09-15",
            "followUpDate": "2026-09-25",
            "score": 88,
            "notes": "Entretien technique prévu jeudi 14h.",
        },
        {
            "id": "app-2",
            "company": "Mirakl",
            "role": "Développeur Fullstack TypeScript / Python",
            "status": "📤 Postulé",
            "appliedDate": "2026-09-21",
            "followUpDate": "2026-09-28",
            "score": 84,
            "notes": "Candidature envoyée suite à analyse ATS.",
        },
    ])

if "loaded_cv_text" not in st.session_state:
    # Charger le premier CV enregistré si disponible
    if st.session_state["cvs"]:
        st.session_state["loaded_cv_text"] = st.session_state["cvs"][0].get("rawText", "")
    else:
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
        texte_pages = [p.extract_text().strip() for p in pdf_reader.pages if p.extract_text()]
        texte_complet = "\n\n".join(texte_pages)
        if not texte_complet.strip():
            raise ValueError("Aucun texte extrait du PDF. S'il s'agit d'un scan, un OCR est nécessaire.")
        return texte_complet
    elif file_name.endswith(".docx"):
        if docx is None:
            raise ImportError("Le module 'python-docx' n'est pas installé. Lancez 'pip install python-docx'.")
        doc = docx.Document(io.BytesIO(uploaded_file.read()))
        texte_paragraphes = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        texte_paragraphes.append(cell.text.strip())
        return "\n".join(texte_paragraphes)
    elif file_name.endswith(".txt"):
        return uploaded_file.read().decode("utf-8", errors="replace")
    return ""

def recuperer_texte_depuis_url(url: str) -> dict:
    if requests is None or BeautifulSoup is None:
        raise ImportError("Les modules 'requests' ou 'beautifulsoup4' ne sont pas installés.")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    resp = requests.get(url, headers=headers, timeout=12)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for s in soup(["script", "style", "nav", "footer", "header", "form", "svg", "noscript"]):
        s.decompose()
    title = soup.find("title").get_text().strip() if soup.find("title") else "Offre d'emploi"
    body_text = soup.get_text(separator="\n", strip=True)
    body_text = re.sub(r"\n\s*\n+", "\n\n", body_text)
    return {"title": title, "text": f"{title}\n\nURL source : {url}\n\n{body_text[:15000]}"}

# ==============================================================================
# 1. Barre Latérale (Sidebar) : Configuration & BDD Locale
# ==============================================================================
with st.sidebar:
    st.header("⚙️ Configuration API")
    api_key = st.text_input(
        "Clé API Google :",
        type="password",
        placeholder="AIzaSy...",
        help="Obtenez une clé sur https://aistudio.google.com/app/apikey",
    )

    env_api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    has_env_key = bool(env_api_key and env_api_key != "MY_GEMINI_API_KEY")

    if not api_key:
        if has_env_key:
            st.info("⚡ Clé API Studio active par défaut.")
        else:
            st.warning("⚠️ Clé API requise.")
    else:
        st.success("✅ Clé API renseignée.")

    st.markdown("---")
    st.header("💾 Base de Données Locale")
    st.caption("🔒 Stockage 100% sur votre disque, aucun tracking tiers.")
    st.metric("CVs enregistrés", len(st.session_state["cvs"]))
    st.metric("Candidatures suivies", len(st.session_state["applications"]))
    st.metric("Analyses en mémoire", len(st.session_state["analysis_history"]))

effective_key = (api_key or "").strip() or env_api_key

# ==============================================================================
# 2. Zone Principale avec Onglets
# ==============================================================================
st.title("📄 CV Move Personnel")
st.markdown("**Plateforme d'audit ATS, de suivi de candidatures et de gestion de CV avec Base de Données Locale.**")

tab_analyse, tab_suivi, tab_assistant, tab_bdd, tab_historique = st.tabs([
    "📊 Analyseur CV & Offre",
    "💼 Suivi des Candidatures",
    "✨ Assistant & Guide CV",
    "💾 Base de Données Locale",
    "📚 Historique Complet",
])

# ------------------------------------------------------------------------------
# ONGLET 1 : ANALYSEUR CV & OFFRE
# ------------------------------------------------------------------------------
with tab_analyse:
    col_top_cv, col_top_job = st.columns(2)

    with col_top_cv:
        st.subheader("📎 1. Importez votre CV")
        st.markdown("Formats acceptés : `.pdf`, `.docx` et `.txt`.")
        uploaded_file = st.file_uploader(
            "Téléchargez votre document :",
            type=["pdf", "docx", "txt"],
            key="cv_uploader",
        )
        if uploaded_file is not None:
            try:
                extracted = extraire_texte_fichier(uploaded_file)
                st.session_state["loaded_cv_text"] = extracted
                st.success(f"✅ Extrait : '{uploaded_file.name}' ({len(extracted)} car.)")
            except Exception as e:
                st.error(f"❌ Erreur : {str(e)}")

        # Sélecteur de CVs enregistrés en BDD locale
        if st.session_state["cvs"]:
            cv_titles = [c.get("title", f"CV #{i+1}") for i, c in enumerate(st.session_state["cvs"])]
            selected_cv_title = st.selectbox("📂 Ou charger un CV enregistré dans votre BDD locale :", ["-- Aucun --"] + cv_titles)
            if selected_cv_title != "-- Aucun --":
                chosen = next((c for c in st.session_state["cvs"] if c.get("title") == selected_cv_title), None)
                if chosen:
                    st.session_state["loaded_cv_text"] = chosen.get("rawText", "")

    with col_top_job:
        st.subheader("🔗 2. Récupérez l'Offre via URL")
        st.markdown("Lien direct vers l'annonce :")
        url_input = st.text_input(
            "Adresse web :",
            value=st.session_state.get("loaded_job_url", ""),
            placeholder="https://...",
            key="job_url_input",
        )
        if st.button("📥 Extraire l'annonce web", key="btn_extract_url"):
            if not url_input.strip():
                st.warning("Veuillez saisir une URL.")
            else:
                try:
                    with st.spinner("Téléchargement de l'annonce..."):
                        data = recuperer_texte_depuis_url(url_input.strip())
                        st.session_state["loaded_job_text"] = data["text"]
                        st.session_state["loaded_job_url"] = url_input.strip()
                        st.success("✅ Annonce extraite !")
                except Exception as e:
                    st.error(f"❌ Erreur extraction : {str(e)}")

    st.markdown("---")
    col_cv, col_job = st.columns(2)

    with col_cv:
        st.markdown("**Texte du CV :**")
        texte_du_cv = st.text_area(
            "CV :",
            value=st.session_state.get("loaded_cv_text", ""),
            height=280,
            placeholder="Collez ici le texte du CV...",
            label_visibility="collapsed",
            key="main_cv_text",
        )
        if st.button("💾 Enregistrer ce CV dans ma BDD locale"):
            if texte_du_cv.strip():
                new_cv_item = {
                    "id": f"cv-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "title": f"CV Enregistré le {datetime.date.today().strftime('%d/%m/%Y')}",
                    "targetRole": "Général",
                    "rawText": texte_du_cv.strip(),
                    "updatedAt": datetime.datetime.now().isoformat(),
                }
                st.session_state["cvs"].append(new_cv_item)
                sauvegarder_bdd_locale({"profile": st.session_state["profile"], "cvs": st.session_state["cvs"], "applications": st.session_state["applications"], "analyses": st.session_state["analysis_history"]})
                st.success("✅ CV ajouté à votre bibliothèque locale !")

    with col_job:
        st.markdown("**Texte de l'Offre d'Emploi :**")
        texte_de_l_offre = st.text_area(
            "Offre :",
            value=st.session_state.get("loaded_job_text", ""),
            height=280,
            placeholder="Collez ici le texte de l'annonce...",
            label_visibility="collapsed",
            key="main_job_text",
        )

    bouton_analyse = st.button("🚀 Lancer l'analyse de compatibilité ATS", type="primary", use_container_width=True)

    if bouton_analyse:
        st.session_state["loaded_cv_text"] = texte_du_cv
        st.session_state["loaded_job_text"] = texte_de_l_offre

        if not effective_key or effective_key == "MY_GEMINI_API_KEY":
            st.error("❌ Clé API requise dans la barre latérale.")
        elif not texte_du_cv.strip() or not texte_de_l_offre.strip():
            st.error("❌ Le CV et l'offre d'emploi doivent tous deux être renseignés.")
        else:
            with st.spinner("⏳ Analyse par l'IA Gemini en cours..."):
                try:
                    genai.configure(api_key=effective_key)
                    prompt = f"""Tu es un expert en recrutement et en systèmes de suivi des candidatures (ATS). Voici mon CV : {texte_du_cv}. Et voici l'offre d'emploi que je vise : {texte_de_l_offre}.
Fais une analyse détaillée et renvoie la réponse au format Markdown structuré avec les éléments suivants :
- Score de compatibilité : Une note sur 100 globale.
- Points forts : 3 éléments de mon CV qui correspondent parfaitement à l'offre.
- Points faibles / Manques : Ce qui me manque par rapport à l'offre.
- Stratégie de CV : 2 conseils pratiques sur les mots-clés à ajouter ou modifier dans mon CV pour passer les filtres.
- Lettre de motivation : Une ébauche de paragraphe d'accroche ultra-personnalisé.
- Préparation entretien : 3 questions difficiles qu'un recruteur pourrait me poser en voyant mon profil pour ce poste, avec des pistes de réponse."""

                    modeles = ["gemini-3.8-flash", "gemini-flash-latest"]
                    reponse = None
                    last_err = None
                    for m in modeles:
                        try:
                            mdl = genai.GenerativeModel(m)
                            reponse = mdl.generate_content(prompt)
                            if reponse and reponse.text:
                                break
                        except Exception as e:
                            last_err = e

                    if not reponse or not reponse.text:
                        raise last_err or Exception("Échec de la réponse Gemini.")

                    st.session_state["current_result"] = reponse.text
                    titre = (texte_de_l_offre.strip().split("\n")[0])[:45]

                    nouvelle_analyse = {
                        "id": len(st.session_state["analysis_history"]) + 1,
                        "date": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
                        "titre": titre,
                        "cv": texte_du_cv,
                        "job": texte_de_l_offre,
                        "job_url": st.session_state.get("loaded_job_url", ""),
                        "result": reponse.text,
                    }
                    st.session_state["analysis_history"].insert(0, nouvelle_analyse)

                    # Sauvegarde BDD
                    sauvegarder_bdd_locale({"profile": st.session_state["profile"], "cvs": st.session_state["cvs"], "applications": st.session_state["applications"], "analyses": st.session_state["analysis_history"]})

                    st.success("✅ Analyse effectuée avec succès et enregistrée dans la BDD locale !")

                except Exception as ex:
                    st.error(f"❌ Erreur API : {str(ex)}")

    if st.session_state.get("current_result"):
        st.markdown("---")
        st.markdown("### 📊 Résultats de l'analyse")
        st.markdown(st.session_state["current_result"])

        if st.button("➕ Ajouter cette offre au Suivi des candidatures", use_container_width=True):
            st.session_state["applications"].insert(0, {
                "id": f"app-{len(st.session_state['applications']) + 1}",
                "company": "Opportunité analysée",
                "role": (st.session_state["loaded_job_text"].split("\n")[0])[:40],
                "status": "📝 À postuler",
                "appliedDate": datetime.date.today().strftime("%Y-%m-%d"),
                "followUpDate": (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
                "score": 85,
                "notes": "Ajouté depuis l'analyseur ATS.",
            })
            sauvegarder_bdd_locale({"profile": st.session_state["profile"], "cvs": st.session_state["cvs"], "applications": st.session_state["applications"], "analyses": st.session_state["analysis_history"]})
            st.success("✅ Dossier ajouté à votre Suivi et synchronisé en BDD locale !")

# ------------------------------------------------------------------------------
# ONGLET 2 : SUIVI DES CANDIDATURES
# ------------------------------------------------------------------------------
with tab_suivi:
    st.subheader("💼 Suivi des Candidatures (Persistance Locale)")

    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    total_apps = len(st.session_state["applications"])
    kpi1.metric("Total dossiers", total_apps)
    kpi2.metric("En cours", len([a for a in st.session_state["applications"] if a.get("status") in ["📤 Postulé", "applied"]]))
    kpi3.metric("Entretiens", len([a for a in st.session_state["applications"] if a.get("status") in ["🎯 Entretien", "interview"]]))
    kpi4.metric("Offres", len([a for a in st.session_state["applications"] if a.get("status") in ["🎉 Offre reçue", "offer"]]))

    st.markdown("---")

    with st.expander("➕ Ajouter manuellement une candidature"):
        with st.form("form_add_app"):
            c_ent, c_pos = st.columns(2)
            ent_val = c_ent.text_input("Entreprise :", "Google, Doctolib, etc.")
            pos_val = c_pos.text_input("Poste :", "Chef de Projet, Développeur, etc.")

            c_stat, c_rel = st.columns(2)
            stat_val = c_stat.selectbox("Statut :", ["📝 À postuler", "📤 Postulé", "⏳ En attente", "🎯 Entretien", "🎉 Offre reçue", "❌ Refusé"])
            rel_val = c_rel.date_input("Date de relance :", datetime.date.today() + datetime.timedelta(days=7))

            notes_val = st.text_area("Notes :", "")
            submitted = st.form_submit_button("Enregistrer en BDD locale")
            if submitted:
                st.session_state["applications"].insert(0, {
                    "id": f"app-{len(st.session_state['applications']) + 1}",
                    "company": ent_val,
                    "role": pos_val,
                    "status": stat_val,
                    "appliedDate": datetime.date.today().strftime("%Y-%m-%d"),
                    "followUpDate": rel_val.strftime("%Y-%m-%d"),
                    "score": None,
                    "notes": notes_val,
                })
                sauvegarder_bdd_locale({"profile": st.session_state["profile"], "cvs": st.session_state["cvs"], "applications": st.session_state["applications"], "analyses": st.session_state["analysis_history"]})
                st.success("✅ Candidature enregistrée en base locale !")
                st.rerun()

    for idx, app in enumerate(st.session_state["applications"]):
        with st.container(border=True):
            c1, c2, c3, c4 = st.columns([3, 2, 2, 1])
            c1.markdown(f"**{app.get('company', app.get('entreprise', ''))}** — {app.get('role', app.get('poste', ''))}")
            c2.markdown(f"Statut : `{app.get('status', app.get('statut', ''))}`")
            c3.markdown(f"Relance : 📅 **{app.get('followUpDate', app.get('date_relance', '-'))}**")
            if c4.button("🗑️", key=f"del_app_{idx}"):
                st.session_state["applications"].pop(idx)
                sauvegarder_bdd_locale({"profile": st.session_state["profile"], "cvs": st.session_state["cvs"], "applications": st.session_state["applications"], "analyses": st.session_state["analysis_history"]})
                st.rerun()

# ------------------------------------------------------------------------------
# ONGLET 3 : ASSISTANT & GUIDE CV
# ------------------------------------------------------------------------------
with tab_assistant:
    st.subheader("✨ Assistant d'Amélioration STAR")
    puce_input = st.text_input("Puce de CV à reformuler :", "Gestion de l'équipe et support client quotidien.")
    role_input = st.text_input("Métier visé :", "Responsable Relation Client")

    if st.button("✨ Optimiser avec l'IA", key="btn_star"):
        if not effective_key or effective_key == "MY_GEMINI_API_KEY":
            st.error("❌ Clé API requise.")
        else:
            with st.spinner("Formulation STAR en cours..."):
                try:
                    genai.configure(api_key=effective_key)
                    m = genai.GenerativeModel("gemini-3.8-flash")
                    prompt_star = f"""Tu es un coach expert en CV. Transforme la puce suivante en 3 propositions d'accomplissements percutants selon la formule STAR et Google X-Y-Z (Accompli [X], mesuré par [Y], en faisant [Z]).
Texte initial : "{puce_input}"
Rôle cible : "{role_input}"
Donne 3 variantes chiffrées avec mots-clés ATS."""
                    res = m.generate_content(prompt_star)
                    st.markdown(res.text)
                except Exception as err:
                    st.error(f"❌ Erreur : {str(err)}")

# ------------------------------------------------------------------------------
# ONGLET 4 : BASE DE DONNÉES LOCALE
# ------------------------------------------------------------------------------
with tab_bdd:
    st.subheader("💾 Base de Données Locale & Profil Personnel")
    st.caption("Gérez vos données personnelles en local : profil, CVs multiples et sauvegardes.")

    tab_p, tab_c, tab_exp = st.tabs(["👤 Mon Profil", "📁 Mes CVs", "⚙️ Export Sauvegarde"])

    with tab_p:
        with st.form("form_profile"):
            p = st.session_state["profile"]
            c_fn, c_ln = st.columns(2)
            fn = c_fn.text_input("Prénom :", p.get("firstName", ""))
            ln = c_ln.text_input("Nom :", p.get("lastName", ""))

            c_em, c_ph = st.columns(2)
            em = c_em.text_input("Email :", p.get("email", ""))
            ph = c_ph.text_input("Téléphone :", p.get("phone", ""))

            title_val = st.text_input("Titre professionnel :", p.get("currentTitle", ""))
            bio_val = st.text_area("Bio / Pitch personnel :", p.get("bio", ""))

            if st.form_submit_button("Enregistrer mon profil en BDD locale"):
                st.session_state["profile"] = {
                    "firstName": fn,
                    "lastName": ln,
                    "email": em,
                    "phone": ph,
                    "currentTitle": title_val,
                    "bio": bio_val,
                }
                sauvegarder_bdd_locale({"profile": st.session_state["profile"], "cvs": st.session_state["cvs"], "applications": st.session_state["applications"], "analyses": st.session_state["analysis_history"]})
                st.success("✅ Profil enregistré dans la base locale !")

    with tab_c:
        st.markdown(f"**{len(st.session_state['cvs'])} CV(s) enregistrés dans la base locale :**")
        for idx_cv, cv_item in enumerate(st.session_state["cvs"]):
            with st.expander(f"📄 {cv_item.get('title', 'CV')} ({cv_item.get('targetRole', '')})"):
                st.code(cv_item.get("rawText", "")[:600] + ("..." if len(cv_item.get("rawText", "")) > 600 else ""))
                col_c1, col_c2 = st.columns([4, 1])
                if col_c1.button("Injecter dans l'Analyseur", key=f"load_to_ana_{idx_cv}"):
                    st.session_state["loaded_cv_text"] = cv_item.get("rawText", "")
                    st.success("✅ CV chargé dans l'analyseur !")
                if col_c2.button("Supprimer", key=f"del_cv_{idx_cv}"):
                    st.session_state["cvs"].pop(idx_cv)
                    sauvegarder_bdd_locale({"profile": st.session_state["profile"], "cvs": st.session_state["cvs"], "applications": st.session_state["applications"], "analyses": st.session_state["analysis_history"]})
                    st.rerun()

    with tab_exp:
        st.markdown("**Exportation intégrale de votre base de données locale :**")
        bdd_actuelle = {
            "profile": st.session_state["profile"],
            "cvs": st.session_state["cvs"],
            "applications": st.session_state["applications"],
            "analyses": st.session_state["analysis_history"],
            "exportedAt": datetime.datetime.now().isoformat(),
        }
        st.download_button(
            label="💾 Télécharger la sauvegarde (.json)",
            data=json.dumps(bdd_actuelle, ensure_ascii=False, indent=2),
            file_name=f"cv_move_backup_{datetime.date.today().strftime('%Y%m%d')}.json",
            mime="application/json",
        )

# ------------------------------------------------------------------------------
# ONGLET 5 : HISTORIQUE COMPLET
# ------------------------------------------------------------------------------
with tab_historique:
    st.subheader("📚 Historique des Analyses Précédentes")
    if not st.session_state["analysis_history"]:
        st.info("Aucune analyse enregistrée pour le moment.")
    else:
        for item in st.session_state["analysis_history"]:
            with st.expander(f"#{item.get('id', '')} - {item.get('titre', item.get('title', 'Analyse'))} ({item.get('date', item.get('timestamp', ''))})"):
                st.markdown(item.get("result", item.get("analysisResult", "")))
                if st.button("Charger ce CV et cette offre", key=f"hist_load_{item.get('id', '')}"):
                    st.session_state["loaded_cv_text"] = item.get("cv", item.get("cvText", ""))
                    st.session_state["loaded_job_text"] = item.get("job", item.get("jobText", ""))
                    st.session_state["current_result"] = item.get("result", item.get("analysisResult", ""))
                    st.rerun()
