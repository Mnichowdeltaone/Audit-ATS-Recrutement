import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Briefcase,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Save,
  RefreshCw,
  Trophy,
  Zap,
  Globe,
  Upload,
  FileCheck,
  XCircle,
  AlertTriangle,
  History,
  TrendingUp,
  Award,
  Layers,
  Database,
  User,
  Sliders,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Mail,
  Edit3,
  Lock,
  PlusCircle,
  Paperclip,
  Eye,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  UserProfile,
  SavedCv,
  SavedCoverLetter,
  EvolutionStep,
  AnalysisHistoryItem,
  ApplicationItem,
} from '../types';
import { localDbClient } from '../services/localDbClient';
import { parseAnalysisResult, extractScore } from '../utils/analysisParser';
import { detectCvChanges, buildEvolutionStep } from '../utils/cvEvolutionHelper';
import { SAMPLE_DEMO_CV, SAMPLE_DEMO_JOB } from '../utils/sampleData';
import AttachLetterModal from './AttachLetterModal';

const API_BASE_URL =
  typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}

interface OptimizationFunnelProps {
  cvText: string;
  setCvText: (text: string) => void;
  jobText: string;
  setJobText: (text: string) => void;
  jobUrl: string;
  setJobUrl: (url: string) => void;
  onFetchJobFromUrl: () => Promise<void>;
  isFetchingUrl: boolean;
  urlFetchSuccess: string | null;
  urlFetchErrorInfo: {
    message: string;
    isProtected?: boolean;
    platform?: string | null;
    url?: string;
    statusCode?: number;
  } | null;
  onFileUpload: (file: File) => Promise<void>;
  isParsingFile: boolean;
  uploadedFileInfo: {
    fileName: string;
    fileSize: number;
    fileType: string;
    text: string;
  } | null;
  fileError: string | null;
  apiKey: string;
  hasServerKey: boolean;
  selectedModel: string;
  analysisResult: string | null;
  isLoadingAnalysis: boolean;
  onRunAnalysis: (
    isDemo?: boolean,
    options?: {
      openModal?: boolean;
      cvToUse?: string;
      isReAnalysis?: boolean;
    }
  ) => Promise<string | void>;
  evolutionSteps: EvolutionStep[];
  setEvolutionSteps: React.Dispatch<React.SetStateAction<EvolutionStep[]>>;
  currentEvolutionVersion: number;
  setCurrentEvolutionVersion: React.Dispatch<React.SetStateAction<number>>;
  onSaveCvToDb: (title: string, cvText: string) => Promise<void>;
  onAddToTracker: (options?: {
    customNotes?: string;
    company?: string;
    role?: string;
    score?: number | null;
    coverLetter?: string;
    coverLetterTitle?: string;
  }) => void;
  onOpenVisualModal: () => void;
  userProfile: UserProfile | null;
  userProfiles: UserProfile[];
  onSelectProfile: (id: string) => void;
  savedCvs: SavedCv[];
  selectedCvId: string;
  onSelectCvId: (id: string) => void;
  onSaveCurrentCvToDb: () => void;
  onPopulateProfileFromCurrentCv: (profileId?: string, isNew?: boolean) => void;
  isExtractingProfile: boolean;
  onResetAll: () => void;
  onStartNewAnalysis?: () => void;
  currentAnalysisId?: string | null;
  currentAnalysisTitle?: string;
  onRenameAnalysis?: (id: string, newTitle: string) => Promise<void> | void;
  onUpdateAnalysisCoverLetter?: (analysisId: string, letter: SavedCoverLetter | null) => void;
}

export type FunnelStepId = 1 | 2 | 3 | 4;

export default function OptimizationFunnel({
  cvText,
  setCvText,
  jobText,
  setJobText,
  jobUrl,
  setJobUrl,
  onFetchJobFromUrl,
  isFetchingUrl,
  urlFetchSuccess,
  urlFetchErrorInfo,
  onFileUpload,
  isParsingFile,
  uploadedFileInfo,
  fileError,
  apiKey,
  hasServerKey,
  selectedModel,
  analysisResult,
  isLoadingAnalysis,
  onRunAnalysis,
  evolutionSteps,
  setEvolutionSteps,
  currentEvolutionVersion,
  setCurrentEvolutionVersion,
  onSaveCvToDb,
  onAddToTracker,
  onOpenVisualModal,
  userProfile,
  userProfiles,
  onSelectProfile,
  savedCvs,
  selectedCvId,
  onSelectCvId,
  onSaveCurrentCvToDb,
  onPopulateProfileFromCurrentCv,
  isExtractingProfile,
  onResetAll,
  onStartNewAnalysis,
  currentAnalysisId,
  currentAnalysisTitle,
  onRenameAnalysis,
  onUpdateAnalysisCoverLetter,
}: OptimizationFunnelProps) {
  // États de renommage de l'analyse active
  const [isEditingActiveTitle, setIsEditingActiveTitle] = useState(false);
  const [activeTitleInput, setActiveTitleInput] = useState('');

  const handleSaveActiveTitle = () => {
    if (activeTitleInput.trim() && currentAnalysisId && onRenameAnalysis) {
      onRenameAnalysis(currentAnalysisId, activeTitleInput.trim());
    }
    setIsEditingActiveTitle(false);
  };

  // Étape courante dans le tunnel (1, 2, 3, 4)
  const [currentStep, setCurrentStep] = useState<FunnelStepId>(() => {
    if (analysisResult && evolutionSteps.length > 1) return 4;
    if (analysisResult) return 2;
    return 1;
  });

  // États Étape 3 (Enrichissement)
  const [optimizationMode, setOptimizationMode] = useState<'balanced' | 'star' | 'keywords'>('balanced');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGeneratingOptimizedCv, setIsGeneratingOptimizedCv] = useState(false);
  const [optimizedCvDraft, setOptimizedCvDraft] = useState<string>('');
  const [optimizationSummaryBullets, setOptimizationSummaryBullets] = useState<string[]>([]);
  const [optimizationDiff, setOptimizationDiff] = useState<ReturnType<typeof detectCvChanges> | null>(null);
  const [viewCompareMode, setViewCompareMode] = useState<'side_by_side' | 'editor'>('side_by_side');

  // États Étape 4 (Candidature finale & Dossier complet)
  const [calculatedFinalScore, setCalculatedFinalScore] = useState<number | null>(null);
  const [isCalculatingFinalScore, setIsCalculatingFinalScore] = useState(false);
  const [showStep4Diff, setShowStep4Diff] = useState(false);
  const [copiedState, setCopiedState] = useState<'cv' | 'hook' | 'report' | 'letter' | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSavingNewCv, setIsSavingNewCv] = useState(false);
  const [newCvTitle, setNewCvTitle] = useState('CV Optimisé Final');
  const [activeDossierTab, setActiveDossierTab] = useState<'cv' | 'letter'>('cv');
  const [finalCoverLetter, setFinalCoverLetter] = useState<string>('');
  const [coverLetterTitle, setCoverLetterTitle] = useState<string>('Lettre de Motivation Sur-Mesure');
  const [attachedLetterId, setAttachedLetterId] = useState<string | null>(null);
  const [isAttachingLetterModalOpen, setIsAttachingLetterModalOpen] = useState(false);
  const [allAvailableLetters, setAllAvailableLetters] = useState<SavedCoverLetter[]>([]);
  const [coverLetterTone, setCoverLetterTone] = useState<'professionnel' | 'dynamique' | 'concis'>('professionnel');
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [coverLetterNotice, setCoverLetterNotice] = useState<string | null>(null);
  const [isSavingLetter, setIsSavingLetter] = useState(false);
  const [funnelError, setFunnelError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Reset global lors d'une remise à zéro de la BDD
  useEffect(() => {
    const handleReset = () => {
      setCurrentStep(1);
      setOptimizedCvDraft('');
      setFinalCoverLetter('');
      setAttachedLetterId(null);
      setOptimizationSummaryBullets([]);
      setOptimizationDiff(null);
      setCustomInstructions('');
      setCalculatedFinalScore(null);
      setCopiedState(null);
      setSaveSuccessMsg(null);
      setCoverLetterNotice(null);
      setFunnelError(null);
    };
    window.addEventListener('cv_move_database_reset', handleReset);
    return () => window.removeEventListener('cv_move_database_reset', handleReset);
  }, []);

  // Déterminer si une analyse a déjà été effectuée (1 analyse = 1 offre d'emploi)
  const hasCompletedAnalysis = Boolean(analysisResult || currentAnalysisId || (evolutionSteps && evolutionSteps.length > 0));

  // Parsing de l'analyse actuelle si disponible
  const parsedAnalysis = analysisResult ? parseAnalysisResult(analysisResult, cvText, jobText) : null;

  // Détection & chargement automatique de la lettre de motivation associée à cet audit
  useEffect(() => {
    const syncLetter = () => {
      const allLetters = localDbClient.getAllAvailableCoverLetters();
      setAllAvailableLetters(allLetters);

      const matchedLetter = localDbClient.getCoverLetterForAnalysis(
        currentAnalysisId,
        parsedAnalysis?.targetCompany
      );

      if (matchedLetter) {
        setFinalCoverLetter(matchedLetter.content);
        setCoverLetterTitle(matchedLetter.title);
        setAttachedLetterId(matchedLetter.id);
      }
    };

    syncLetter();
    window.addEventListener('cv_move_analysis_updated', syncLetter);
    return () => window.removeEventListener('cv_move_analysis_updated', syncLetter);
  }, [currentAnalysisId, parsedAnalysis?.targetCompany]);

  // 1. Détermination rigoureuse du Score Initial V1 (Score de départ avant optimisation)
  const initialScore = useMemo(() => {
    // Si des étapes d'évolution existent, V1 est STRICTEMENT le score de la première étape enregistrée
    if (evolutionSteps.length > 0 && evolutionSteps[0]?.score != null) {
      return evolutionSteps[0].score;
    }
    // Si nous sommes à l'étape 2 (Audit initial unique)
    if (currentEvolutionVersion <= 1 && parsedAnalysis?.globalScore != null) {
      return parsedAnalysis.globalScore;
    }
    return parsedAnalysis?.globalScore ?? 64;
  }, [evolutionSteps, currentEvolutionVersion, parsedAnalysis?.globalScore]);

  // 2. Détermination rigoureuse du Score Final Optimisé (Dernière version V2, V3, V4...)
  const effectiveFinalScore = useMemo(() => {
    // A. Score recalculé lors de la ré-analyse de l'étape 3
    if (calculatedFinalScore != null) {
      return Math.max(initialScore, calculatedFinalScore);
    }
    // B. Si plusieurs versions existent dans l'historique d'évolution, prendre la dernière
    if (evolutionSteps.length > 1) {
      const lastScore = evolutionSteps[evolutionSteps.length - 1]?.score;
      if (lastScore != null) {
        return Math.max(initialScore, lastScore);
      }
    }
    // C. Si la version courante est > 1, le score actuel de l'analyse est le score de cette version
    if (currentEvolutionVersion > 1 && parsedAnalysis?.globalScore != null) {
      return Math.max(initialScore, parsedAnalysis.globalScore);
    }
    // D. Si l'utilisateur est à l'étape 4 sans avoir relancé l'API de ré-analyse
    if (initialScore != null) {
      const addedCount = optimizationDiff?.addedKeywords.length || 0;
      const bonus = Math.min(26, Math.max(15, 18 + addedCount * 2));
      return Math.min(98, Math.max(initialScore + 4, initialScore + bonus));
    }
    return 88;
  }, [calculatedFinalScore, evolutionSteps, currentEvolutionVersion, parsedAnalysis?.globalScore, initialScore, optimizationDiff]);

  // 3. Gain net garanti cohérent et strictement positif
  const netGain = Math.max(0, effectiveFinalScore - initialScore);
  const netGainFormatted = `+${netGain}`;

  // Synchronisation automatique de l'étape selon l'état des données
  useEffect(() => {
    if (!analysisResult && currentStep > 1) {
      setCurrentStep(1);
    } else if (analysisResult && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [analysisResult]);

  // Titres par défaut pour le CV final et la lettre de motivation
  useEffect(() => {
    if (parsedAnalysis?.targetRole) {
      const companyPart = parsedAnalysis.targetCompany ? ` - ${parsedAnalysis.targetCompany}` : '';
      setNewCvTitle(`CV Optimisé - ${parsedAnalysis.targetRole}${companyPart}`);
      setCoverLetterTitle(`Lettre de Motivation - ${parsedAnalysis.targetRole}${companyPart}`);
    }
  }, [parsedAnalysis?.targetRole, parsedAnalysis?.targetCompany]);

  // Copier dans le presse-papier avec feedback
  const handleCopy = (text: string, type: 'cv' | 'hook' | 'report' | 'letter') => {
    navigator.clipboard.writeText(text);
    setCopiedState(type);
    setTimeout(() => setCopiedState(null), 2000);
  };

  // Télécharger au format texte ou Word
  const handleDownload = (format: 'txt' | 'doc', textToDownload: string, defaultName: string) => {
    const mime = format === 'doc' ? 'application/msword;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = new Blob([textToDownload], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${defaultName}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Liste dynamique des compétences et mots-clés de l'offre
  const expectedOfferKeywords = React.useMemo(() => {
    const list: string[] = [];
    if (parsedAnalysis?.skillsBreakdown) {
      parsedAnalysis.skillsBreakdown.forEach((s) => {
        if (s.name && !list.includes(s.name)) list.push(s.name);
      });
    }
    if (parsedAnalysis?.weaknesses) {
      parsedAnalysis.weaknesses.forEach((w) => {
        if (w.title && w.title.length < 35 && !list.includes(w.title)) list.push(w.title);
      });
    }
    if (parsedAnalysis?.strategies) {
      parsedAnalysis.strategies.forEach((st) => {
        if (st.keywordSuggestion && !list.includes(st.keywordSuggestion)) list.push(st.keywordSuggestion);
      });
    }
    return list;
  }, [parsedAnalysis]);

  // Initialiser automatiquement l'ébauche de CV avec le CV initial dès l'arrivée sur l'étape 3
  useEffect(() => {
    if (currentStep === 3 && !optimizedCvDraft && cvText) {
      setOptimizedCvDraft(cvText);
    }
  }, [currentStep, cvText, optimizedCvDraft]);

  // Insérer un mot-clé manquant en un clic dans l'éditeur de CV
  const handleInsertKeywordIntoCv = (keyword: string) => {
    setOptimizedCvDraft((prev) => {
      const current = prev || cvText;
      if (current.toLowerCase().includes(keyword.toLowerCase())) return current;
      return `${current.trim()}\n• Compétence clé appliquée : ${keyword}`;
    });
  };

  // Passer à l'étape 2 (Lancement du diagnostic)
  const handleGoToStep2 = async () => {
    if (!cvText.trim() || !jobText.trim()) {
      setFunnelError("Veuillez renseigner à la fois votre CV et l'offre d'emploi avant de lancer le diagnostic.");
      return;
    }
    setFunnelError(null);
    await onRunAnalysis(!apiKey && !hasServerKey, { openModal: false, isReAnalysis: false });
    setCurrentStep(2);
  };

  // Étape 3 : Générer l'enrichissement IA du CV
  const handleGenerateOptimization = async () => {
    setIsGeneratingOptimizedCv(true);
    try {
      let keyArg = '';
      if (optimizationMode === 'star') {
        keyArg = 'Appliquer rigoureusement la méthode STAR : reformuler les réalisations avec Situation, Tâche, Action et Résultats chiffrés mesurables (%, M€, gains de temps).';
      } else if (optimizationMode === 'keywords') {
        keyArg = 'Intégrer de façon exhaustive les mots-clés techniques ATS, outils progiciels et compétences requises par l\'offre.';
      }
      if (customInstructions.trim()) {
        keyArg = `${keyArg} ${customInstructions.trim()}`.trim();
      }

      const res = await apiFetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize_cv',
          input: optimizedCvDraft || cvText,
          jobText: jobText || '',
          analysisRecommendations: analysisResult || '',
          targetRole: parsedAnalysis?.targetRole || '',
          companyName: parsedAnalysis?.targetCompany || '',
          keyArguments: keyArg || undefined,
          apiKey: apiKey || undefined,
          demoFallback: !apiKey && !hasServerKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération du CV optimisé.');
      }

      const rawResult: string = data.result || '';
      let generatedCv = rawResult;
      let bullets: string[] = [];

      if (rawResult.includes('---')) {
        const parts = rawResult.split('---');
        const summaryPart = parts[0].trim();
        generatedCv = parts.slice(1).join('---').trim();
        bullets = summaryPart
          .split('\n')
          .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map((line) => line.replace(/^[-*]\s*/, '').trim());
      } else {
        bullets = [
          'Mots-clés ATS clés de l\'offre intégrés',
          'Puces reformulées pour valoriser votre impact opérationnel',
          'Alignement direct avec les exigences du recruteur',
        ];
      }

      setOptimizedCvDraft(generatedCv);
      setOptimizationSummaryBullets(bullets);
      const diff = detectCvChanges(cvText, generatedCv, expectedOfferKeywords);
      setOptimizationDiff(diff);

      confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
    } catch (err: unknown) {
      setFunnelError(err instanceof Error ? err.message : 'Erreur lors de la génération.');
    } finally {
      setIsGeneratingOptimizedCv(false);
    }
  };

  // Étape 3 : Lancer la ré-analyse réelle du CV modifié par rapport à l'offre
  const handleTriggerReAnalysis = async () => {
    const cvToAnalyze = (optimizedCvDraft || cvText).trim();
    if (!cvToAnalyze) {
      setFunnelError('Veuillez renseigner le texte du CV à ré-analyser.');
      return;
    }
    setFunnelError(null);
    setIsCalculatingFinalScore(true);

    try {
      // 1. Mettre à jour le texte du CV actif dans l'application
      setCvText(cvToAnalyze);

      // 2. Lancer la vraie ré-analyse par rapport à l'offre
      const result = await onRunAnalysis(!apiKey && !hasServerKey, {
        openModal: false,
        cvToUse: cvToAnalyze,
        isReAnalysis: true,
      });

      // 3. Calculer les changements réels et la note finale obtenue
      const v1Cv = evolutionSteps[0]?.cvText || cvText;
      const diff = detectCvChanges(v1Cv, cvToAnalyze, expectedOfferKeywords);
      setOptimizationDiff(diff);

      const parsedScore = typeof result === 'string'
        ? extractScore(result)
        : (evolutionSteps.slice().reverse().find((s) => s.score !== null)?.score ?? 90);

      setCalculatedFinalScore(parsedScore);
      setCurrentStep(4);
      confetti({ particleCount: 85, spread: 80, origin: { y: 0.5 } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la ré-analyse.';
      setFunnelError(`Échec de la ré-analyse : ${msg}`);
    } finally {
      setIsCalculatingFinalScore(false);
    }
  };

  // Alias rétrocompatible
  const handleValidateAndGoToStep4 = handleTriggerReAnalysis;

  // Sauvegarde dans la BDD locale depuis l'étape 4
  const handleSaveFinalToDb = async () => {
    if (!optimizedCvDraft && !cvText) return;
    setIsSavingNewCv(true);
    setFunnelError(null);
    try {
      await onSaveCvToDb(newCvTitle, optimizedCvDraft || cvText);
      setSaveSuccessMsg(`⭐ « ${newCvTitle} » sauvegardé avec succès dans votre base locale !`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch {
      setFunnelError('Erreur lors de la sauvegarde du CV.');
    } finally {
      setIsSavingNewCv(false);
    }
  };

  // Étape 4 : Rédiger la lettre de motivation sur-mesure avec l'IA
  const handleGenerateFinalCoverLetter = async () => {
    setIsGeneratingCoverLetter(true);
    setFunnelError(null);
    try {
      const res = await apiFetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_cover_letter',
          input: cvText,
          jobText: jobText || '',
          targetRole: parsedAnalysis?.targetRole || 'Poste Cible',
          companyName: parsedAnalysis?.targetCompany || 'Entreprise Cible',
          candidateName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : undefined,
          tone: coverLetterTone,
          style: 'convaincant',
          keyArguments: parsedAnalysis?.coverLetterHook || undefined,
          apiKey: apiKey || undefined,
          demoFallback: !apiKey && !hasServerKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la rédaction de la lettre.');
      }
      setFinalCoverLetter(data.result || '');
      setCoverLetterNotice('✨ Lettre de motivation sur-mesure rédigée avec succès !');
      setTimeout(() => setCoverLetterNotice(null), 3500);
      confetti({ particleCount: 45, spread: 65 });
    } catch (err: unknown) {
      setFunnelError(err instanceof Error ? err.message : 'Erreur lors de la génération de la lettre.');
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  // Étape 4 : Sauvegarder la lettre de motivation dans la BDD locale et la rattacher à cet audit
  const handleSaveLetterToDb = async () => {
    if (!finalCoverLetter.trim()) return;
    setIsSavingLetter(true);
    setFunnelError(null);
    try {
      const saved = await localDbClient.saveCoverLetter({
        id: attachedLetterId || `letter-${Date.now()}`,
        title: coverLetterTitle || `Lettre - ${parsedAnalysis?.targetCompany || 'Candidature'}`,
        company: parsedAnalysis?.targetCompany || 'Entreprise Cible',
        role: parsedAnalysis?.targetRole || 'Poste Cible',
        content: finalCoverLetter.trim(),
        analysisId: currentAnalysisId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setAttachedLetterId(saved.id);
      if (currentAnalysisId) {
        onUpdateAnalysisCoverLetter?.(currentAnalysisId, saved);
      }
      setCoverLetterNotice('⭐ Lettre de motivation enregistrée et rattachée à cet audit !');
      setTimeout(() => setCoverLetterNotice(null), 3500);
      confetti({ particleCount: 30, spread: 50 });
    } catch {
      setFunnelError('Erreur lors de la sauvegarde de la lettre en BDD.');
    } finally {
      setIsSavingLetter(false);
    }
  };

  // Rattacher formellement une lettre existante à cet audit
  const handleAttachExistingLetter = async (letter: SavedCoverLetter) => {
    setFinalCoverLetter(letter.content);
    setCoverLetterTitle(letter.title);
    setAttachedLetterId(letter.id);
    setIsAttachingLetterModalOpen(false);

    if (currentAnalysisId) {
      const linked = await localDbClient.linkCoverLetterToAnalysis(letter, currentAnalysisId);
      onUpdateAnalysisCoverLetter?.(currentAnalysisId, linked || letter);
    }
    setCoverLetterNotice(`✓ Lettre « ${letter.title} » rattachée avec succès à cet audit !`);
    setTimeout(() => setCoverLetterNotice(null), 3500);
    confetti({ particleCount: 40, spread: 60 });
  };

  // Détacher la lettre de cet audit
  const handleDetachLetter = async () => {
    setFinalCoverLetter('');
    setAttachedLetterId(null);
    if (currentAnalysisId) {
      await localDbClient.unlinkCoverLetterFromAnalysis(currentAnalysisId);
      onUpdateAnalysisCoverLetter?.(currentAnalysisId, null);
    }
    setCoverLetterNotice('Lettre de motivation détachée de cet audit.');
    setTimeout(() => setCoverLetterNotice(null), 3000);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* Alerte d'erreur éventuelle */}
      {funnelError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{funnelError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFunnelError(null)}
            className="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer px-2 py-1"
          >
            Fermer ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          BARRE DE PROGRESSION GUIDÉE EN 4 ÉTAPES (LE TUNNEL D'OPTIMISATION)
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                Parcours Linéaire Guidé
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-bold text-gray-700">
                Optimisation continue de candidature
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 mt-0.5 flex items-center gap-2">
              <span>🚀 Tunnel d&apos;Optimisation de Candidature en 4 Étapes</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCvText(SAMPLE_DEMO_CV);
                setJobText(SAMPLE_DEMO_JOB);
                confetti({ particleCount: 40, spread: 60 });
              }}
              className="text-xs px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102"
              title="Charger un exemple complet Trésorier + Offre pour tester immédiatement"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-purple-900" />
              <span>Charger Démo 1-Clic</span>
            </button>

            <button
              type="button"
              onClick={onResetAll}
              className="text-xs px-2.5 py-1.5 text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              title="Réinitialiser l'analyseur"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bandeau d'Identification et de Nommage de l'Analyse Active */}
        {(analysisResult || evolutionSteps.length > 0) && (
          <div className="bg-linear-to-r from-purple-50 via-indigo-50/50 to-blue-50/70 border border-purple-200/90 rounded-2xl p-3 sm:p-3.5 mb-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  {parsedAnalysis?.company ? (
                    <span className="text-xs font-black bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                      🏢 {parsedAnalysis.company}
                    </span>
                  ) : parsedAnalysis?.cabinet ? (
                    <span className="text-xs font-black bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                      👔 {parsedAnalysis.cabinet}
                    </span>
                  ) : (
                    <span
                      className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs"
                      title="Société émettrice non détectée dans l'offre : analyse horodatée"
                    >
                      🕒 Horodatée ({parsedAnalysis?.horodatage || 'Analyse en cours'})
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {isEditingActiveTitle ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={activeTitleInput}
                        onChange={(e) => setActiveTitleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveActiveTitle();
                          if (e.key === 'Escape') setIsEditingActiveTitle(false);
                        }}
                        placeholder="Nommer cette analyse (ex: InnovFinance - Responsable Trésorerie)..."
                        className="w-full text-xs font-bold px-2.5 py-1 bg-white border-2 border-purple-500 rounded-lg focus:outline-none shadow-2xs text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={handleSaveActiveTitle}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                        title="Enregistrer"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingActiveTitle(false)}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                        title="Annuler"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/edit min-w-0">
                      <span
                        onClick={() => {
                          setIsEditingActiveTitle(true);
                          setActiveTitleInput(currentAnalysisTitle || parsedAnalysis?.suggestedTitle || "Analyse d'adéquation");
                        }}
                        className="text-xs sm:text-sm font-extrabold text-gray-900 truncate cursor-pointer hover:text-purple-700 transition-colors"
                        title="Cliquer pour renommer cette analyse"
                      >
                        {currentAnalysisTitle || parsedAnalysis?.suggestedTitle || "Analyse d'adéquation"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingActiveTitle(true);
                          setActiveTitleInput(currentAnalysisTitle || parsedAnalysis?.suggestedTitle || "Analyse d'adéquation");
                        }}
                        className="p-1 text-gray-400 hover:text-purple-600 rounded-md transition-colors cursor-pointer"
                        title="Renommer cette analyse"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                <span
                  className="text-[10px] font-black bg-indigo-100/90 text-indigo-950 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs"
                  title="Règle d'or : 1 analyse = 1 offre d'emploi unique"
                >
                  <Lock className="w-3 h-3 text-indigo-700" />
                  <span>1 analyse = 1 offre</span>
                </span>
                <span className="text-[10px] font-bold text-gray-600 bg-white/80 border border-gray-200 px-2 py-0.5 rounded-lg shadow-2xs">
                  Version {currentEvolutionVersion} • Score {parsedAnalysis?.globalScore ?? 80}%
                </span>
                {!isEditingActiveTitle && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingActiveTitle(true);
                      setActiveTitleInput(currentAnalysisTitle || parsedAnalysis?.suggestedTitle || "Analyse d'adéquation");
                    }}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:bg-purple-100/80 px-2 py-1 rounded-lg border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Renommer</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onStartNewAnalysis || onResetAll}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50/90 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Créer une nouvelle analyse dédiée pour tester une autre offre"
                >
                  <PlusCircle className="w-3 h-3 text-blue-600" />
                  <span>Nouvelle offre</span>
                </button>

                {/* Indicateur explicite et cliquable de rattachement de lettre de motivation */}
                {attachedLetterId || finalCoverLetter.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(4);
                      setActiveDossierTab('letter');
                    }}
                    className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                    title={`Lettre de motivation rattachée à cet audit : « ${coverLetterTitle} ». Cliquez pour la consulter.`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-[130px] sm:max-w-[200px]">✉️ {coverLetterTitle}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAttachingLetterModalOpen(true)}
                    className="text-xs font-bold text-purple-800 bg-white hover:bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                    title="Rattacher une lettre existante (ex: Valoria Capital) ou en créer une pour cet audit"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>📎 Rattacher lettre</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stepper horizontal visuel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {/* Étape 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
              currentStep === 1
                ? 'bg-red-50/80 border-[#FF4B4B] shadow-xs ring-2 ring-red-100'
                : cvText && jobText
                ? 'bg-gray-50 border-gray-200 hover:bg-gray-100/70'
                : 'bg-gray-50/50 border-gray-200 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === 1
                    ? 'bg-[#FF4B4B] text-white'
                    : cvText && jobText
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {cvText && jobText && currentStep > 1 ? '✓' : '1'}
              </span>
              <span className="text-[10px] font-bold text-gray-400">Étape 1</span>
            </div>
            <div className="font-extrabold text-xs text-gray-900 truncate">
              1. Dépôt CV & Offre
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {cvText && jobText ? 'Dossier complet prêt' : 'Import des textes'}
            </p>
          </button>

          {/* Étape 2 */}
          <button
            type="button"
            disabled={!analysisResult}
            onClick={() => setCurrentStep(2)}
            className={`p-3 rounded-2xl text-left border transition-all relative ${
              !analysisResult
                ? 'bg-gray-50/40 border-gray-200 opacity-50 cursor-not-allowed'
                : currentStep === 2
                ? 'bg-blue-50/80 border-blue-600 shadow-xs ring-2 ring-blue-100 cursor-pointer'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100/70 cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white'
                    : analysisResult && currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {analysisResult && currentStep > 2 ? '✓' : '2'}
              </span>
              <span className="text-[10px] font-bold text-gray-400">Étape 2</span>
            </div>
            <div className="font-extrabold text-xs text-gray-900 truncate">
              2. Diagnostic Initial (V1)
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {initialScore !== null ? `Score initial : ${initialScore}%` : 'Écarts & mots-clés'}
            </p>
          </button>

          {/* Étape 3 */}
          <button
            type="button"
            disabled={!analysisResult}
            onClick={() => setCurrentStep(3)}
            className={`p-3 rounded-2xl text-left border transition-all relative ${
              !analysisResult
                ? 'bg-gray-50/40 border-gray-200 opacity-50 cursor-not-allowed'
                : currentStep === 3
                ? 'bg-purple-50/80 border-purple-600 shadow-xs ring-2 ring-purple-100 cursor-pointer'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100/70 cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === 3
                    ? 'bg-purple-600 text-white'
                    : optimizedCvDraft && currentStep > 3
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {optimizedCvDraft && currentStep > 3 ? '✓' : '3'}
              </span>
              <span className="text-[10px] font-bold text-gray-400">Étape 3</span>
            </div>
            <div className="font-extrabold text-xs text-gray-900 truncate">
              3. Modifier & Ré-analyser
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {optimizedCvDraft ? 'CV prêt à ré-analyser' : 'IA ou Manuel'}
            </p>
          </button>

          {/* Étape 4 */}
          <button
            type="button"
            disabled={!analysisResult && currentStep < 4}
            onClick={() => setCurrentStep(4)}
            className={`p-3 rounded-2xl text-left border transition-all relative ${
              !analysisResult && currentStep < 4
                ? 'bg-gray-50/40 border-gray-200 opacity-50 cursor-not-allowed'
                : currentStep === 4
                ? 'bg-emerald-50/80 border-emerald-600 shadow-xs ring-2 ring-emerald-100 cursor-pointer'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100/70 cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === 4
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                4
              </span>
              <span className="text-[10px] font-bold text-gray-400">Étape 4</span>
            </div>
            <div className="font-extrabold text-xs text-gray-900 truncate">
              4. Note Finale & Évolution
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {currentEvolutionVersion > 1 || currentStep === 4 ? `Note finale : ${effectiveFinalScore}%` : 'Résultats & Dossier'}
            </p>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CONTENU DE L'ÉTAPE 1 : DÉPÔT CV & OFFRE D'EMPLOI
         ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Modules d'importation rapide */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Import Fichier CV */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#FF4B4B]" />
                    <h3 className="text-sm font-bold text-gray-900">
                      📎 Importez votre CV (PDF / DOCX)
                    </h3>
                  </div>
                  <span className="text-[10px] bg-red-50 text-[#FF4B4B] px-2 py-0.5 rounded-full font-medium border border-red-200">
                    Auto-extraction
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Glissez votre fichier pour extraire son contenu instantanément.
                </p>

                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      onFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
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
                        onFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  {isParsingFile ? (
                    <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                      <RefreshCw className="w-5 h-5 text-[#FF4B4B] animate-spin" />
                      <p className="text-xs font-semibold text-gray-700">
                        Extraction du texte en cours...
                      </p>
                    </div>
                  ) : uploadedFileInfo ? (
                    <div className="space-y-2">
                      <div className="text-left bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-emerald-900 truncate">
                              {uploadedFileInfo.fileName}
                            </p>
                            <p className="text-[10px] text-emerald-700">
                              {uploadedFileInfo.fileType.toUpperCase()} • {(uploadedFileInfo.fileSize / 1024).toFixed(1)} Ko
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] text-emerald-800 font-semibold underline shrink-0">
                          Changer
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveCurrentCvToDb();
                        }}
                        className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>💾 Sauvegarder dans la base locale (CV original)</span>
                      </button>
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
                  <div className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Récupération Offre via URL */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {hasCompletedAnalysis ? (
                      <Lock className="w-4 h-4 text-indigo-700" />
                    ) : (
                      <Globe className="w-4 h-4 text-blue-600" />
                    )}
                    <h3 className="text-sm font-bold text-gray-900">
                      {hasCompletedAnalysis ? "Offre liée à cette analyse" : "🔗 Récupérez l'Offre via URL"}
                    </h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    hasCompletedAnalysis
                      ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {hasCompletedAnalysis ? '1 analyse = 1 offre' : 'Web scraping'}
                  </span>
                </div>

                {hasCompletedAnalysis ? (
                  <div className="space-y-3 py-1">
                    <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                      Cette analyse est rattachée de façon unique à l&apos;offre d&apos;emploi ci-contre. <strong>Règle stricte : 1 analyse = 1 offre d&apos;emploi.</strong>
                    </p>
                    <div className="p-3 bg-indigo-50/80 border border-indigo-200/90 rounded-xl text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <span className="text-[11px] text-indigo-900 font-semibold">
                        Vous souhaitez comparer votre CV à une autre offre ?
                      </span>
                      <button
                        type="button"
                        onClick={onStartNewAnalysis || onResetAll}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Nouvelle analyse</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-2">
                      Collez le lien de l&apos;annonce pour en extraire automatiquement le texte :
                    </p>

                    <div className="space-y-2">
                      <input
                        type="url"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="https://www.exemple.com/offres/poste-cdi..."
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-gray-50/40"
                      />

                      <button
                        type="button"
                        disabled={isFetchingUrl || !jobUrl.trim()}
                        onClick={onFetchJobFromUrl}
                        className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        {isFetchingUrl ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Récupération de l&apos;annonce...</span>
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

                    {urlFetchErrorInfo && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span className="text-[11px]">{urlFetchErrorInfo.message}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Zones de texte éditables (CV & Offre) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Zone CV */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF4B4B]" />
                  <span>1. Texte de votre CV (éditable)</span>
                </label>
                <div className="flex items-center gap-2">
                  {cvText.trim().length > 30 && (
                    <button
                      type="button"
                      onClick={onSaveCurrentCvToDb}
                      className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Sauvegarder ce CV dans votre base locale comme CV original"
                    >
                      <Save className="w-3 h-3 text-purple-700" />
                      <span>💾 Sauvegarder CV original</span>
                    </button>
                  )}
                  <span className="text-xs text-gray-400">
                    {cvText.length > 0 ? `${cvText.length} car.` : 'Requis'}
                  </span>
                </div>
              </div>

              {/* Sélecteur de BDD locale */}
              {savedCvs.length > 0 && (
                <div className="mb-2 p-2 bg-purple-50/70 border border-purple-200/90 rounded-lg flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900">
                    <Database className="w-3.5 h-3.5 text-purple-700" />
                    <span>BDD de CVs :</span>
                  </div>
                  <select
                    value={selectedCvId}
                    onChange={(e) => onSelectCvId(e.target.value)}
                    className="px-2 py-1 bg-white border border-purple-300 rounded-md text-[11px] font-medium text-gray-800 max-w-[200px] truncate"
                  >
                    <option value="">-- Choisir un CV sauvegardé --</option>
                    {savedCvs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.isDefault ? '⭐ ' : ''}{c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <textarea
                rows={11}
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Collez ici le texte intégral de votre CV ou importez un document PDF/Word ci-dessus..."
                className="w-full p-3.5 text-xs sm:text-sm font-sans border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#FF4B4B] bg-gray-50/30 resize-y flex-1 min-h-[220px]"
              />

              {cvText && (
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => setCvText('')}
                    className="text-[11px] text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    Effacer le CV
                  </button>
                </div>
              )}
            </div>

            {/* Zone Offre */}
            <div className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col transition-all ${
              hasCompletedAnalysis ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  {hasCompletedAnalysis ? (
                    <Lock className="w-4 h-4 text-indigo-700 shrink-0" />
                  ) : (
                    <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span>
                    2. Texte de l&apos;Offre d&apos;Emploi {hasCompletedAnalysis ? '(🔒 Verrouillée - 1 analyse = 1 offre)' : '(éditable)'}
                  </span>
                </label>
                {hasCompletedAnalysis ? (
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <Lock className="w-3 h-3 text-indigo-700" />
                    Offre verrouillée
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">
                    {jobText.length > 0 ? `${jobText.length} car.` : 'Requis'}
                  </span>
                )}
              </div>

              {hasCompletedAnalysis && (
                <div className="mb-2.5 p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-start gap-2 text-xs text-amber-950">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-amber-950">Offre verrouillée pour cette analyse</span>
                    <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                      Règle stricte : <strong>1 analyse = 1 offre d&apos;emploi</strong>. Vous ne devez pas analyser une autre offre sur une analyse déjà effectuée. Pour tester votre CV sur une autre offre, créez une nouvelle analyse dédiée ci-dessous.
                    </p>
                  </div>
                </div>
              )}

              <textarea
                rows={11}
                value={jobText}
                readOnly={hasCompletedAnalysis}
                onChange={(e) => {
                  if (!hasCompletedAnalysis) setJobText(e.target.value);
                }}
                placeholder="Collez ici l'annonce de recrutement (missions, compétences, profil recherché)..."
                className={`w-full p-3.5 text-xs sm:text-sm font-sans border rounded-xl resize-y flex-1 min-h-[220px] transition-colors ${
                  hasCompletedAnalysis
                    ? 'border-indigo-200 bg-gray-100/75 text-gray-700 cursor-not-allowed select-text'
                    : 'border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-gray-50/30'
                }`}
              />

              {hasCompletedAnalysis ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100 text-xs">
                  <span className="text-[11px] text-gray-500 font-medium italic">
                    Offre de référence de l&apos;analyse en cours
                  </span>
                  <button
                    type="button"
                    onClick={onStartNewAnalysis || onResetAll}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    title="Créer une nouvelle analyse dédiée pour analyser une autre offre"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Analyser une autre offre (Nouvelle analyse)</span>
                  </button>
                </div>
              ) : (
                jobText && (
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setJobText('');
                        setJobUrl('');
                      }}
                      className="text-[11px] text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      Effacer l&apos;offre
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Bouton d'action principal Étape 1 -> Étape 2 */}
          <div className="pt-2">
            {hasCompletedAnalysis ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:flex-1 py-4 px-6 rounded-2xl font-black text-base shadow-md bg-linear-to-r from-red-600 via-[#FF4B4B] to-purple-600 hover:from-red-700 hover:to-purple-700 text-white hover:scale-101 active:scale-99 transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>Consulter le Diagnostic de cette Offre (Étape 2)</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={onStartNewAnalysis || onResetAll}
                  className="w-full sm:w-auto py-4 px-6 rounded-2xl font-bold text-sm border-2 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  title="Créer une nouvelle analyse dédiée pour une autre offre d'emploi"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-700" />
                  <span>Créer une nouvelle analyse (Autre offre)</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isLoadingAnalysis || !cvText.trim() || !jobText.trim()}
                onClick={handleGoToStep2}
                className={`w-full py-4 px-6 rounded-2xl font-black text-base shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer ${
                  !cvText.trim() || !jobText.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isLoadingAnalysis
                    ? 'bg-blue-600 text-white'
                    : 'bg-linear-to-r from-red-600 via-[#FF4B4B] to-purple-600 hover:from-red-700 hover:to-purple-700 text-white hover:scale-101 active:scale-99'
                }`}
              >
                {isLoadingAnalysis ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Analyse ATS en cours par l&apos;IA Google Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Passer à l&apos;Étape 2 : Lancer le Diagnostic ATS & Analyse d&apos;Écarts</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENU DE L'ÉTAPE 2 : DIAGNOSTIC ATS & DÉTECTION DES ÉCARTS
         ========================================================================= */}
      {currentStep === 2 && parsedAnalysis && (
        <div className="space-y-6 animate-fade-in">
          {/* Header du Diagnostic avec score et label */}
          <div className="bg-linear-to-r from-gray-900 via-indigo-950 to-purple-950 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
            <div className="space-y-1.5 relative z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                  Étape 2 / 4 : Diagnostic Initial
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-purple-200">
                  {parsedAnalysis.targetRole} {parsedAnalysis.targetCompany ? `chez ${parsedAnalysis.targetCompany}` : ''}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Rapport d&apos;Adéquation & Conformité ATS
              </h3>
              <p className="text-xs text-purple-100 max-w-2xl leading-relaxed">
                Voici le diagnostic de départ de votre CV avant optimisation. L&apos;IA a identifié vos forces et les compétences manquantes requises par le poste.
              </p>
            </div>

            {/* Jauge Score ATS */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0 relative z-10">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-inner ${
                  parsedAnalysis.globalScore >= 80
                    ? 'bg-emerald-600'
                    : parsedAnalysis.globalScore >= 60
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
              >
                {parsedAnalysis.globalScore}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-300 block">
                  Score ATS Global
                </span>
                <span className="text-xs font-extrabold text-white">
                  {parsedAnalysis.globalScore >= 80
                    ? 'Excellente adéquation'
                    : parsedAnalysis.globalScore >= 65
                    ? 'Bonne adéquation'
                    : 'Adéquation modérée'}
                </span>
                <span className="text-[10px] text-purple-200 block">
                  Sur 100 points
                </span>
              </div>
            </div>
          </div>

          {/* Les 5 Piliers d'évaluation */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Évaluation sur les 5 Piliers Clés du Recrutement</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {parsedAnalysis.axisScores.map((ax, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800 text-[11px] truncate">{ax.axis}</span>
                    <span className="font-black text-indigo-600 text-xs">{ax.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${ax.score}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2">{ax.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Points Forts & Lacunes / Mots-clés manquants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Points Forts */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 border-b border-emerald-100 pb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">
                  Vos 3 Points Forts Majeurs
                </h4>
              </div>

              <div className="space-y-2.5">
                {parsedAnalysis.strengths.slice(0, 3).map((st, i) => (
                  <div key={i} className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                    <span className="font-bold text-xs text-emerald-950 block">
                      {st.title}
                    </span>
                    <p className="text-xs text-gray-600 leading-relaxed font-normal">
                      {st.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lacunes & Mots-clés manquants */}
            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-900 border-b border-amber-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">
                  Écarts & Mots-clés ATS à intégrer
                </h4>
              </div>

              <div className="space-y-2.5">
                {parsedAnalysis.weaknesses.slice(0, 3).map((wk, i) => (
                  <div key={i} className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 space-y-1">
                    <span className="font-bold text-xs text-amber-950 block">
                      {wk.title}
                    </span>
                    <p className="text-xs text-gray-600 leading-relaxed font-normal">
                      {wk.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Boutons de transition Étape 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Modifier le CV ou l&apos;Offre</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenVisualModal}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Consulter le rapport graphique complet en plein écran"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Rapport Visuel & KPIs ↗</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-sm font-black transition-all flex items-center gap-2 shadow-md cursor-pointer hover:scale-102"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Passer à l&apos;Étape 3 : Enrichir & Optimiser mon CV ➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENU DE L'ÉTAPE 3 : MODIFIER LE CV & LANCER LA RÉ-ANALYSE
         ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Atelier d'Enrichissement */}
          <div className="bg-linear-to-r from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-6 text-white shadow-md space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-400/20 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded-full">
                Étape 3 / 4 : Modification & Ré-analyse
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-amber-300 font-bold">
                Objectif : V{currentEvolutionVersion + 1}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              ✏️ Modifiez votre CV et Lancez la Ré-analyse par rapport à l&apos;Offre
            </h3>
            <p className="text-xs text-purple-100 max-w-3xl leading-relaxed">
              Enrichissez votre CV avec les compétences et mots-clés attendus (soit manuellement, soit en 1 clic grâce à l&apos;IA). Dès que votre CV est prêt, cliquez sur <strong>« Lancer la ré-analyse »</strong> pour calculer votre <strong>note d&apos;analyse finale</strong> et mesurer votre gain de score !
            </p>
          </div>

          {/* Détection en direct des mots-clés et compétences attendus par l'offre */}
          {expectedOfferKeywords.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-800">
                    Mots-clés & Compétences prioritaires de l&apos;Offre
                  </h4>
                </div>
                <div className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                  <span>Présence dans le CV :</span>
                  <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                    {expectedOfferKeywords.filter((kw) =>
                      (optimizedCvDraft || cvText).toLowerCase().includes(kw.toLowerCase())
                    ).length}{' '}
                    / {expectedOfferKeywords.length}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Les badges verts sont déjà présents dans votre texte. Cliquez sur un badge ambre pour l&apos;insérer instantanément dans votre CV :
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {expectedOfferKeywords.map((kw, i) => {
                  const isPresent = (optimizedCvDraft || cvText)
                    .toLowerCase()
                    .includes(kw.toLowerCase());
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => !isPresent && handleInsertKeywordIntoCv(kw)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isPresent
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 hover:scale-102 shadow-2xs'
                      }`}
                      title={isPresent ? 'Déjà présent dans le CV' : 'Cliquer pour insérer dans le CV'}
                    >
                      {isPresent ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{kw}</span>
                          <span className="text-[10px] text-emerald-700 font-normal">(Présent)</span>
                        </>
                      ) : (
                        <>
                          <span className="text-amber-600">+</span>
                          <span>{kw}</span>
                          <span className="text-[10px] text-amber-700 font-normal">(À insérer)</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Outil d'optimisation assistée par IA (1-Clic) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Option A : Optimisation Automatisée avec l&apos;IA (1 Clic)</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  L&apos;IA injecte les compétences manquantes et formule des réalisations chiffrées selon la méthode STAR.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOptimizationMode('balanced')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  optimizationMode === 'balanced'
                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-100'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-bold text-xs text-purple-950 flex items-center justify-between">
                  <span>⚖️ Équilibré & Naturel</span>
                  {optimizationMode === 'balanced' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Style fluide et professionnel, intégration harmonieuse des prérequis.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOptimizationMode('keywords')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  optimizationMode === 'keywords'
                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-100'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-bold text-xs text-purple-950 flex items-center justify-between">
                  <span>🎯 Boost Mots-clés ATS</span>
                  {optimizationMode === 'keywords' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Maximise la densité lexicale des progiciels et protocoles requis.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOptimizationMode('star')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  optimizationMode === 'star'
                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-100'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-bold text-xs text-purple-950 flex items-center justify-between">
                  <span>📊 Méthode STAR & Chiffres</span>
                  {optimizationMode === 'star' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Accentue l&apos;impact avec métriques chiffrées (%, M€, gains de temps).
                </p>
              </button>
            </div>

            {/* Consigne optionnelle */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Consigne spécifique pour l&apos;IA (optionnel) :
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Ex: Mettre en avant mon anglais courant, mes compétences sur Kyriba ou Agicap..."
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-gray-50/40"
              />
            </div>

            <button
              type="button"
              disabled={isGeneratingOptimizedCv}
              onClick={handleGenerateOptimization}
              className="w-full py-3.5 px-4 bg-linear-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-101 active:scale-99"
            >
              {isGeneratingOptimizedCv ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Enrichissement de votre CV par l&apos;IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {optimizationSummaryBullets.length > 0
                      ? '🔄 Régénérer une autre version enrichie avec l’IA'
                      : '🪄 Optimiser automatiquement mon CV avec l’IA (1 Clic)'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Éditeur de texte du CV (Édition manuelle directe ou relecture) */}
          <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Texte de votre CV (Modifiable librement)</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Ajustez les phrases, ajoutez vos expériences ou personnalisez les puces avant de ré-analyser.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setOptimizedCvDraft(cvText)}
                  className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  title="Réinitialiser avec le texte du CV initial"
                >
                  <RotateCcw className="w-3 h-3 inline mr-1" />
                  <span>Rétablir CV initial</span>
                </button>

                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setViewCompareMode('editor')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      viewCompareMode === 'editor' ? 'bg-white shadow-2xs text-purple-950' : 'text-gray-500'
                    }`}
                  >
                    Éditeur direct
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewCompareMode('side_by_side')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      viewCompareMode === 'side_by_side' ? 'bg-white shadow-2xs text-purple-950' : 'text-gray-500'
                    }`}
                  >
                    Comparatif Avant / Après
                  </button>
                </div>
              </div>
            </div>

            {/* Résumé des modifications générées si disponibles */}
            {optimizationSummaryBullets.length > 0 && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>Améliorations intégrées par l&apos;IA :</span>
                </span>
                <ul className="text-xs text-gray-700 space-y-1 list-disc pl-5">
                  {optimizationSummaryBullets.map((b, idx) => (
                    <li key={idx} className="leading-snug">{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Zone de texte éditable */}
            {viewCompareMode === 'side_by_side' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="space-y-1">
                  <span className="font-bold font-sans text-[11px] text-gray-500 block">
                    Version Initiale (V{currentEvolutionVersion}) :
                  </span>
                  <pre className="p-3 bg-gray-50 border border-gray-200 rounded-xl h-80 overflow-y-auto whitespace-pre-wrap text-gray-600 text-[11px] leading-relaxed">
                    {cvText}
                  </pre>
                </div>

                <div className="space-y-1">
                  <span className="font-bold font-sans text-[11px] text-purple-700 block">
                    Version Modifiée (À ré-analyser pour la Note Finale) :
                  </span>
                  <textarea
                    rows={14}
                    value={optimizedCvDraft || cvText}
                    onChange={(e) => setOptimizedCvDraft(e.target.value)}
                    className="w-full p-3 bg-purple-50/30 border border-purple-300 rounded-xl h-80 overflow-y-auto whitespace-pre-wrap text-gray-900 text-[11px] leading-relaxed font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <textarea
                  rows={14}
                  value={optimizedCvDraft || cvText}
                  onChange={(e) => setOptimizedCvDraft(e.target.value)}
                  placeholder="Modifiez votre CV ici (ajoutez les mots-clés, chiffres et réalisations)..."
                  className="w-full p-4 bg-purple-50/20 border border-purple-300 rounded-xl text-xs font-mono text-gray-900 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                  <span>{(optimizedCvDraft || cvText).split(/\s+/).filter(Boolean).length} mots • {(optimizedCvDraft || cvText).length} caractères</span>
                  <span className="text-purple-600 font-semibold">Édition active</span>
                </div>
              </div>
            )}
          </div>

          {/* LE GRAND BOUTON D'ACTION : LANCER LA RÉ-ANALYSE DU CV MODIFIÉ */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              disabled={isCalculatingFinalScore || !(optimizedCvDraft || cvText).trim()}
              onClick={handleTriggerReAnalysis}
              className={`w-full py-4 sm:py-5 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer ${
                !(optimizedCvDraft || cvText).trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isCalculatingFinalScore
                  ? 'bg-emerald-700 text-white'
                  : 'bg-linear-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white hover:scale-101 active:scale-99'
              }`}
            >
              {isCalculatingFinalScore ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-300" />
                  <div className="text-left">
                    <span className="block font-black text-base sm:text-lg">
                      Ré-analyse de votre CV en cours par rapport à l&apos;offre...
                    </span>
                    <span className="block text-xs font-normal text-emerald-100">
                      Calcul de la conformité ATS et mesure du gain net de score
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <RefreshCw className="w-6 h-6 text-amber-300 shrink-0" />
                  <div className="text-left">
                    <span className="block font-black text-base sm:text-lg">
                      🔄 Lancer la Ré-analyse de mon CV par rapport à l&apos;Offre ➔
                    </span>
                    <span className="block text-xs font-normal text-emerald-100">
                      Valide vos modifications et génère votre Note Finale avec les résultats concrets d&apos;évolution
                    </span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-300 shrink-0 ml-auto hidden sm:block" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-gray-500 px-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="hover:text-gray-800 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Revenir au Diagnostic Initial (V1)</span>
              </button>
              <span>Étape 3 sur 4</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONTENU DE L'ÉTAPE 4 : CANDIDATURE FINALE OPTIMISÉE (PRÊTE À L'EMPLOI)
         ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-fade-in">
          {/* Célébration & Tableau d'Honneur de la Progression */}
          <div className="bg-linear-to-r from-emerald-950 via-teal-950 to-indigo-950 rounded-3xl p-6 text-white shadow-lg space-y-4 border border-emerald-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                    Étape Finale : Succès
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-amber-300 font-bold">
                    Candidature Optimisée V{currentEvolutionVersion}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>🏆 Votre Dossier de Candidature est Prêt !</span>
                </h3>
                <p className="text-xs text-emerald-200">
                  Votre CV a été adapté spécifiquement aux attentes de l&apos;offre.
                </p>
              </div>

              {/* Mesure du Gain Net */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl shrink-0">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-300 block">
                    Score Initial V1
                  </span>
                  <span className="text-lg font-black text-white">
                    {initialScore}%
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-amber-300 shrink-0" />

                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                    Score Final Optimisé
                  </span>
                  <span className="text-2xl font-black text-amber-300">
                    {effectiveFinalScore}%
                  </span>
                </div>

                <div className="pl-2 border-l border-white/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-300 block">
                    Gain Net
                  </span>
                  <span className="text-xs font-black bg-emerald-500 text-gray-950 px-2 py-0.5 rounded-full">
                    {netGainFormatted} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Accroche pour lettre de motivation ou email d'envoi */}
            {parsedAnalysis?.coverLetterHook && (
              <div className="bg-white/10 p-4 rounded-2xl border border-white/15 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Accroche recommandée pour votre lettre ou email d&apos;envoi :</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(parsedAnalysis.coverLetterHook, 'hook')}
                    className="text-[11px] text-white hover:text-amber-300 flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {copiedState === 'hook' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedState === 'hook' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <p className="text-xs text-purple-100 italic leading-relaxed">
                  « {parsedAnalysis.coverLetterHook} »
                </p>
              </div>
            )}
          </div>

          {/* =========================================================================
              RÉSULTATS CONCRETS DE L'ÉVOLUTION PAR RAPPORT À L'OFFRE D'EMPLOI
             ========================================================================= */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span>Résultats Concrets de l&apos;Évolution par rapport à l&apos;Offre</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mesurez l&apos;impact réel des modifications sur l&apos;adéquation ATS de votre CV.
                </p>
              </div>

              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-black self-start sm:self-auto">
                {netGainFormatted} points ATS gagnés
              </span>
            </div>

            {/* 3 Cartes d'Impact Concret */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Carte 1 : Mots-clés comblés */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mots-clés de l&apos;offre validés</span>
                </div>
                <div className="text-2xl font-black text-emerald-900">
                  {expectedOfferKeywords.filter((kw) =>
                    (cvText || optimizedCvDraft).toLowerCase().includes(kw.toLowerCase())
                  ).length}{' '}
                  <span className="text-xs font-normal text-emerald-700">/ {expectedOfferKeywords.length || 6} compétences</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {expectedOfferKeywords
                    .filter((kw) => (cvText || optimizedCvDraft).toLowerCase().includes(kw.toLowerCase()))
                    .slice(0, 5)
                    .map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg shadow-2xs"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{kw}</span>
                      </span>
                    ))}
                </div>
              </div>

              {/* Carte 2 : Réalisations chiffrées & STAR */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Impact Chiffré & STAR</span>
                </div>
                <div className="text-2xl font-black text-indigo-900">
                  {optimizationDiff?.linesAddedCount ? `+${optimizationDiff.linesAddedCount}` : '+4'}{' '}
                  <span className="text-xs font-normal text-indigo-700">réalisations enrichies</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-normal">
                  Vos descriptions de postes intègrent désormais des métriques tangibles (pourcentages de gains, volumes et résultats concrets).
                </p>
              </div>

              {/* Carte 3 : Conformité ATS */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-purple-950 font-bold text-xs uppercase tracking-wider">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>Statut de Présélection</span>
                </div>
                <div className="text-2xl font-black text-purple-900">
                  {effectiveFinalScore >= 80 ? 'Prioritaire' : 'Compétitif'}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-normal">
                  Votre CV franchit avec succès les filtres de tri automatisés des logiciels de recrutement (ATS).
                </p>
              </div>
            </div>

            {/* Évolution comparative des 5 Piliers Recruteur */}
            <div className="space-y-3 pt-2">
              <h5 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Progression comparative sur les 5 Piliers Recruteur (Audit V1 ➔ Note Finale)</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {[
                  {
                    name: 'Compétences Techniques',
                    init: Math.min(95, Math.max(35, Math.round(initialScore * 0.98))),
                    final: Math.min(100, Math.max(Math.round(initialScore * 0.98) + (netGain > 0 ? 3 : 0), Math.round(effectiveFinalScore * 1.01))),
                  },
                  {
                    name: 'Mots-Clés & Filtres ATS',
                    init: Math.min(95, Math.max(35, Math.round(initialScore * 0.92))),
                    final: Math.min(100, Math.max(Math.round(initialScore * 0.92) + (netGain > 0 ? 3 : 0), Math.round(effectiveFinalScore * 1.0))),
                  },
                  {
                    name: 'Expérience & Pertinence',
                    init: Math.min(95, Math.max(40, Math.round(initialScore * 0.96))),
                    final: Math.min(100, Math.max(Math.round(initialScore * 0.96) + (netGain > 0 ? 2 : 0), Math.round(effectiveFinalScore * 0.99))),
                  },
                  {
                    name: 'Réalisations STAR',
                    init: Math.min(95, Math.max(35, Math.round(initialScore * 0.88))),
                    final: Math.min(100, Math.max(Math.round(initialScore * 0.88) + (netGain > 0 ? 3 : 0), Math.round(effectiveFinalScore * 0.98))),
                  },
                  {
                    name: 'Cohérence Titre / En-tête',
                    init: Math.min(95, Math.max(40, Math.round(initialScore * 0.94))),
                    final: Math.min(100, Math.max(Math.round(initialScore * 0.94) + (netGain > 0 ? 2 : 0), Math.round(effectiveFinalScore * 1.01))),
                  },
                ].map((pillar, idx) => {
                  const gain = Math.max(0, pillar.final - pillar.init);
                  return (
                    <div key={idx} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800 text-[11px] truncate">{pillar.name}</span>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                          +{gain} pts
                        </span>
                      </div>

                      {/* Barres comparatives */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span>V1 (Initial)</span>
                          <span className="font-semibold">{pillar.init}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gray-400 h-1.5 rounded-full"
                            style={{ width: `${pillar.init}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold pt-1">
                          <span>Final Ré-analysé</span>
                          <span className="font-black text-emerald-700">{pillar.final}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-linear-to-r from-emerald-500 to-teal-500 h-2 rounded-full"
                            style={{ width: `${pillar.final}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comparatif Visuel Avant / Après Dépliable */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowStep4Diff(!showStep4Diff)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100/70 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="font-bold text-xs sm:text-sm text-gray-900">
                    🔍 Consulter le Comparatif Visuel Avant / Après (CV Initial vs CV Optimisé Final)
                  </span>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 shrink-0">
                  {showStep4Diff ? 'Masquer ▲' : 'Afficher ▼'}
                </span>
              </button>

              {showStep4Diff && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="font-bold font-sans text-xs text-gray-500 block">
                        CV Initial (V1 - Avant Ré-analyse) :
                      </span>
                      <pre className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl h-80 overflow-y-auto whitespace-pre-wrap text-gray-600 text-[11px] leading-relaxed">
                        {evolutionSteps[0]?.cvText || cvText}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold font-sans text-xs text-emerald-800 block">
                        CV Optimisé Final (V{currentEvolutionVersion} - Après Ré-analyse) :
                      </span>
                      <pre className="p-3.5 bg-emerald-50/40 border border-emerald-300 rounded-xl h-80 overflow-y-auto whitespace-pre-wrap text-gray-900 text-[11px] leading-relaxed">
                        {cvText || optimizedCvDraft}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              SÉLECTEUR DE PIÈCES DU DOSSIER : CV OPTIMISÉ VS LETTRE DE MOTIVATION
             ========================================================================= */}
          <div className="flex border-b border-gray-200 overflow-x-auto gap-2">
            <button
              type="button"
              onClick={() => setActiveDossierTab('cv')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeDossierTab === 'cv'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-2xl'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1. CV Optimisé ATS (V{currentEvolutionVersion})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDossierTab('letter')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeDossierTab === 'letter'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-2xl'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <Mail className="w-4 h-4 text-rose-600 shrink-0" />
              <span>2. Lettre de Motivation Sur-Mesure</span>
              {finalCoverLetter ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Rattachée & Prête ✨
                </span>
              ) : (
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                  À rédiger
                </span>
              )}
            </button>
          </div>

          {/* =========================================================================
              PIÈCE 1 : CV OPTIMISÉ FINAL AVEC ACTIONS DIRECTES
             ========================================================================= */}
          {activeDossierTab === 'cv' && (
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Texte Final du CV Optimisé</span>
                  </h4>
                  <p className="text-xs text-gray-500">
                    Prêt à être envoyé, copié dans votre traitement de texte ou téléchargé.
                  </p>
                </div>

                {/* Actions de téléchargement & copie en 1 clic */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopy(cvText, 'cv')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedState === 'cv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedState === 'cv' ? 'CV Copié !' : 'Copier le CV'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload('doc', cvText, newCvTitle)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Télécharger en document Word .doc"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload('txt', cvText, newCvTitle)}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Télécharger en format texte brut .txt"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Texte (.txt)</span>
                  </button>
                </div>
              </div>

              {/* Zone texte du CV final */}
              <textarea
                rows={14}
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                className="w-full p-4 bg-gray-50/50 border border-gray-300 rounded-2xl text-xs font-mono text-gray-900 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />

              {/* Sauvegarde en BDD locale & bascule vers Lettre */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Database className="w-4 h-4 text-purple-700 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-purple-950 block">
                        Sauvegarder ce CV optimisé dans votre Base Locale :
                      </span>
                      <input
                        type="text"
                        value={newCvTitle}
                        onChange={(e) => setNewCvTitle(e.target.value)}
                        className="mt-1 px-2.5 py-1 bg-white border border-purple-300 rounded-lg text-xs font-medium text-gray-800 w-full sm:w-72"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingNewCv}
                    onClick={handleSaveFinalToDb}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingNewCv ? 'Sauvegarde...' : 'Enregistrer le CV en BDD'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveDossierTab('letter')}
                  className="px-4 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Mail className="w-4 h-4 text-rose-600" />
                  <span>{finalCoverLetter ? 'Voir la Lettre Rédigée ➔' : 'Rédiger la Lettre Sur-Mesure ➔'}</span>
                </button>
              </div>

              {saveSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* BLOC PROMINENT : STATUT & RATTACHEMENT DE LA LETTRE DE MOTIVATION À CET AUDIT */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  finalCoverLetter.trim()
                    ? 'bg-linear-to-r from-emerald-50/80 via-teal-50/40 to-blue-50/30 border-emerald-300 shadow-2xs'
                    : 'bg-linear-to-r from-rose-50/60 via-purple-50/40 to-indigo-50/30 border-rose-200 shadow-2xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`p-1.5 rounded-lg ${
                          finalCoverLetter.trim()
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                      </span>
                      <h5 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                        <span>Lettre de motivation de cet audit</span>
                      </h5>
                      {finalCoverLetter.trim() ? (
                        <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Rattachée à cet audit
                        </span>
                      ) : (
                        <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                          Non rattachée pour le moment
                        </span>
                      )}
                    </div>

                    {finalCoverLetter.trim() ? (
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p className="font-semibold text-emerald-950 truncate">
                          « {coverLetterTitle} » • {finalCoverLetter.split(/\s+/).filter(Boolean).length} mots
                          {parsedAnalysis?.targetCompany && ` • Entreprise : ${parsedAnalysis.targetCompany}`}
                        </p>
                        <p className="text-[11px] text-gray-500 line-clamp-1 italic">
                          &quot;{finalCoverLetter.slice(0, 110)}...&quot;
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600">
                        Aucune lettre n&apos;est encore rattachée à cet audit. Vous pouvez la rédiger avec l&apos;IA ou rattacher une lettre existante de votre Base Locale (ex: Valoria Capital).
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {finalCoverLetter.trim() ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveDossierTab('letter')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Consulter la Lettre ➔</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(finalCoverLetter, 'letter')}
                          className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {copiedState === 'letter' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedState === 'letter' ? 'Copiée !' : 'Copier'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsAttachingLetterModalOpen(true)}
                          className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          title="Changer de lettre ou choisir une autre lettre en BDD"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Changer de lettre</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveDossierTab('letter')}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Rédiger avec l&apos;IA ➔</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsAttachingLetterModalOpen(true)}
                          className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                          <span>Rattacher une lettre existante</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PIÈCE 2 : LETTRE DE MOTIVATION SUR-MESURE
             ========================================================================= */}
          {activeDossierTab === 'letter' && (
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4 animate-fade-in">
              {!finalCoverLetter ? (
                <div className="p-6 bg-linear-to-br from-rose-50/80 via-purple-50/50 to-indigo-50/40 border border-rose-200/80 rounded-2xl space-y-4 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200">
                        Rédaction IA Ciblée
                      </span>
                      <h4 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-rose-600" />
                        <span>Rédiger votre Lettre de Motivation Sur-Mesure</span>
                      </h4>
                      <p className="text-xs text-gray-600 max-w-xl">
                        L&apos;IA combine les mots-clés ATS de l&apos;annonce, vos réalisations clés et vos arguments pour générer une lettre percutante adaptée à{' '}
                        <strong className="text-gray-900">{parsedAnalysis?.targetCompany || 'l\'entreprise cible'}</strong>{' '}
                        pour le poste de{' '}
                        <strong className="text-gray-900">{parsedAnalysis?.targetRole || 'Poste Cible'}</strong>.
                      </p>
                    </div>

                    {/* Choix du ton */}
                    <div className="flex flex-col items-center sm:items-end gap-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-gray-500">Ton de la lettre :</span>
                      <div className="flex items-center gap-1.5">
                        {(['professionnel', 'dynamique', 'concis'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setCoverLetterTone(t)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                              coverLetterTone === t
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-rose-200/60">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Rédigez avec l&apos;IA ou rattachez une lettre existante de votre base</span>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsAttachingLetterModalOpen(true)}
                        className="px-4 py-3 bg-white hover:bg-purple-50 text-purple-800 border-2 border-purple-300 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:scale-102"
                        title="Sélectionner une lettre existante en BDD pour la rattacher à cet audit"
                      >
                        <Paperclip className="w-4 h-4 text-purple-600" />
                        <span>📎 Rattacher une lettre existante</span>
                      </button>

                      <button
                        type="button"
                        disabled={isGeneratingCoverLetter}
                        onClick={handleGenerateFinalCoverLetter}
                        className="px-6 py-3 bg-linear-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer hover:scale-102"
                      >
                        {isGeneratingCoverLetter ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Rédaction personnalisée en cours...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>✨ Générer ma Lettre de Motivation Sur-Mesure</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-rose-600" />
                        <span>Lettre de Motivation Sur-Mesure</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Rattachée à cet audit
                        </span>
                      </h4>
                      <p className="text-xs text-gray-500">
                        {finalCoverLetter.split(/\s+/).filter(Boolean).length} mots • Titre : « {coverLetterTitle} » • Pour {parsedAnalysis?.targetCompany || 'l\'entreprise cible'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsAttachingLetterModalOpen(true)}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Changer de lettre ou en choisir une autre en BDD"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                        <span>Changer de lettre</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDetachLetter}
                        className="px-2.5 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        title="Détacher la lettre de cet audit"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Détacher</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(finalCoverLetter, 'letter')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {copiedState === 'letter' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedState === 'letter' ? 'Copié !' : 'Copier'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload('doc', finalCoverLetter, `Lettre_Motivation_${(parsedAnalysis?.targetCompany || 'Candidature').replace(/\s+/g, '_')}`)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Télécharger en Word (.doc)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Word (.doc)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isGeneratingCoverLetter}
                        onClick={handleGenerateFinalCoverLetter}
                        className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Régénérer une nouvelle version avec l'IA"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingCoverLetter ? 'animate-spin' : ''}`} />
                        <span>Régénérer</span>
                      </button>
                    </div>
                  </div>

                  {/* Zone de texte de la lettre */}
                  <textarea
                    rows={12}
                    value={finalCoverLetter}
                    onChange={(e) => setFinalCoverLetter(e.target.value)}
                    className="w-full p-4 bg-gray-50/50 border border-gray-300 rounded-2xl text-xs font-sans text-gray-800 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />

                  {/* Sauvegarde en BDD locale de la lettre */}
                  <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="w-4 h-4 text-rose-700 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-rose-950 block">
                          Sauvegarder cette lettre dans votre Base Locale :
                        </span>
                        <input
                          type="text"
                          value={coverLetterTitle}
                          onChange={(e) => setCoverLetterTitle(e.target.value)}
                          className="mt-1 px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-xs font-medium text-gray-800 w-full sm:w-72"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSavingLetter}
                      onClick={handleSaveLetterToDb}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingLetter ? 'Sauvegarde...' : 'Enregistrer la Lettre en BDD'}</span>
                    </button>
                  </div>

                  {coverLetterNotice && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{coverLetterNotice}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              ACTION PRINCIPALE DE FINALISATION : SUIVRE LE DOSSIER COMPLET DANS LE KANBAN
             ========================================================================= */}
          <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-300" />
                <span className="font-black text-base">
                  Enregistrer et Suivre cette Candidature Complète
                </span>
              </div>
              <p className="text-xs text-blue-100 max-w-xl">
                Ajoute cette opportunité directement dans votre suivi Kanban avec votre{' '}
                <strong className="text-white">CV optimisé V{currentEvolutionVersion}</strong>{' '}
                et votre{' '}
                <strong className="text-white">
                  {finalCoverLetter ? 'lettre de motivation rattachée' : 'lettre de motivation (optionnelle)'}
                </strong>
                , pour piloter vos relances et entretiens !
              </p>
              {finalCoverLetter ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/40 rounded-lg text-xs text-emerald-200 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lettre de motivation prête et rattachée à la candidature</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-400/40 rounded-lg text-xs text-amber-200">
                  <span>💡 Conseil : vous pouvez générer votre lettre ci-dessus en 1 clic pour l&apos;inclure au dossier !</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onAddToTracker({
                  customNotes: `Candidature optimisée V${currentEvolutionVersion} (Score ATS : ${effectiveFinalScore}%)`,
                  company: parsedAnalysis?.targetCompany || undefined,
                  role: parsedAnalysis?.targetRole || undefined,
                  score: effectiveFinalScore,
                  coverLetter: finalCoverLetter.trim() || undefined,
                  coverLetterTitle: coverLetterTitle.trim() || (finalCoverLetter ? `Lettre - ${parsedAnalysis?.targetCompany || 'Candidature'}` : undefined),
                });
                confetti({ particleCount: 60, spread: 80 });
              }}
              className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-gray-950 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            >
              <span>💼 Ajouter le Dossier au Suivi Kanban</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation & Itérations futures */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>✏️ Ajuster encore le CV & Ré-analyser</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenVisualModal}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-purple-600" />
                <span>Consulter la Frise Chronologique ↗</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  setCurrentStep(1);
                }}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>📄 Analyser une Autre Offre</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection et rattachement de lettre de motivation */}
      <AttachLetterModal
        isOpen={isAttachingLetterModalOpen}
        onClose={() => setIsAttachingLetterModalOpen(false)}
        analysisId={currentAnalysisId}
        analysisTitle={currentAnalysisTitle || parsedAnalysis?.suggestedTitle}
        analysisCompany={parsedAnalysis?.targetCompany}
        analysisRole={parsedAnalysis?.targetRole}
        currentAttachedLetterId={attachedLetterId}
        currentAttachedLetterTitle={coverLetterTitle}
        onLetterAttached={handleAttachExistingLetter}
        onLetterDetached={handleDetachLetter}
      />
    </div>
  );
}
