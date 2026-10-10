import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  FileCheck,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Zap,
  Layers,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { AnimatedCoachMascot, CoachMood } from './AnimatedCoachMascot';
import { UserProfile } from '../types';

const API_BASE_URL =
  typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    targetSection?: 'summary' | 'experience' | 'skills' | 'full';
    contentToInsert: string;
  };
}

interface CvCoachChatbotProps {
  currentCvText?: string;
  onApplyTextToCv?: (text: string, section?: 'summary' | 'experience' | 'skills' | 'full') => void;
  apiKey?: string;
  hasServerKey?: boolean;
  userProfile?: UserProfile | null;
  targetRole?: string;
  selectedSector?: string;
}

const QUICK_SUGGESTIONS = [
  { label: '🪄 Rédiger mon accroche pro', prompt: 'Peux-tu rédiger une phrase d’accroche percutante de 3 lignes pour mon profil, adaptée aux recruteurs et aux filtres ATS ?' },
  { label: '📈 Transformer une puce en STAR', prompt: 'Voici une de mes missions passées : "J\'étais en charge de la gestion de projet et de la relation client". Peux-tu la reformuler selon la méthode STAR avec des indicateurs chiffrés percutants ?' },
  { label: '🔍 Mots-clés ATS indispensables', prompt: 'Quels sont les mots-clés techniques, outils et compétences indispensables à faire figurer sur mon CV pour maximiser mon score ATS ?' },
  { label: '🔄 Valoriser une reconversion', prompt: 'Je suis en reconversion professionnelle. Comment formuler mon résumé pour valoriser mes compétences transférables sans que mon changement de voie ne paraisse pénalisant ?' },
  { label: '🇬🇧 Adapter mon profil en anglais', prompt: 'Comment adapter l’en-tête et le résumé professionnel de mon profil au format US/UK ATS en anglais ?' },
];

export const CvCoachChatbot: React.FC<CvCoachChatbotProps> = ({
  currentCvText = '',
  onApplyTextToCv,
  apiKey,
  hasServerKey,
  userProfile,
  targetRole = '',
  selectedSector = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'coach',
      text: `👋 **Bonjour ! Je suis Félix, ton coach personnel en rédaction de CV & optimisation ATS.**

Je suis là pour t'accompagner pas à pas dans l'élaboration de ton CV :
- ✍️ **Formuler des réalisations avec la méthode STAR** (Situation, Tâche, Action, Résultat chiffré)
- 🚀 **Rédiger une accroche professionnelle irrésistible**
- 🔑 **Injecter les mots-clés stratégiques** recherchés par les recruteurs de ton secteur
- 🌍 **Adapter ton CV en anglais ou pour une reconversion**

Pose-moi une question ou choisis une suggestion rapide ci-dessous !`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [coachMood, setCoachMood] = useState<CoachMood>('happy');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    setInputPrompt('');
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setCoachMood('writing');

    try {
      let botReply = '';
      let suggestedInsertion: ChatMessage['suggestedAction'] | undefined;

      const response = await apiFetch('/api/assist-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'coach_chat',
          input: textToSend,
          targetRole: targetRole || userProfile?.currentTitle || 'Candidat',
          currentCv: currentCvText.slice(0, 1500),
          sector: selectedSector,
          apiKey: apiKey?.trim() || undefined,
          demoFallback: true,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.result) {
        botReply = data.result;
      } else {
        // Moteur heuristique autonome de coaching direct (réponse immédiate)
        botReply = generateAutonomousCoachReply(textToSend, targetRole, userProfile);
      }

      // Détecter si la réponse contient du contenu insérable (texte formaté entre guillemets ou sous une puce)
      const extractCleanText = botReply.match(/["«]([^"»]{40,})["»]/);
      if (extractCleanText && extractCleanText[1]) {
        suggestedInsertion = {
          label: '✨ Insérer ce passage dans mon CV',
          contentToInsert: extractCleanText[1].trim(),
        };
      }

      const botMsg: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: suggestedInsertion,
      };

      setMessages((prev) => [...prev, botMsg]);
      setCoachMood('celebrating');
      setTimeout(() => setCoachMood('happy'), 3000);
    } catch {
      const fallbackReply = generateAutonomousCoachReply(textToSend, targetRole, userProfile);
      setMessages((prev) => [
        ...prev,
        {
          id: `coach-${Date.now()}`,
          sender: 'coach',
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setCoachMood('happy');
    } finally {
      setIsLoading(false);
    }
  };

  // Moteur heuristique local de conseils coach
  function generateAutonomousCoachReply(
    prompt: string,
    role: string,
    profile?: UserProfile | null
  ): string {
    const p = prompt.toLowerCase();
    const effectiveRole = role || profile?.targetRoles?.[0] || profile?.currentTitle || 'votre métier cible';

    if (p.includes('accroche') || p.includes('résumé') || p.includes('profil') || p.includes('bio')) {
      return `Voici une proposition d'accroche professionnelle percutante et calibrée pour les filtres ATS :

> « Professionnel rigoureux et orienté résultats avec une solide expérience en **${effectiveRole}**. Expert dans la gestion de projets complexes, l'optimisation des processus et l'atteinte d'objectifs chiffrés. Reconnu pour ma capacité à fédérer des équipes pluridisciplinaires et à générer un impact mesurable dès les premières semaines. »

💡 **Le conseil de Félix :** Place cette phrase juste sous ton titre de CV. Elle capte l'œil du recruteur en 3 secondes chrono !`;
    }

    if (p.includes('star') || p.includes('mission') || p.includes('puce') || p.includes('expérience')) {
      return `Voici comment transformer ton expérience selon la méthode **STAR (Situation, Tâche, Action, Résultat)** :

- **Avant (trop vague) :** *« En charge de la gestion de projet et de la relation client »*
- **Après (impact STAR maximal) :** 
> « Pilotage de 14 projets stratégiques (budget total de 180 000€) avec un taux de livraison dans les délais de **98%**. Amélioration du score de satisfaction client (**CSAT : 4.8/5**) et réduction des coûts opérationnels de **15%**. »

💡 **Le conseil de Félix :** Utilise toujours un verbe d'action au début (*Pilotage*, *Déploiement*, *Négociation*, *Conception*) et au moins un chiffre clé !`;
    }

    if (p.includes('mot-clé') || p.includes('mots-clés') || p.includes('ats') || p.includes('compétence')) {
      return `Pour maximiser ton score de compatibilité ATS sur le poste de **${effectiveRole}**, intègre impérativement ces 3 catégories de mots-clés :

1. **Outils & Progiciels concrets :** Indique les progiciels exacts (ex: *SAP, Salesforce, Jira, Power BI, Excel avancé (VBA, Power Query)*).
2. **Méthodologies reconnues :** *Agile Scrum, Cycle en V, Lean Management, Méthode STAR, Analyse de données*.
3. **Soft skills opérationnelles :** *Leadership transverse, Négociation grands comptes, Rigueur analytique, Gestion des priorités sous contrainte de temps*.

💡 **Le conseil de Félix :** Répartis ces mots-clés à la fois dans ta section "Compétences" ET dans les descriptions de tes missions passées.`;
    }

    if (p.includes('anglais') || p.includes('english') || p.includes('uk') || p.includes('us')) {
      return `Sur un CV en anglais (Resume format international), voici la formule magique :

> **« Dynamic and results-oriented ${effectiveRole} with proven track record in delivering high-impact projects. Strong expertise in cross-functional team leadership, strategic planning, and operational efficiency with demonstrated ability to exceed annual business KPIs. »**

💡 **Le conseil de Félix :** Sur un CV anglophone :
- Ne mentionne **jamais** ton âge, ta nationalité ou ta situation familiale.
- Pas de photo d'identité (loi anti-discrimination stricte).
- Remplace la rubrique "Missions" par **« Key Achievements »** !`;
    }

    if (p.includes('reconversion') || p.includes('changement')) {
      return `Pour une reconversion réussie vers **${effectiveRole}** :

1. **Le titre avant tout :** Indique directement le titre du métier visé (ex: *« ${effectiveRole} »* ou *« En transition vers ${effectiveRole} »*).
2. **Compétences transférables en tête :** Mets en valeur ce que ton métier précédent t'a appris (organisation, sens du service, gestion du stress, relation client).
3. **Formations récentes & Projets :** Mets en exergue tes certifications ou formations récentes tout en haut du CV !

💡 **Le conseil de Félix :** Ton passé professionnel est une force : il montre ta polyvalence et ta maturité par rapport à un profil débutant classique !`;
    }

    return `Superbe question ! Pour faire passer ton CV de **${effectiveRole}** au niveau supérieur :

- Privilégie une structure linéaire, aérée, sans colonnes superposées (les robots ATS adorent la lisibilité).
- Donne 3 à 5 puces par poste, chacune illustrant un succès concret.
- Cite tes formations et certifications en précisant l'année et l'organisme.

💡 Dis-moi quel passage ou quelle mission spécifique tu souhaites que nous retravaillions ensemble !`;
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
      {/* =========================================================================
          EN-TÊTE DU CHAT AVEC LA MASCOTTE FÉLIX
         ========================================================================= */}
      <div className="p-4 sm:p-5 bg-linear-to-r from-[#0A2540] via-[#133557] to-[#0A2540] text-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-white/10 p-1 border border-white/20 flex items-center justify-center shrink-0">
            <span className="text-2xl">👨‍💼</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                Félix, ton Coach Rédactionnel IA
              </h3>
              <span className="text-[10px] bg-[#00D287] text-[#0A2540] px-2 py-0.5 rounded-full font-black uppercase">
                En ligne ✨
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate">
              {targetRole ? `Optimisation pour : ${targetRole}` : 'Accompagnement rédactionnel sur-mesure & ATS'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessages((prev) => [
              prev[0],
              {
                id: `reset-${Date.now()}`,
                sender: 'coach',
                text: 'Conversation réinitialisée ! Sur quelle section de ton CV veux-tu travailler à présent ? 🚀',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
            setCoachMood('happy');
          }}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Réinitialiser la discussion"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* =========================================================================
          ZONE DES MESSAGES DU CHAT
         ========================================================================= */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[500px] min-h-[380px] bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 items-start ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'coach' && (
              <div className="w-8 h-8 rounded-full bg-[#0A2540] border border-[#00D287] text-white flex items-center justify-center text-xs shrink-0 shadow-2xs mt-1">
                👨‍💼
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                msg.sender === 'user'
                  ? 'bg-[#0A2540] text-white rounded-br-xs'
                  : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
              }`}
            >
              <div
                className="prose prose-xs max-w-none space-y-2 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: msg.text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-[#00D287] pl-3 py-1 my-2 bg-emerald-50/50 text-slate-900 font-medium rounded-r-md">$1</blockquote>')
                    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>'),
                }}
              />

              {/* Bouton d'action directe pour insérer le texte dans le CV */}
              {msg.suggestedAction && onApplyTextToCv && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (msg.suggestedAction) {
                        onApplyTextToCv(
                          msg.suggestedAction.contentToInsert,
                          msg.suggestedAction.targetSection
                        );
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{msg.suggestedAction.label}</span>
                  </button>
                </div>
              )}

              {/* Horodatage & Bouton Copier */}
              <div
                className={`mt-2 flex items-center justify-between text-[10px] ${
                  msg.sender === 'user' ? 'text-slate-400' : 'text-slate-400'
                }`}
              >
                <span>{msg.timestamp}</span>
                <button
                  type="button"
                  onClick={() => handleCopyMessage(msg.id, msg.text)}
                  className="hover:text-slate-700 p-1 flex items-center gap-1 cursor-pointer"
                  title="Copier le message"
                >
                  {copiedId === msg.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 font-semibold">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs shrink-0 shadow-2xs mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-full bg-[#0A2540] border border-[#00D287] text-white flex items-center justify-center text-xs shrink-0">
              ✍️
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
              <Sparkles className="w-4 h-4 text-[#00D287] animate-spin" />
              <span className="font-medium animate-pulse">
                Félix réfléchit et rédige pour ton profil...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* =========================================================================
          SUGGESTIONS RAPIDES (CHIPS CLIQUABLES)
         ========================================================================= */}
      <div className="p-3 bg-white border-t border-slate-100 overflow-x-auto select-none">
        <div className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-amber-500" />
          <span>Suggestions en 1 clic :</span>
        </div>
        <div className="flex gap-1.5 flex-nowrap pb-1">
          {QUICK_SUGGESTIONS.map((sug, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(sug.prompt)}
              className="shrink-0 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0A2540] text-[11px] font-semibold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {sug.label}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          BARRE DE SAISIE LIBRE DU MESSAGE
         ========================================================================= */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Pose une question à Félix ou colle un passage à améliorer..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00D287] focus:bg-white transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="px-4 py-2.5 bg-[#0A2540] hover:bg-[#133557] text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0"
          >
            <span>Envoyer</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CvCoachChatbot;
