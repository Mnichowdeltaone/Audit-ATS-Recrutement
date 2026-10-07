import React from 'react';
import { X, Building2 } from 'lucide-react';
import CompanyDossierView from './CompanyDossierView';
import type { CompanyFinancialTechnicalDossier } from '../types';

interface CompanyDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: CompanyFinancialTechnicalDossier | null | undefined;
  roleTitle?: string;
  analysisTitle?: string;
}

export default function CompanyDossierModal({
  isOpen,
  onClose,
  dossier,
  roleTitle,
  analysisTitle,
}: CompanyDossierModalProps) {
  if (!isOpen || !dossier) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Barre de titre du modal avec bouton fermer */}
        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Building2 className="w-4 h-4" />
            </span>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-extrabold truncate">
                Fiche Technique & Financière : {dossier.companyName}
              </h3>
              <p className="text-[11px] text-gray-400 truncate">
                {roleTitle ? `Poste : ${roleTitle}` : (analysisTitle || 'Préparation Entretien d\'Embauche')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps déroulant du dossier */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <CompanyDossierView
            dossier={dossier}
            roleTitle={roleTitle}
          />
        </div>
      </div>
    </div>
  );
}
