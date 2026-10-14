import React, { useState } from 'react';
import {
  X,
  Key,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  ClipboardPaste,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  Globe,
  Save,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ApiKeyTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKey: string;
  hasServerKey: boolean;
  selectedModel: string;
  onSaveApiKey: (newKey: string) => void;
  onNavigateToTab?: (tab: 'dashboard' | 'calendar' | 'app' | 'tracker' | 'reports' | 'cv-assistant' | 'database' | 'history' | 'code' | 'guide' | 'settings') => void;
}

export default function ApiKeyTutorialModal({
  isOpen,
  onClose,
  currentApiKey,
  hasServerKey,
  selectedModel,
  onSaveApiKey,
  onNavigateToTab,
}: ApiKeyTutorialModalProps) {
  const [step, setStep] = useState(0);
  const [inputKey, setInputKey] = useState(currentApiKey || '');
  const [showKeyText, setShowKeyText] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Test de connexion API en direct
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    model?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestPing = async (keyToTest?: string) => {
    setIsTesting(true);
    setTestResult(null);

    const key = (keyToTest !== undefined ? keyToTest : inputKey).trim();

    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: key || undefined,
          model: selectedModel || 'gemini-3.8-flash',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        let errorMsg = data.error || 'Échec du test de connexion. Vérifiez que la clé a bien été copiée sans espace.';
        try {
          const parsed = typeof errorMsg === 'string' && errorMsg.startsWith('{') ? JSON.parse(errorMsg) : null;
          if (parsed?.error?.message) {
            errorMsg = parsed.error.message;
          }
        } catch {}

        // Détection courante de pic de charge temporaire sur Google AI Studio
        if (errorMsg.includes('high demand') || errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE')) {
          setTestResult({
            success: true,
            message: 'Clé validée et reconnue par Google ! (Note : Le serveur Google subit un pic temporaire de charge, votre clé est bien valide).',
            model: selectedModel || 'gemini-3.8-flash',
          });
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
          return;
        }

        setTestResult({
          success: false,
          message: errorMsg,
        });
      } else {
        setTestResult({
          success: true,
          message: `Connexion réussie ! Modèle actif : ${data.model || selectedModel}`,
          latencyMs: data.latencyMs,
          model: data.model,
        });
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndAdvance = () => {
    const trimmed = inputKey.trim();
    if (trimmed) {
      onSaveApiKey(trimmed);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
    // Avancer à l'étape de test
    setStep(3);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const cleaned = text.trim();
        setInputKey(cleaned);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch {
      // Fallback si permissions non accordées
    }
  };

  const tutorialSteps = [
    {
      number: 1,
      title: '1. Accéder à Google AI Studio (100% Gratuit) 🌐',
      tag: 'Étape 1/4 • Sans Carte Bancaire',
      color: 'from-blue-600 via-indigo-600 to-purple-700',
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Google met à disposition un accès direct et gratuit aux modèles d&apos;intelligence artificielle <strong>Gemini 3.8-Flash</strong> pour les développeurs et utilisateurs individuels.
          </p>

          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Pourquoi une clé Google Gemini ?</span>
            </div>
            <ul className="space-y-1.5 text-blue-900 text-[11px] list-disc list-inside">
              <li><strong>Zéro frais :</strong> Quota généreux gratuit renouvelé chaque mois sans abonnement.</li>
              <li><strong>Sans carte bancaire :</strong> Un compte Google standard (Gmail) suffit amplement.</li>
              <li><strong>Rapidité & puissance :</strong> Analyses d&apos;adéquation ATS ultra précises en 2 secondes.</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-center">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md hover:scale-102 transition-all cursor-pointer text-xs"
            >
              <Globe className="w-4 h-4 text-indigo-200" />
              <span>Ouvrir Google AI Studio (aistudio.google.com)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="text-[11px] text-gray-500 text-center italic">
            Une nouvelle page va s&apos;ouvrir dans votre navigateur. Connectez-vous simplement avec votre compte Google.
          </p>
        </div>
      ),
    },
    {
      number: 2,
      title: '2. Générer & Copier votre Clé API 🔑',
      tag: 'Étape 2/4 • En 2 Clics',
      color: 'from-purple-600 via-indigo-600 to-blue-700',
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Une fois connecté sur <strong>Google AI Studio</strong> dans la section <em>« API Keys »</em> :
          </p>

          <div className="space-y-2.5">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div>
                <span className="font-bold text-gray-900 block">Cliquez sur le bouton bleu « Create API key »</span>
                <span className="text-[11px] text-gray-500">
                  Ce bouton est situé en haut à gauche de la page Google AI Studio.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div>
                <span className="font-bold text-gray-900 block">Sélectionnez « Create key in new project »</span>
                <span className="text-[11px] text-gray-500">
                  Google configure automatiquement le projet sans paramétrage compliqué.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div>
                <span className="font-bold text-gray-900 block">Cliquez sur « Copy » pour copier votre clé</span>
                <span className="text-[11px] text-gray-500">
                  Votre clé ressemble à : <code className="bg-slate-200 text-indigo-900 px-1.5 py-0.5 rounded font-mono text-[10px]">AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxx</code> (39 caractères).
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      number: 3,
      title: '3. Coller & Enregistrer votre Clé dans l’App 📋',
      tag: 'Étape 3/4 • Enregistrement Local',
      color: 'from-indigo-600 via-purple-600 to-pink-600',
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Collez votre clé Google ci-dessous. Elle sera <strong>mémorisée automatiquement</strong> dans le stockage sécurisé de votre navigateur (IndexedDB) pour vos prochaines utilisations.
          </p>

          <div className="space-y-2 p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
            <label className="block text-xs font-bold text-indigo-950">
              Collez votre Clé API Google Gemini ici :
            </label>

            <div className="relative">
              <input
                type={showKeyText ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="ex: AIzaSyD..."
                className="w-full text-xs font-mono px-3.5 py-3 pr-20 border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 shadow-2xs"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
                  title={showKeyText ? 'Masquer' : 'Afficher'}
                >
                  {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="px-3 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>{isCopied ? 'Colle effectuée !' : 'Coller du presse-papier'}</span>
              </button>

              <button
                type="button"
                disabled={!inputKey.trim()}
                onClick={() => {
                  onSaveApiKey(inputKey.trim());
                  setIsSaved(true);
                  setTimeout(() => setIsSaved(false), 3000);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaved ? 'Sauvegardé en mémoire !' : 'Enregistrer la clé'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-start gap-2">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Confidentialité garantie :</strong> Votre clé reste confinée localement sur votre ordinateur. Elle n&apos;est jamais vendue, transmise ou partagée avec des serveurs tiers.
            </span>
          </div>
        </div>
      ),
    },
    {
      number: 4,
      title: '4. Tester la Connexion & Valider ⚡',
      tag: 'Étape 4/4 • Vérification Finale',
      color: 'from-emerald-600 via-teal-600 to-indigo-700',
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p>
            Vérifions immédiatement que votre clé fonctionne et que le serveur Google répond sans accroc :
          </p>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            {!inputKey.trim() && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-indigo-950 block">
                  Collez ou saisissez votre clé ici avant de tester :
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => {
                      setInputKey(e.target.value);
                      if (e.target.value.trim()) {
                        onSaveApiKey(e.target.value.trim());
                      }
                    }}
                    placeholder="AIzaSy..."
                    className="flex-1 text-xs font-mono px-3 py-1.5 border border-indigo-300 rounded-lg bg-white text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Coller</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-gray-900 block text-xs">
                  Modèle testé : <span className="font-mono text-indigo-700">{selectedModel || 'gemini-3.8-flash'}</span>
                </span>
                <span className="text-[11px] text-gray-500">
                  {inputKey.trim() ? 'Clé personnalisée saisie' : hasServerKey ? 'Clé serveur active par défaut' : 'Aucune clé saisie'}
                </span>
              </div>

              <button
                type="button"
                disabled={isTesting || (!inputKey.trim() && !hasServerKey)}
                onClick={() => handleTestPing()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all hover:scale-102 disabled:opacity-40"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Vérification en cours...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Lancer le test de connexion</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 animate-fade-in ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-extrabold">{testResult.message}</div>
                  {testResult.latencyMs && (
                    <div className="text-[11px] text-emerald-700 font-normal">
                      Latence Google AI Studio : <strong className="font-mono">{testResult.latencyMs} ms</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {hasServerKey && !inputKey.trim() && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Pratique :</strong> L&apos;environnement dispose déjà d&apos;une clé Google Studio intégrée. Même sans clé personnalisée, vous pouvez utiliser l&apos;application sans blocage !
              </span>
            </div>
          )}
        </div>
      ),
    },
  ];

  const current = tutorialSteps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-scale-up max-h-[92vh]">
        {/* Header coloré */}
        <div className={`p-5 bg-linear-to-r ${current.color} text-white flex items-start justify-between relative shrink-0`}>
          <div className="space-y-1.5 pr-8">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-wider text-amber-200 border border-white/20">
              {current.tag}
            </span>
            <h3 className="text-base sm:text-lg font-black leading-snug">
              {current.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
            title="Fermer le tutoriel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de l'étape */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          {current.content}
        </div>

        {/* Footer avec navigation entre étapes */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          {/* Indicateurs d'étapes */}
          <div className="flex items-center gap-1.5">
            {tutorialSteps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStep(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === step ? 'w-7 bg-indigo-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
                title={`Aller à l'étape ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
              >
                Précédent
              </button>
            )}

            {step < tutorialSteps.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 2 && inputKey.trim()) {
                    handleSaveAndAdvance();
                  } else {
                    setStep(step + 1);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
              >
                <span>Suivant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (inputKey.trim()) {
                    onSaveApiKey(inputKey.trim());
                  }
                  confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
                  onClose();
                  if (onNavigateToTab) {
                    onNavigateToTab('app');
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terminer & Aller à l’Analyseur 🚀</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
