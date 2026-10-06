import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Paperclip,
  Check,
  Search,
  Plus,
  X,
  Building,
  Briefcase,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { localDbClient } from '../services/localDbClient';
import type { SavedCoverLetter } from '../types';

interface AttachLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId?: string | null;
  analysisTitle?: string;
  analysisCompany?: string;
  analysisRole?: string;
  currentAttachedLetterId?: string | null;
  currentAttachedLetterTitle?: string | null;
  onLetterAttached: (letter: SavedCoverLetter) => void;
  onLetterDetached?: () => void;
}

export default function AttachLetterModal({
  isOpen,
  onClose,
  analysisId,
  analysisTitle,
  analysisCompany,
  analysisRole,
  currentAttachedLetterId,
  currentAttachedLetterTitle,
  onLetterAttached,
  onLetterDetached,
}: AttachLetterModalProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableLetters, setAvailableLetters] = useState<SavedCoverLetter[]>([]);
  const [expandedLetterId, setExpandedLetterId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Formulaire pour créer / coller une nouvelle lettre
  const [newCompany, setNewCompany] = useState(analysisCompany || '');
  const [newRole, setNewRole] = useState(analysisRole || '');
  const [newTitle, setNewTitle] = useState(
    analysisCompany ? `Lettre de Motivation - ${analysisCompany}` : 'Lettre de Motivation Sur-Mesure'
  );
  const [newContent, setNewContent] = useState('');

  // Recharger la liste exhaustive des lettres disponibles à l'ouverture
  useEffect(() => {
    if (isOpen) {
      const letters = localDbClient.getAllAvailableCoverLetters();
      setAvailableLetters(letters);
      setNewCompany(analysisCompany || '');
      setNewRole(analysisRole || '');
      setNewTitle(
        analysisCompany ? `Lettre de Motivation - ${analysisCompany}` : 'Lettre de Motivation Sur-Mesure'
      );
      setSearchQuery('');
      setActionSuccessNotice(null);
    }
  }, [isOpen, analysisCompany, analysisRole]);

  // Filtrage temps-réel des lettres disponibles
  const filteredLetters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return availableLetters;
    return availableLetters.filter(
      (l) =>
        (l.company && l.company.toLowerCase().includes(q)) ||
        (l.role && l.role.toLowerCase().includes(q)) ||
        (l.title && l.title.toLowerCase().includes(q)) ||
        (l.content && l.content.toLowerCase().includes(q))
    );
  }, [availableLetters, searchQuery]);

  if (!isOpen) return null;

  // Action : Rattacher une lettre existante
  const handleSelectLetter = async (letter: SavedCoverLetter) => {
    setIsSubmitting(true);
    try {
      let linkedLetter = letter;
      if (analysisId) {
        const res = await localDbClient.linkCoverLetterToAnalysis(letter, analysisId);
        if (res) linkedLetter = res;
      }
      onLetterAttached(linkedLetter);
      setActionSuccessNotice(`✓ Lettre « ${linkedLetter.title} » rattachée à cet audit !`);
      confetti({ particleCount: 35, spread: 60 });
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Erreur rattachement lettre :', err);
      setIsSubmitting(false);
    }
  };

  // Action : Détacher la lettre actuelle
  const handleDetach = async () => {
    setIsSubmitting(true);
    try {
      if (analysisId) {
        await localDbClient.unlinkCoverLetterFromAnalysis(analysisId);
      }
      onLetterDetached?.();
      setActionSuccessNotice('Lettre détachée de cet audit.');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Erreur détachement lettre :', err);
      setIsSubmitting(false);
    }
  };

  // Action : Créer / Coller une nouvelle lettre et la rattacher
  const handleCreateAndAttach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const createdLetter: SavedCoverLetter = {
        id: `letter-${Date.now()}`,
        title: newTitle.trim() || `Lettre - ${newCompany.trim() || 'Candidature'}`,
        company: newCompany.trim() || 'Entreprise Cible',
        role: newRole.trim() || 'Poste Cible',
        content: newContent.trim(),
        analysisId: analysisId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await localDbClient.saveCoverLetter(createdLetter);
      if (analysisId) {
        await localDbClient.linkCoverLetterToAnalysis(saved, analysisId);
      }
      onLetterAttached(saved);
      setActionSuccessNotice(`✓ Nouvelle lettre enregistrée et rattachée avec succès !`);
      confetti({ particleCount: 45, spread: 70 });
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Erreur création lettre :', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* En-tête du Modal */}
        <div className="p-5 sm:p-6 bg-linear-to-r from-purple-700 via-indigo-700 to-rose-600 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/30 inline-flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              Rattachement de Lettre de Motivation
            </span>
            <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-300 shrink-0" />
              <span>Rattacher une Lettre à cet Audit</span>
            </h3>
            <p className="text-xs text-purple-100 line-clamp-1">
              {analysisCompany ? (
                <>Pour l&apos;entreprise : <strong className="text-white underline">{analysisCompany}</strong> ({analysisTitle || 'Audit ATS'})</>
              ) : (
                <>Pour l&apos;audit : <strong className="text-white">{analysisTitle || 'Analyse ATS en cours'}</strong></>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {actionSuccessNotice && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shrink-0 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}

        {/* État actuel du rattachement */}
        <div className="px-5 sm:px-6 pt-4 pb-2 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-gray-500 shrink-0">Statut actuel :</span>
            {currentAttachedLetterTitle || currentAttachedLetterId ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold truncate">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Rattachée : « {currentAttachedLetterTitle || 'Lettre sur-mesure'} »</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Aucune lettre rattachée à cet audit</span>
              </span>
            )}
          </div>

          {(currentAttachedLetterTitle || currentAttachedLetterId) && onLetterDetached && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDetach}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              ✕ Détacher la lettre
            </button>
          )}
        </div>

        {/* Onglets : Choisir existante / Créer nouvelle */}
        <div className="px-5 sm:px-6 pt-3 flex items-center gap-2 border-b border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('existing')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'existing'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Lettres disponibles ({availableLetters.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'new'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Coller ou rédiger une nouvelle</span>
          </button>
        </div>

        {/* Corps déroulant du Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* ONGLET 1 : SÉLECTIONNER PARMI LES LETTRES EXISTANTES */}
          {activeTab === 'existing' && (
            <div className="space-y-3">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par entreprise (ex: Valoria, Bip&Go...), intitulé ou mot-clé..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden text-gray-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Raccourci de test / suggestion pour Valoria si mentionné */}
              {analysisCompany && analysisCompany.toLowerCase().includes('valoria') && (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Audit ciblé pour <strong>Valoria Capital</strong> : vous pouvez rattacher une lettre en un clic ci-dessous.</span>
                  </div>
                </div>
              )}

              {/* Liste des lettres */}
              {filteredLetters.length === 0 ? (
                <div className="text-center py-8 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl space-y-3">
                  <Mail className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs text-gray-600 font-medium">
                    {searchQuery
                      ? `Aucune lettre ne correspond à « ${searchQuery} ».`
                      : 'Aucune lettre de motivation enregistrée pour le moment.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    ➕ Créer ou coller une lettre maintenant
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLetters.map((letter) => {
                    const isAttached =
                      currentAttachedLetterId === letter.id ||
                      (letter.analysisId && letter.analysisId === analysisId);
                    const isExpanded = expandedLetterId === letter.id;
                    const wordCount = letter.content
                      ? letter.content.split(/\s+/).filter(Boolean).length
                      : 0;

                    return (
                      <div
                        key={letter.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isAttached
                            ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-300'
                            : 'border-gray-200 bg-white hover:border-purple-200 hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {letter.company && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-extrabold border border-blue-200">
                                  <Building className="w-2.5 h-2.5" />
                                  {letter.company}
                                </span>
                              )}
                              {letter.role && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[10px] font-semibold border border-purple-200">
                                  <Briefcase className="w-2.5 h-2.5" />
                                  {letter.role}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-500 font-medium">
                                • {wordCount} mots
                              </span>
                              {isAttached && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.2 rounded-full font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Actuellement rattachée
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                              {letter.title}
                            </h4>

                            {/* Snippet / Aperçu */}
                            <p className="text-xs text-gray-500 italic line-clamp-2">
                              &quot;{letter.content.slice(0, 140)}...&quot;
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedLetterId(isExpanded ? null : letter.id)
                              }
                              className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 flex items-center gap-1 cursor-pointer"
                              title="Voir le texte intégral"
                            >
                              <span>{isExpanded ? 'Réduire' : 'Aperçu'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleSelectLetter(letter)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                isAttached
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>{isAttached ? '✓ Rattachée' : 'Rattacher'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Aperçu complet déroulant */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in">
                            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-800 font-sans leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto border border-gray-200">
                              {letter.content}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : CRÉER OU COLLER UNE NOUVELLE LETTRE */}
          {activeTab === 'new' && (
            <form onSubmit={handleCreateAndAttach} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Entreprise cible *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="ex: Valoria Capital"
                    className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Poste cible
                  </label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="ex: Responsable Financier / Trésorier"
                    className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Titre de la lettre
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex: Lettre de Motivation - Valoria Capital"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Contenu complet de la lettre de motivation *
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {newContent.split(/\s+/).filter(Boolean).length} mots
                  </span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Madame, Monsieur,..."
                  className="w-full text-xs p-3.5 bg-white border border-gray-300 rounded-xl font-sans text-gray-800 leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('existing')}
                  className="px-3.5 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newContent.trim()}
                  className="px-4 py-2 bg-linear-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer & Rattacher à cet audit'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
