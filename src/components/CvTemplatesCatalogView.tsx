import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileText,
  Copy,
  Check,
  Download,
  ArrowRight,
  Eye,
  Sparkles,
  Layers,
  Globe,
  Briefcase,
  UserCheck,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  CV_TEMPLATES_CATALOG,
  SECTORS,
  LANGUAGES,
  PROFILE_TYPES,
  CvTemplateItem,
} from '../data/cvTemplatesCatalog';
import { AnimatedCoachMascot } from './AnimatedCoachMascot';

interface CvTemplatesCatalogViewProps {
  onSelectTemplateForEditor: (templateText: string, targetRole: string) => void;
  onSendTemplateToAnalyzer: (templateText: string) => void;
}

export const CvTemplatesCatalogView: React.FC<CvTemplatesCatalogViewProps> = ({
  onSelectTemplateForEditor,
  onSendTemplateToAnalyzer,
}) => {
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedProfileType, setSelectedProfileType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewTemplate, setPreviewTemplate] = useState<CvTemplateItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtrage combiné multi-critères
  const filteredTemplates = useMemo(() => {
    return CV_TEMPLATES_CATALOG.filter((item) => {
      // Filtre Secteur
      if (selectedSector !== 'all' && item.sector !== selectedSector) {
        return false;
      }
      // Filtre Langue
      if (selectedLanguage !== 'all' && item.language !== selectedLanguage) {
        return false;
      }
      // Filtre Type de profil
      if (selectedProfileType !== 'all' && item.profileType !== selectedProfileType) {
        return false;
      }
      // Filtre Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesRole = item.targetRole.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesHighlights = item.highlights.some((h) => h.toLowerCase().includes(q));
        if (!matchesTitle && !matchesRole && !matchesDesc && !matchesHighlights) {
          return false;
        }
      }
      return true;
    });
  }, [selectedSector, selectedLanguage, selectedProfileType, searchQuery]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (format: 'txt' | 'doc', text: string, title: string) => {
    const filename = `${title.replace(/[\s/\\?%*:|"<>]/g, '_')}.${format}`;
    const mime = format === 'doc' ? 'application/msword;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSelectedSector('all');
    setSelectedLanguage('all');
    setSelectedProfileType('all');
    setSearchQuery('');
  };

  const activeFiltersCount =
    (selectedSector !== 'all' ? 1 : 0) +
    (selectedLanguage !== 'all' ? 1 : 0) +
    (selectedProfileType !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* =========================================================================
          COACH FÉLIX : CONSEIL POUR LE CHOIX DU MODÈLE
         ========================================================================= */}
      <AnimatedCoachMascot
        size="sm"
        customMessage="💡 **Astuce de Félix :** Choisis le modèle le plus proche de ton secteur et de ton niveau de séniorité. Chaque modèle a été rédigé avec des métriques chiffrées (STAR) et des mots-clés optimisés pour les robots ATS !"
      />

      {/* =========================================================================
          BARRE DE FILTRES MULTI-CRITÈRES (SECTEUR, LANGUE, PROFIL, RECHERCHE)
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#00D287]" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#0A2540]">
              Bibliothèque de Modèles de CV Professionnels & ATS
            </h3>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {filteredTemplates.length} modèle{filteredTemplates.length > 1 ? 's' : ''} disponible{filteredTemplates.length > 1 ? 's' : ''}
            </span>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer self-start md:self-auto"
            >
              Réinitialiser les filtres ✕
            </button>
          )}
        </div>

        {/* 1. Recherche par mot-clé */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par métier, compétence (ex: React, P&L, SAP, Médical, Junior...)"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00D287] focus:bg-white transition-all"
          />
        </div>

        {/* 2. Filtres par Secteurs */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            1. Secteur d&apos;activité :
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 select-none flex-nowrap">
            {SECTORS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSector(sec.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSector === sec.id
                    ? 'bg-[#0A2540] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{sec.icon}</span>
                <span>{sec.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Filtres par Langues & Type de Profils */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Par Langue */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              2. Langue du CV :
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 select-none flex-nowrap">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setSelectedLanguage(lang.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedLanguage === lang.id
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Par Type de Profil */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              3. Type de métier / profil :
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 select-none flex-nowrap">
              {PROFILE_TYPES.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setSelectedProfileType(pt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedProfileType === pt.id
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{pt.badge}</span>
                  <span>{pt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          GRILLE DES CARTES DE MODÈLES
         ========================================================================= */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-xl">
            🔍
          </div>
          <h4 className="text-base font-extrabold text-slate-800">
            Aucun modèle ne correspond à ces critères
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Essayez de réinitialiser vos filtres de langue ou de profil pour découvrir d&apos;autres modèles inspirants.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 bg-[#0A2540] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#133557] transition-all"
          >
            Afficher tous les modèles
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* En-tête de la carte avec badges */}
              <div className="p-5 pb-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full">
                    {template.sectorLabel}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs" title={`Langue : ${template.languageLabel}`}>
                      {template.language === 'fr' && '🇫🇷'}
                      {template.language === 'en' && '🇬🇧'}
                      {template.language === 'es' && '🇪🇸'}
                      {template.language === 'de' && '🇩🇪'}
                    </span>
                    <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
                      {template.profileLabel}
                    </span>
                  </div>
                </div>

                <h4 className="text-sm sm:text-base font-black text-[#0A2540] group-hover:text-emerald-700 transition-colors">
                  {template.title}
                </h4>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>

                {/* Points forts / Mots-clés ATS */}
                <div className="pt-2 flex flex-wrap gap-1">
                  {template.highlights.map((hl, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md"
                    >
                      ✓ {hl}
                    </span>
                  ))}
                </div>
              </div>

              {/* Barre d'action inférieure de la carte */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(template)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Prévisualiser le modèle complet"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Aperçu</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectTemplateForEditor(template.rawText, template.targetRole)}
                    className="px-3 py-1.5 bg-[#0A2540] hover:bg-[#133557] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Charger ce modèle dans le générateur assisté"
                  >
                    <Sparkles className="w-3 h-3 text-[#00D287]" />
                    <span>Utiliser</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          MODAL D'APERÇU DU MODÈLE COMPLET
         ========================================================================= */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-in">
            {/* Header modal */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-linear-to-r from-[#0A2540] to-[#133557] text-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#00D287] text-[#0A2540] px-2.5 py-0.5 rounded-full font-black uppercase">
                    {previewTemplate.languageLabel}
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs text-slate-200 truncate">{previewTemplate.sectorLabel}</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                  {previewTemplate.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps du texte formaté */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
              <pre className="p-5 bg-white border border-slate-200 rounded-2xl whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-800 leading-relaxed shadow-2xs">
                {previewTemplate.rawText}
              </pre>
            </div>

            {/* Pied de page modal avec actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(previewTemplate.id, previewTemplate.rawText)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedId === previewTemplate.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copier tout le CV</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('doc', previewTemplate.rawText, previewTemplate.title)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Télécharger au format Word (.doc)"
                >
                  <Download className="w-4 h-4" />
                  <span>Word (.doc)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    const text = previewTemplate.rawText;
                    setPreviewTemplate(null);
                    onSendTemplateToAnalyzer(text);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98"
                  title="Envoyer vers l'Analyseur d'Adéquation ATS"
                >
                  <Layers className="w-4 h-4 text-emerald-200" />
                  <span>Tester dans l&apos;Analyseur ATS</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = previewTemplate.rawText;
                    const role = previewTemplate.targetRole;
                    setPreviewTemplate(null);
                    onSelectTemplateForEditor(text, role);
                  }}
                  className="px-5 py-2 bg-[#0A2540] hover:bg-[#133557] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-[#00D287]" />
                  <span>Charger dans le générateur</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CvTemplatesCatalogView;
