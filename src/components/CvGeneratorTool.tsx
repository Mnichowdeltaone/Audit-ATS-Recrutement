import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Download,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  FilePlus2,
  Wand2,
  Layers,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { localDbClient } from '../services/localDbClient';
import { UserProfile, SavedCv } from '../types';

const API_BASE_URL =
  typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}

interface CvGeneratorToolProps {
  currentCvText?: string;
  currentJobText?: string;
  onApplyToCv: (newText: string) => void;
  onNavigateToAnalyzer: () => void;
  apiKey?: string;
  hasServerKey?: boolean;
  userProfile?: UserProfile | null;
  initialTemplateText?: string;
  initialTargetRole?: string;
  onOpenTemplatesCatalog?: () => void;
  onOpenCoachChat?: () => void;
}

export default function CvGeneratorTool({
  currentCvText = '',
  currentJobText = '',
  onApplyToCv,
  onNavigateToAnalyzer,
  apiKey,
  hasServerKey,
  userProfile,
  initialTemplateText = '',
  initialTargetRole = '',
  onOpenTemplatesCatalog,
}: CvGeneratorToolProps) {
  // Mode de création : 'assistant' (4 questions simples) ou 'blank_page' (page blanche directe)
  const [creationMode, setCreationMode] = useState<'assistant' | 'blank_page'>('assistant');
  const [step, setStep] = useState<number>(1);

  // 1. Coordonnées simples
  const [candidateName, setCandidateName] = useState(() => {
    if (userProfile?.firstName || userProfile?.lastName) {
      return `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim();
    }
    return '';
  });

  const [contactInfo, setContactInfo] = useState(() => {
    if (userProfile) {
      const parts = [userProfile.location, userProfile.phone, userProfile.email].filter(Boolean);
      return parts.join(' | ');
    }
    return '';
  });

  // 2. Poste / Métier visé
  const [targetRole, setTargetRole] = useState(() => {
    return initialTargetRole || userProfile?.targetRoles?.[0] || userProfile?.currentTitle || '';
  });

  // 3. Vos 2 ou 3 expériences clés (Poste, Entreprise, Période, missions simples)
  const [experiences, setExperiences] = useState('');

  // 4. Compétences & Formation
  const [skills, setSkills] = useState(() => {
    return userProfile?.skills?.join(', ') || '';
  });
  const [education, setEducation] = useState('');

  // Résultat : le CV brut obtenu
  const [rawCvText, setRawCvText] = useState(initialTemplateText || currentCvText || '');
  const [isAssembling, setIsAssembling] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Actions
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Synchronisation dynamique si un modèle est injecté
  useEffect(() => {
    if (initialTemplateText) {
      setRawCvText(initialTemplateText);
      if (initialTargetRole) setTargetRole(initialTargetRole);
    }
  }, [initialTemplateText, initialTargetRole]);

  // Trame minimale vierge pour le mode page blanche directe
  const blankTemplate = `PRÉNOM NOM
${targetRole || 'INTITULÉ DU POSTE VISÉ'}
${contactInfo || 'Ville, France | 06 00 00 00 00 | prenom.nom@email.com'}

RÉSUMÉ PROFESSIONNEL
[Décrivez en 2 à 3 phrases simples votre profil, vos atouts et ce que vous recherchez...]

EXPÉRIENCES PROFESSIONNELLES
[INTITULÉ DU POSTE] | Entreprise, Ville | 2021 - Présent
- [Mission ou réalisation principale...]
- [Outils ou résultats...]

[POSTE PRÉCÉDENT] | Entreprise, Ville | 2018 - 2021
- [Mission principale...]

COMPÉTENCES CLÉS
- Compétences métier : [Listez vos savoir-faire...]
- Outils & Logiciels : [Outils informatiques maîtrisés...]

FORMATION & DIPLÔMES
- [Diplôme le plus récent] | Établissement (Année)`;

  // Assembler les 4 réponses simples en un CV brut clair
  const handleAssembleRawCv = () => {
    setIsAssembling(true);

    const nameLine = (candidateName.trim() || 'PRÉNOM NOM').toUpperCase();
    const roleLine = targetRole.trim() || 'TITRE DU POSTE VISÉ';
    const contactLine = contactInfo.trim() || 'Ville, France | 06 00 00 00 00 | email@exemple.com';

    let assembled = `${nameLine}\n${roleLine}\n${contactLine}\n\n`;

    // Résumé simple
    assembled += `RÉSUMÉ PROFESSIONNEL\nProfessionnel motivé et rigoureux dans le domaine de : ${roleLine}. Capacité démontrée à mener à bien des missions variées, à travailler en équipe et à s'adapter rapidement aux exigences du poste.\n\n`;

    // Expériences
    assembled += `EXPÉRIENCES PROFESSIONNELLES\n`;
    if (experiences.trim()) {
      assembled += `${experiences.trim()}\n\n`;
    } else {
      assembled += `${roleLine.toUpperCase()} | Entreprise | 2021 - Présent\n- Gestion opérationnelle des missions quotidiennes du poste.\n- Collaboration avec l'équipe et atteinte des objectifs fixés.\n\n`;
    }

    // Compétences
    assembled += `COMPÉTENCES CLÉS\n`;
    if (skills.trim()) {
      assembled += `${skills
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `- ${s}`)
        .join('\n')}\n\n`;
    } else {
      assembled += `- Gestion des priorités, Autonomie, Rigueur, Outils bureautiques\n\n`;
    }

    // Formation
    assembled += `FORMATION & DIPLÔMES\n`;
    if (education.trim()) {
      assembled += `${education.trim()}\n`;
    } else {
      assembled += `- Diplôme ou Titre Professionnel validé\n`;
    }

    setRawCvText(assembled);
    setIsAssembling(false);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    setNotice({
      type: 'success',
      message: '🎉 Votre CV brut est généré ! Vous pouvez le relire et passer à l’enrichissement ci-dessous.',
    });
    setTimeout(() => setNotice(null), 4000);
  };

  // Réinitialiser vers une vraie page blanche
  const handleResetToBlank = () => {
    setRawCvText('');
    setCandidateName('');
    setTargetRole('');
    setContactInfo('');
    setExperiences('');
    setSkills('');
    setEducation('');
    setStep(1);
    setNotice({
      type: 'info',
      message: 'Page blanche réinitialisée.',
    });
    setTimeout(() => setNotice(null), 2500);
  };

  // Passer à l'enrichissement dans l'Analyseur ATS (exactement ce que demande l'utilisateur)
  const handleSendToAnalyzer = () => {
    if (!rawCvText.trim()) return;
    onApplyToCv(rawCvText);
    setNotice({
      type: 'success',
      message: 'CV brut injecté dans l’Analyseur d’Adéquation ! Redirection...',
    });
    setTimeout(() => {
      onNavigateToAnalyzer();
    }, 1000);
  };

  // Enrichissement IA facultatif direct
  const handleAiEnhanceRawCv = async () => {
    if (!rawCvText.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await apiFetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize_cv',
          input: rawCvText,
          targetRole: targetRole || 'Poste visé',
          keyArguments: "Consigne d'authenticité : Zéro invention. Ne jamais fabriquer de projets ou d'exemples non réalisés. Améliorer la clarté et la force des verbes d'action sur le parcours réel.",
          apiKey: apiKey || undefined,
          demoFallback: !apiKey && !hasServerKey,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.result) {
        // Nettoyer la synthèse pour garder le CV optimisé
        const parts = data.result.split('---');
        const enhancedText = parts.length > 1 ? parts.slice(1).join('---').trim() : data.result;
        setRawCvText(enhancedText);
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        setNotice({
          type: 'success',
          message: '✨ CV enrichi avec des verbes d’action et des puces d’impact !',
        });
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (err) {
      console.warn('Erreur enrichissement:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Pré-remplir instantanément depuis le profil candidat
  const handlePreFillFromProfile = () => {
    if (!userProfile) return;
    if (userProfile.firstName || userProfile.lastName) {
      setCandidateName(`${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim());
    }
    const parts = [userProfile.location, userProfile.phone, userProfile.email].filter(Boolean);
    if (parts.length) setContactInfo(parts.join(' | '));
    if (userProfile.targetRoles?.[0] || userProfile.currentTitle) {
      setTargetRole(userProfile.targetRoles?.[0] || userProfile.currentTitle || '');
    }
    if (userProfile.skills?.length) {
      setSkills(userProfile.skills.join(', '));
    }
    setNotice({ type: 'info', message: '🪄 Informations pré-remplies depuis votre profil candidat !' });
    setTimeout(() => setNotice(null), 3000);
  };

  // Harmoniser et normaliser les titres de sections pour les ATS
  const handleHarmonizeStructure = () => {
    if (!rawCvText.trim()) return;
    let text = rawCvText;
    text = text.replace(/résumé professionnel|profil professionnel/gi, 'RÉSUMÉ PROFESSIONNEL');
    text = text.replace(/expériences professionnelles|expérience professionnelle|parcours professionnel/gi, 'EXPÉRIENCES PROFESSIONNELLES');
    text = text.replace(/compétences clés|compétences|savoir-faire/gi, 'COMPÉTENCES CLÉS');
    text = text.replace(/formations? (&|et) diplômes?|études/gi, 'FORMATION & DIPLÔMES');
    setRawCvText(text);
    setNotice({ type: 'success', message: '✨ Titres de sections normalisés pour les logiciels de recrutement !' });
    setTimeout(() => setNotice(null), 3000);
  };

  // Sauvegarder dans la base locale
  const handleSaveToDb = async () => {
    if (!rawCvText.trim()) return;
    try {
      const title = `CV Brut - ${targetRole || 'Nouveau Profil'} (${new Date().toLocaleDateString('fr-FR')})`;
      await localDbClient.saveCv({
        id: `cv-${Date.now()}`,
        title,
        targetRole: targetRole || 'Général',
        fileName: 'cv_brut.txt',
        fileType: 'manual',
        rawText: rawCvText,
        isDefault: false,
        fileSize: new Blob([rawCvText]).size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsSaved(true);
      setNotice({ type: 'success', message: '⭐ CV brut sauvegardé dans votre base locale !' });
      setTimeout(() => {
        setIsSaved(false);
        setNotice(null);
      }, 3000);
    } catch {
      // ignore
    }
  };

  // Copier
  const handleCopy = () => {
    if (!rawCvText) return;
    navigator.clipboard.writeText(rawCvText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Télécharger Word
  const handleDownloadDoc = () => {
    if (!rawCvText) return;
    const blob = new Blob([rawCvText], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CV_Brut_${(targetRole || 'Candidat').replace(/\s+/g, '_')}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Télécharger Texte
  const handleDownloadTxt = () => {
    if (!rawCvText) return;
    const blob = new Blob([rawCvText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CV_Brut_${(targetRole || 'Candidat').replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* =========================================================================
          EN-TÊTE ÉPURÉ & ACCUEILLANT : AIDE À LA CRÉATION DEPUIS UNE PAGE BLANCHE
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 shrink-0">
            <FilePlus2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#0A2540]">
                Aide à la Création de CV — Départ Page Blanche
              </h2>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                Simple & Rapide
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Posez simplement les bases de votre parcours pour obtenir un <strong>CV brut propre</strong>, que vous pourrez ensuite enrichir et adapter à vos offres cibles.
            </p>
          </div>
        </div>

        {/* Choix de la méthode : Assistant 4 questions vs Page blanche directe */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setCreationMode('assistant')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              creationMode === 'assistant'
                ? 'bg-white text-[#0A2540] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🧙‍♂️ Guide en 4 étapes
          </button>
          <button
            type="button"
            onClick={() => {
              setCreationMode('blank_page');
              if (!rawCvText.trim()) setRawCvText(blankTemplate);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              creationMode === 'blank_page'
                ? 'bg-white text-[#0A2540] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✍️ Page blanche libre
          </button>
        </div>
      </div>

      {/* Toast de notification */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice.message}</span>
        </div>
      )}

      {/* =========================================================================
          CONTENU : 2 COLONNES (SAISIE FACILE À GAUCHE / CV BRUT À DROITE)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =======================================================================
            COLONNE GAUCHE (5 colonnes) : LA SAISIE SIMPLIFIÉE
           ======================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {creationMode === 'assistant' ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
              {/* Stepper des 4 étapes simples */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-[#0A2540]">
                  Étape {step} sur 4 :{' '}
                  {step === 1 && 'Vos coordonnées'}
                  {step === 2 && 'Votre métier cible'}
                  {step === 3 && 'Vos expériences passées'}
                  {step === 4 && 'Compétences & Diplômes'}
                </span>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStep(s)}
                      className={`w-6 h-6 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                        step === s
                          ? 'bg-[#00D287] text-[#0A2540]'
                          : step > s
                          ? 'bg-[#0A2540] text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Étape 1 : Coordonnées */}
              {step === 1 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      1. Votre Nom & Prénom :
                    </label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Ex: Sophie Martin"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D287]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2. Vos coordonnées de contact :
                    </label>
                    <input
                      type="text"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder="Ex: Paris | 06 12 34 56 78 | sophie.martin@email.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D287]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Simple et direct : ville, téléphone et adresse email.
                    </p>
                  </div>

                  {userProfile && (userProfile.firstName || userProfile.email) && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handlePreFillFromProfile}
                        className="text-[11px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🪄 Pré-remplir avec mon profil ({userProfile.firstName || 'Candidat'})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Étape 2 : Poste cible */}
              {step === 2 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Quel métier ou poste visez-vous ?
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="Ex: Comptable Général, Développeur Web, Chef de Projet..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D287]"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      💡 <strong>Conseil :</strong> Indiquez un titre clair et compréhensible par tous les recruteurs.
                    </p>
                  </div>

                  {/* Suggestions rapides en 1 clic */}
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">
                      Exemples fréquents :
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {['Comptable', 'Développeur Fullstack', 'Commercial B2B', 'Chef de Projet', 'Assistant RH', 'Responsable Marketing'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setTargetRole(r)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium cursor-pointer"
                        >
                          + {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 3 : Expériences passées */}
              {step === 3 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vos 2 ou 3 expériences principales :
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Listez simplement chaque poste avec l&apos;entreprise, les dates et 2 ou 3 lignes sur ce que vous faisiez.
                    </p>
                    <textarea
                      rows={7}
                      value={experiences}
                      onChange={(e) => setExperiences(e.target.value)}
                      placeholder="Exemple :&#10;COMPTABLE | Entreprise ABC, Paris | 2021 - 2024&#10;- Gestion des écritures courantes et rapprochements bancaires&#10;- Préparation des déclarations de TVA et clôtures mensuelles&#10;&#10;AIDE COMPTABLE | Cabinet XYZ | 2018 - 2021&#10;- Saisie des factures et archivage des pièces comptables"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D287] leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Étape 4 : Compétences & Diplômes */}
              {step === 4 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vos compétences & outils principaux :
                    </label>
                    <input
                      type="text"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="Ex: Excel, SAP, Facturation, Esprit d'équipe, Anglais..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D287]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Votre diplôme ou formation :
                    </label>
                    <input
                      type="text"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="Ex: BTS Comptabilité (2018) ou Titre Professionnel"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D287]"
                    />
                  </div>
                </div>
              )}

              {/* Boutons de navigation du guide */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>

                <div className="flex items-center gap-2">
                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={() => setStep((s) => Math.min(4, s + 1))}
                      className="px-4 py-2 bg-[#0A2540] hover:bg-[#133557] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Étape suivante</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAssembleRawCv}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Générer mon CV brut ➔</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Mode Page Blanche Directe */
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[#0A2540]">
                  Page Blanche Électronique
                </h3>
                <button
                  type="button"
                  onClick={() => setRawCvText(blankTemplate)}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Insérer la trame de base
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tapez ou collez directement votre texte brut ci-dessous. Pas de formatage complexe nécessaire, restez simple et lisible.
              </p>
              <button
                type="button"
                onClick={handleResetToBlank}
                className="text-[11px] text-slate-400 hover:text-red-600 font-medium"
              >
                Effacer tout pour repartir à zéro
              </button>
            </div>
          )}

          {/* Lien facultatif vers les modèles si l'utilisateur veut s'inspirer */}
          {onOpenTemplatesCatalog && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-600">
                Besoin d&apos;inspiration par secteur ou langue ?
              </span>
              <button
                type="button"
                onClick={onOpenTemplatesCatalog}
                className="text-xs text-emerald-800 font-bold hover:underline shrink-0"
              >
                Voir les modèles ➔
              </button>
            </div>
          )}
        </div>

        {/* =======================================================================
            COLONNE DROITE (7 colonnes) : LE CV BRUT & ENRICHISSEMENT
           ======================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col min-h-[580px]">
            {/* Barre supérieure du CV brut */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-[#0A2540] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Votre CV Brut (Document de Base)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {rawCvText
                    ? 'Ce document brut sert de fondation solide pour vos futures candidatures.'
                    : 'Le résultat de votre saisie apparaîtra ici dès validation.'}
                </p>
              </div>

              {rawCvText && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Copier le texte"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copied ? 'Copié !' : 'Copier'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDoc}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Télécharger en Word .doc"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Word</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Télécharger en TXT"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>TXT</span>
                  </button>
                </div>
              )}
            </div>

            {/* Zone de texte éditable du CV Brut */}
            <div className="flex-1 flex flex-col space-y-3">
              <textarea
                value={rawCvText}
                onChange={(e) => setRawCvText(e.target.value)}
                rows={18}
                placeholder="Votre CV brut s'affichera ici. Vous pouvez aussi taper directement dessus..."
                className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D287] leading-relaxed resize-y"
              />

              {/* =================================================================
                  LE COEUR DE LA DEMANDE : "POUVOIR PAR LA SUITE ENRICHIR ET AMÉLIORER"
                 ================================================================= */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-[#0A2540]">
                    🚀 Étape suivante : Enrichir & Améliorer
                  </span>

                  {rawCvText && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleHarmonizeStructure}
                        className="text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Harmoniser les titres de rubriques pour les ATS"
                      >
                        <Layers className="w-3.5 h-3.5 text-slate-600" />
                        <span>Harmoniser rubriques</span>
                      </button>

                      <button
                        type="button"
                        disabled={isEnhancing}
                        onClick={handleAiEnhanceRawCv}
                        className="text-xs text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Enrichir automatiquement le CV brut avec des verbes d'action STAR"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>{isEnhancing ? 'Enrichissement en cours...' : '✨ Enrichir les puces (STAR & Chiffres)'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Bouton principal : envoyer vers l'Analyseur d'Adéquation pour enrichir face à l'offre */}
                  <button
                    type="button"
                    disabled={!rawCvText.trim()}
                    onClick={handleSendToAnalyzer}
                    className="flex-1 py-3 px-4 bg-linear-to-r from-[#0A2540] to-[#133557] hover:from-[#133557] hover:to-[#1E3A8A] text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
                  >
                    <span>🎯 Tester & Enrichir ce CV brut dans l&apos;Analyseur ATS</span>
                    <ArrowRight className="w-4 h-4 text-[#00D287]" />
                  </button>

                  <button
                    type="button"
                    disabled={!rawCvText.trim()}
                    onClick={handleSaveToDb}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-[#0A2540] rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    title="Sauvegarder dans la base locale"
                  >
                    <Save className="w-4 h-4 text-emerald-600" />
                    <span>{isSaved ? 'Sauvegardé !' : 'Sauvegarder en BDD'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
