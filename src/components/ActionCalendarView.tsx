import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Plus,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Users,
  MessageSquare,
  ArrowRight,
  Check,
  X,
  Filter,
  Search,
  Sparkles,
  Building2,
  CalendarCheck,
  CalendarRange,
  ListFilter,
  CheckCheck,
} from 'lucide-react';
import type { ApplicationItem, ApplicationInteraction, ApplicationInteractionType } from '../types';

export interface CalendarActionItem {
  id: string;
  appId: string;
  company: string;
  role: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: 'applied' | 'follow_up' | 'interview' | 'call' | 'email' | 'feedback' | 'note';
  title: string;
  description?: string;
  contactName?: string;
  status: 'past' | 'today' | 'upcoming' | 'overdue' | 'completed';
  isDone?: boolean;
}

interface ActionCalendarViewProps {
  applications: ApplicationItem[];
  setApplications: React.Dispatch<React.SetStateAction<ApplicationItem[]>>;
  onNavigateToTab?: (tab: 'dashboard' | 'app' | 'tracker' | 'cv-assistant' | 'reports' | 'history' | 'database' | 'settings') => void;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const WEEKDAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const ActionCalendarView: React.FC<ActionCalendarViewProps> = ({
  applications,
  setApplications,
  onNavigateToTab,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDate = useMemo(() => new Date(), []);

  // Mois & Année affichés pour la vue grille
  const [currentMonth, setCurrentMonth] = useState<number>(todayDate.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(todayDate.getFullYear());

  // Date sélectionnée (par défaut aujourd'hui)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Vue calendrier : 'month' ou 'timeline'
  const [displayMode, setDisplayMode] = useState<'month' | 'timeline'>('month');

  // Filtre temporel : 'all' | 'upcoming' | 'past' | 'overdue'
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past' | 'overdue'>('all');

  // Filtre par type d'action
  const [typeFilter, setTypeFilter] = useState<'all' | 'follow_up' | 'interview' | 'applied' | 'communication'>('all');

  // Recherche textuelle
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal d'ajout d'une nouvelle action
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newActionAppId, setNewActionAppId] = useState<string>(applications[0]?.id || '');
  const [newActionType, setNewActionType] = useState<ApplicationInteractionType | 'follow_up_schedule'>('interview');
  const [newActionDate, setNewActionDate] = useState<string>(todayStr);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionContent, setNewActionContent] = useState('');
  const [newActionContact, setNewActionContact] = useState('');

  // 1. Synthèse de TOUTES les actions passées et à venir
  const allActions = useMemo<CalendarActionItem[]>(() => {
    const list: CalendarActionItem[] = [];

    applications.forEach((app) => {
      // A. Action : Candidature envoyée (passée ou à venir)
      if (app.appliedDate) {
        const isPast = app.appliedDate < todayStr;
        const isToday = app.appliedDate === todayStr;
        list.push({
          id: `applied-${app.id}`,
          appId: app.id,
          company: app.company,
          role: app.role,
          date: app.appliedDate,
          type: 'applied',
          title: `Candidature transmise`,
          description: `Poste : ${app.role} (${app.contractType || 'CDI'}) - Localisation : ${app.location || 'France'}`,
          status: isToday ? 'today' : isPast ? 'past' : 'upcoming',
          isDone: true,
        });
      }

      // B. Action : Relance (planifiée, faite, en retard ou aujourd'hui)
      if (app.followUpDate) {
        const isDone = Boolean(app.checklist?.followUpDone);
        const isPast = app.followUpDate < todayStr;
        const isToday = app.followUpDate === todayStr;

        let status: CalendarActionItem['status'] = 'upcoming';
        let title = 'Relance à effectuer';

        if (isDone) {
          status = 'completed';
          title = 'Relance effectuée';
        } else if (isToday) {
          status = 'today';
          title = "Relance à effectuer AUJOURD'HUI";
        } else if (isPast) {
          status = 'overdue';
          title = 'Relance en retard';
        } else {
          status = 'upcoming';
          title = 'Relance planifiée (J+7)';
        }

        list.push({
          id: `followup-${app.id}`,
          appId: app.id,
          company: app.company,
          role: app.role,
          date: app.followUpDate,
          type: 'follow_up',
          title,
          description: isDone
            ? `Relance validée pour ${app.company}.`
            : `Vérifier les retours et contacter le recruteur chez ${app.company}.`,
          status,
          isDone,
        });
      }

      // C. Action : Interactions et annotations enregistrées
      if (app.interactions && Array.isArray(app.interactions)) {
        app.interactions.forEach((inter) => {
          const isPast = inter.date < todayStr;
          const isToday = inter.date === todayStr;
          list.push({
            id: `inter-${inter.id}`,
            appId: app.id,
            company: app.company,
            role: app.role,
            date: inter.date,
            type: inter.type,
            title: inter.title || (inter.type === 'interview' ? 'Entretien' : 'Action de contact'),
            description: inter.content,
            contactName: inter.contactName,
            status: isToday ? 'today' : isPast ? 'past' : 'upcoming',
            isDone: isPast || isToday,
          });
        });
      }

      // D. Si statut est 'interview' sans interaction explicite avec ce nom, ajouter un rappel
      if (app.status === 'interview') {
        const hasExplicitInterview = app.interactions?.some((i) => i.type === 'interview');
        if (!hasExplicitInterview) {
          // On ajoute un repère d'entretien
          const interviewDate = app.followUpDate || app.appliedDate || todayStr;
          list.push({
            id: `status-interview-${app.id}`,
            appId: app.id,
            company: app.company,
            role: app.role,
            date: interviewDate,
            type: 'interview',
            title: 'Entretien en cours de process',
            description: `Session d'entretien avec l'équipe ${app.company} pour le poste de ${app.role}`,
            status: interviewDate < todayStr ? 'past' : interviewDate === todayStr ? 'today' : 'upcoming',
            isDone: interviewDate < todayStr,
          });
        }
      }
    });

    // Tri par date décroissante pour l'historique ou chronologique
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [applications, todayStr]);

  // 2. Statistiques clés du calendrier
  const calendarStats = useMemo(() => {
    const upcoming = allActions.filter((a) => a.status === 'upcoming' || a.status === 'today');
    const overdue = allActions.filter((a) => a.status === 'overdue');
    const past = allActions.filter((a) => a.status === 'past' || a.status === 'completed');
    const interviews = allActions.filter((a) => a.type === 'interview');
    const followUpsPending = allActions.filter((a) => a.type === 'follow_up' && !a.isDone);

    return {
      total: allActions.length,
      upcomingCount: upcoming.length,
      overdueCount: overdue.length,
      pastCount: past.length,
      interviewsCount: interviews.length,
      followUpsPendingCount: followUpsPending.length,
    };
  }, [allActions]);

  // 3. Filtrage des actions selon recherche et onglets
  const filteredActions = useMemo(() => {
    return allActions.filter((act) => {
      // Filtre temporel
      if (timeFilter === 'upcoming' && act.status !== 'upcoming' && act.status !== 'today') {
        return false;
      }
      if (timeFilter === 'past' && act.status !== 'past' && act.status !== 'completed') {
        return false;
      }
      if (timeFilter === 'overdue' && act.status !== 'overdue') {
        return false;
      }

      // Filtre de type
      if (typeFilter === 'follow_up' && act.type !== 'follow_up') return false;
      if (typeFilter === 'interview' && act.type !== 'interview') return false;
      if (typeFilter === 'applied' && act.type !== 'applied') return false;
      if (
        typeFilter === 'communication' &&
        act.type !== 'call' &&
        act.type !== 'email' &&
        act.type !== 'feedback' &&
        act.type !== 'note'
      ) {
        return false;
      }

      // Filtre textuel
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          act.company.toLowerCase().includes(q) ||
          act.role.toLowerCase().includes(q) ||
          act.title.toLowerCase().includes(q) ||
          (act.description && act.description.toLowerCase().includes(q)) ||
          (act.contactName && act.contactName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [allActions, timeFilter, typeFilter, searchQuery]);

  // 4. Actions du jour sélectionné
  const selectedDateActions = useMemo(() => {
    return allActions.filter((a) => a.date === selectedDate);
  }, [allActions, selectedDate]);

  // 5. Actions groupées par date pour le calendrier mensuel
  const actionsByDateMap = useMemo(() => {
    const map = new Map<string, CalendarActionItem[]>();
    allActions.forEach((act) => {
      const existing = map.get(act.date) || [];
      existing.push(act);
      map.set(act.date, existing);
    });
    return map;
  }, [allActions]);

  // 6. Génération des jours du mois en cours
  const calendarGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Jour de la semaine du 1er du mois (0 = Dimanche, transformé pour Lundi = 0)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      actions: CalendarActionItem[];
    }> = [];

    // Jours du mois précédent pour combler
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        actions: actionsByDateMap.get(dateStr) || [],
      });
    }

    // Jours du mois actuel
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(currentYear, currentMonth, d);
      // Format YYYY-MM-DD avec padding
      const y = currDate.getFullYear();
      const m = String(currDate.getMonth() + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        actions: actionsByDateMap.get(dateStr) || [],
      });
    }

    // Jours du mois suivant pour compléter à 35 ou 42 cases
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(currentYear, currentMonth + 1, n);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(n).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      days.push({
        dateStr,
        dayNumber: n,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        actions: actionsByDateMap.get(dateStr) || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr, selectedDate, actionsByDateMap]);

  // Actions de navigation du mois
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentMonth(todayDate.getMonth());
    setCurrentYear(todayDate.getFullYear());
    setSelectedDate(todayStr);
  };

  // Action rapide : Marquer une relance comme faite en 1 clic
  const handleToggleFollowUpDone = (appId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const currentDone = Boolean(app.checklist?.followUpDone);
        const newDone = !currentDone;

        // Ajouter ou mettre à jour une interaction dans le journal
        const updatedInteractions = [...(app.interactions || [])];
        if (newDone) {
          updatedInteractions.unshift({
            id: `followup-interaction-${Date.now()}`,
            date: todayStr,
            type: 'follow_up',
            title: 'Relance effectuée auprès du recruteur',
            content: `Relance validée le ${new Date().toLocaleDateString('fr-FR')}.`,
          });
        }

        return {
          ...app,
          checklist: {
            ...app.checklist,
            followUpDone: newDone,
          },
          followUpDoneAt: newDone ? new Date().toISOString() : undefined,
          interactions: updatedInteractions,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Reprogrammer une relance (+3j ou +7j)
  const handleRescheduleFollowUp = (appId: string, daysToAdd: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetDate = new Date(Date.now() + daysToAdd * 86400000).toISOString().split('T')[0];
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        return {
          ...app,
          followUpDate: targetDate,
          checklist: {
            ...app.checklist,
            followUpDone: false,
          },
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Ajouter une action manuelle personnalisée
  const handleSaveNewAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionAppId || !newActionTitle.trim() || !newActionDate) return;

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== newActionAppId) return app;

        // Si c'est un rappel de relance
        if (newActionType === 'follow_up_schedule') {
          return {
            ...app,
            followUpDate: newActionDate,
            checklist: {
              ...app.checklist,
              followUpDone: false,
            },
            notes: newActionContent ? `${app.notes || ''}\n[Rappel ${newActionDate}] : ${newActionContent}`.trim() : app.notes,
            updatedAt: new Date().toISOString(),
          };
        }

        // Sinon créer une interaction
        const newInter: ApplicationInteraction = {
          id: `custom-action-${Date.now()}`,
          date: newActionDate,
          type: newActionType as ApplicationInteractionType,
          title: newActionTitle.trim(),
          content: newActionContent.trim() || 'Action enregistrée depuis le calendrier de suivi.',
          contactName: newActionContact.trim() || undefined,
        };

        const existingInteractions = app.interactions || [];

        // Si c'est un entretien, basculer le statut en interview si pertinent
        const updatedStatus = newActionType === 'interview' && app.status === 'to_apply' ? 'interview' : app.status;

        return {
          ...app,
          status: updatedStatus,
          interactions: [newInter, ...existingInteractions],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Réinitialisation
    setIsAddModalOpen(false);
    setNewActionTitle('');
    setNewActionContent('');
    setNewActionContact('');
    setSelectedDate(newActionDate);
  };

  // Rendu de l'icône de type d'action
  const renderActionIcon = (type: CalendarActionItem['type']) => {
    switch (type) {
      case 'applied':
        return <Briefcase className="w-3.5 h-3.5 text-blue-600" />;
      case 'follow_up':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'interview':
        return <Users className="w-3.5 h-3.5 text-purple-600" />;
      case 'call':
        return <Phone className="w-3.5 h-3.5 text-indigo-600" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-cyan-600" />;
      case 'feedback':
      case 'note':
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  // Badge couleur de type
  const getBadgeStyle = (status: CalendarActionItem['status'], type: CalendarActionItem['type']) => {
    if (status === 'overdue') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (status === 'completed') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (status === 'today') {
      return 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse';
    }
    if (type === 'interview') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (type === 'applied') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
      {/* =========================================================================
          1. EN-TÊTE DU CALENDRIER & STATISTIQUES EN UN COUP D'ŒIL
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#0A2540] flex items-center gap-2">
                <span>Calendrier des Actions Passées & à Venir</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {calendarStats.total} actions
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Visualisez l&apos;historique de vos démarches, vos entretiens et vos prochaines relances prioritaires.
              </p>
            </div>
          </div>
        </div>

        {/* Boutons d'action et bascule de mode */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setDisplayMode('month')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'month'
                  ? 'bg-white text-[#0A2540] shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Grille Mois</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('timeline')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'timeline'
                  ? 'bg-white text-[#0A2540] shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Vue Chronologique</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-[#0A2540] hover:bg-[#133557] text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-[#00D287]" />
            <span>Planifier une action</span>
          </button>
        </div>
      </div>

      {/* Mini-KPIs du calendrier */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setTimeFilter('upcoming')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            timeFilter === 'upcoming'
              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-200'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase text-slate-500">Actions à Venir</div>
          <div className="text-xl font-black text-indigo-700">{calendarStats.upcomingCount}</div>
          <div className="text-[10px] text-slate-500">Relances & étapes prévues</div>
        </div>

        <div
          onClick={() => setTimeFilter('overdue')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            calendarStats.overdueCount > 0 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200/80'
          } ${timeFilter === 'overdue' ? 'ring-2 ring-amber-300' : ''}`}
        >
          <div className="text-[10px] font-extrabold uppercase text-amber-800">Relances en Retard</div>
          <div className="text-xl font-black text-amber-700">{calendarStats.overdueCount}</div>
          <div className="text-[10px] text-amber-800">Nécessitent un suivi J+7</div>
        </div>

        <div
          onClick={() => setTypeFilter(typeFilter === 'interview' ? 'all' : 'interview')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            typeFilter === 'interview'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase text-purple-700">Entretiens</div>
          <div className="text-xl font-black text-purple-800">{calendarStats.interviewsCount}</div>
          <div className="text-[10px] text-slate-500">RH, techniques & directeurs</div>
        </div>

        <div
          onClick={() => setTimeFilter('past')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            timeFilter === 'past'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase text-emerald-800">Actions Réalisées</div>
          <div className="text-xl font-black text-emerald-700">{calendarStats.pastCount}</div>
          <div className="text-[10px] text-emerald-700">Candidatures & relances faites</div>
        </div>
      </div>

      {/* Barre de filtres et de recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Filtres de catégorie */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setTimeFilter('all');
              setTypeFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              timeFilter === 'all' && typeFilter === 'all'
                ? 'bg-[#0A2540] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes ({calendarStats.total})
          </button>

          <button
            type="button"
            onClick={() => setTimeFilter(timeFilter === 'upcoming' ? 'all' : 'upcoming')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              timeFilter === 'upcoming'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            À venir ({calendarStats.upcomingCount})
          </button>

          <button
            type="button"
            onClick={() => setTimeFilter(timeFilter === 'past' ? 'all' : 'past')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              timeFilter === 'past'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Passées ({calendarStats.pastCount})
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === 'follow_up' ? 'all' : 'follow_up')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              typeFilter === 'follow_up'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Relances ({calendarStats.followUpsPendingCount})
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === 'interview' ? 'all' : 'interview')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              typeFilter === 'interview'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Entretiens ({calendarStats.interviewsCount})
          </button>
        </div>

        {/* Recherche rapide */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer entreprise, poste..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. VUE A : GRILLE DU MOIS INTERACTIVE
         ========================================================================= */}
      {displayMode === 'month' && (
        <div className="space-y-4">
          {/* Barre de navigation du mois */}
          <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-200/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-xl shadow-2xs border border-slate-200 transition-colors cursor-pointer"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm sm:text-base font-black text-[#0A2540] capitalize min-w-[150px] text-center">
                {MONTH_NAMES_FR[currentMonth]} {currentYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-xl shadow-2xs border border-slate-200 transition-colors cursor-pointer"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoToToday}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                Aujourd&apos;hui
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Grille du calendrier (8 colonnes) */}
            <div className="lg:col-span-8 bg-slate-50/50 rounded-3xl border border-slate-200 p-3 sm:p-4">
              {/* En-tête des jours de la semaine */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
                {WEEKDAYS_FR.map((d) => (
                  <div key={d} className="text-[11px] font-black uppercase text-slate-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Cases des jours */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarGridDays.map((day) => {
                  const hasActions = day.actions.length > 0;
                  const hasOverdue = day.actions.some((a) => a.status === 'overdue');
                  const hasTodayAction = day.actions.some((a) => a.status === 'today');
                  const hasInterview = day.actions.some((a) => a.type === 'interview');
                  const isSelected = day.dateStr === selectedDate;

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`min-h-[72px] sm:min-h-[85px] p-1 sm:p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-500 shadow-sm ring-2 ring-indigo-300'
                          : day.isToday
                          ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                          : day.isCurrentMonth
                          ? 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                          : 'bg-slate-50/40 border-slate-100 text-slate-300'
                      }`}
                    >
                      {/* Numéro du jour + indicateur */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black rounded-full w-5 h-5 flex items-center justify-center ${
                            day.isToday
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : isSelected
                              ? 'bg-indigo-600 text-white'
                              : day.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-300'
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        {hasOverdue && (
                          <span
                            className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping"
                            title="Relance en retard !"
                          />
                        )}
                        {!hasOverdue && hasTodayAction && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                            title="Action aujourd'hui"
                          />
                        )}
                      </div>

                      {/* Aperçu des événements du jour */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {day.actions.slice(0, 2).map((act) => (
                          <div
                            key={act.id}
                            className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded truncate font-bold border flex items-center gap-1 ${
                              act.type === 'interview'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : act.type === 'follow_up'
                                ? act.isDone
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                            title={`${act.title} - ${act.company}`}
                          >
                            <span className="truncate">{act.company}</span>
                          </div>
                        ))}

                        {day.actions.length > 2 && (
                          <span className="text-[9px] text-slate-500 font-extrabold block text-center">
                            +{day.actions.length - 2} autre(s)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Volet Latéral : Détail de la Date Sélectionnée (4 colonnes) */}
            <div className="lg:col-span-4 bg-slate-50 rounded-3xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Date sélectionnée</span>
                  <h3 className="text-sm font-extrabold text-[#0A2540]">
                    {new Intl.DateTimeFormat('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date(selectedDate + 'T00:00:00'))}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewActionDate(selectedDate);
                    setIsAddModalOpen(true);
                  }}
                  className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                  title="Ajouter une action ce jour-là"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                </button>
              </div>

              {selectedDateActions.length === 0 ? (
                <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                  <CalendarCheck className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Aucune action ce jour-là</p>
                  <p className="text-[11px] text-slate-500">
                    Sélectionnez un autre jour ou programmez un rappel / entretien.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewActionDate(selectedDate);
                      setIsAddModalOpen(true);
                    }}
                    className="mt-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer une action ce jour</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {selectedDateActions.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {renderActionIcon(act.type)}
                          <span className="font-extrabold text-[#0A2540]">{act.company}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                            act.status,
                            act.type
                          )}`}
                        >
                          {act.status === 'overdue' && 'En retard'}
                          {act.status === 'completed' && 'Fait ✓'}
                          {act.status === 'today' && "Aujourd'hui"}
                          {act.status === 'upcoming' && 'À venir'}
                          {act.status === 'past' && 'Passé'}
                        </span>
                      </div>

                      <div className="font-bold text-slate-800 text-[11px]">{act.title}</div>
                      {act.role && <div className="text-[10px] text-slate-500">Poste : {act.role}</div>}
                      {act.description && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl leading-relaxed">
                          {act.description}
                        </p>
                      )}
                      {act.contactName && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>Contact : {act.contactName}</span>
                        </div>
                      )}

                      {/* Boutons d'action contextuels */}
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        {act.type === 'follow_up' && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleFollowUpDone(act.appId, e)}
                            className={`px-2.5 py-1 rounded-xl font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer ${
                              act.isDone
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>{act.isDone ? 'Marquer non fait' : 'Valider la relance ✓'}</span>
                          </button>
                        )}

                        {act.type === 'follow_up' && !act.isDone && (
                          <button
                            type="button"
                            onClick={(e) => handleRescheduleFollowUp(act.appId, 3, e)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold cursor-pointer"
                            title="Repousser de 3 jours"
                          >
                            +3j
                          </button>
                        )}

                        {onNavigateToTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('tracker')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold cursor-pointer ml-auto flex items-center gap-1"
                          >
                            <span>Dossier</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. VUE B : TIMELINE / LISTE CHRONOLOGIQUE COMPLÈTE
         ========================================================================= */}
      {displayMode === 'timeline' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Affichage de <strong>{filteredActions.length}</strong> action(s) selon vos filtres.
            </span>
            <span className="text-[11px] text-slate-500">Classées de la plus récente à la plus ancienne</span>
          </div>

          {filteredActions.length === 0 ? (
            <div className="p-10 bg-slate-50 rounded-3xl text-center space-y-2 border border-slate-200">
              <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Aucune action ne correspond aux critères</h4>
              <p className="text-xs text-slate-500">
                Essayez d&apos;ajuster vos filtres de statut ou de réinitialiser la recherche.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredActions.map((act) => {
                const dateObj = new Date(act.date + 'T00:00:00');
                const formattedDate = new Intl.DateTimeFormat('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }).format(dateObj);

                return (
                  <div
                    key={act.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      act.status === 'overdue'
                        ? 'bg-rose-50/60 border-rose-200'
                        : act.status === 'today'
                        ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                        : act.type === 'interview'
                        ? 'bg-purple-50/50 border-purple-200'
                        : act.status === 'completed'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {/* Colonne gauche : Date & type */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 shrink-0 shadow-2xs flex flex-col items-center justify-center min-w-[58px]">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          {dateObj.toLocaleDateString('fr-FR', { month: 'short' })}
                        </span>
                        <span className="text-base font-black text-[#0A2540]">{dateObj.getDate()}</span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-[#0A2540] truncate">{act.company}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                              act.status,
                              act.type
                            )}`}
                          >
                            {act.status === 'overdue' && '⚠️ Relance en retard'}
                            {act.status === 'today' && "⚡ Aujourd'hui"}
                            {act.status === 'completed' && '✓ Réalisée'}
                            {act.status === 'upcoming' && '📅 À venir'}
                            {act.status === 'past' && 'Historique'}
                          </span>
                        </div>

                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          {renderActionIcon(act.type)}
                          <span>{act.title}</span>
                          <span className="text-slate-400 font-normal">• {act.role}</span>
                        </div>

                        {act.description && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{act.description}</p>
                        )}

                        {act.contactName && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>Interlocuteur : {act.contactName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Colonne droite : Actions rapides */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {act.type === 'follow_up' && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleFollowUpDone(act.appId, e)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            act.isDone
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{act.isDone ? 'Fait ✓' : 'Marquer fait'}</span>
                        </button>
                      )}

                      {act.type === 'follow_up' && !act.isDone && (
                        <button
                          type="button"
                          onClick={(e) => handleRescheduleFollowUp(act.appId, 7, e)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer"
                          title="Repousser de 7 jours"
                        >
                          +7 jours
                        </button>
                      )}

                      {onNavigateToTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateToTab('tracker')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Accéder</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          4. MODAL DE PLANIFICATION D'UNE NOUVELLE ACTION / RAPPEL
         ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CalendarIcon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-gray-900">Planifier une action ou un rappel</h3>
                  <p className="text-xs text-gray-400">Entretien, relance, compte-rendu ou appel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewAction} className="space-y-4 text-xs">
              {/* Entreprise cible */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Candidature / Entreprise concernée *</label>
                {applications.length > 0 ? (
                  <select
                    value={newActionAppId}
                    onChange={(e) => setNewActionAppId(e.target.value)}
                    required
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 focus:outline-hidden focus:border-indigo-500"
                  >
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.company} — {app.role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-rose-600">
                    Veuillez d&apos;abord créer au moins une candidature dans le Tracker.
                  </p>
                )}
              </div>

              {/* Type d'action */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Type d&apos;action *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'interview', label: 'Entretien', icon: Users },
                    { id: 'follow_up_schedule', label: 'Relance (J+7)', icon: Clock },
                    { id: 'call', label: 'Appel téléphonique', icon: Phone },
                    { id: 'email', label: 'Email / Message', icon: Mail },
                    { id: 'feedback', label: 'Débriefing', icon: MessageSquare },
                    { id: 'note', label: 'Annotation / Jalon', icon: Briefcase },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = newActionType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewActionType(t.id as any)}
                        className={`p-2 rounded-xl border text-left font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-2xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Date de l&apos;action *</label>
                <input
                  type="date"
                  value={newActionDate}
                  onChange={(e) => setNewActionDate(e.target.value)}
                  required
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Titre */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Titre de l&apos;action / Objet *</label>
                <input
                  type="text"
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  placeholder="Ex : Entretien avec le Directeur Financier, Relance après offre..."
                  required
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Contact */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Interlocuteur (optionnel)</label>
                <input
                  type="text"
                  value={newActionContact}
                  onChange={(e) => setNewActionContact(e.target.value)}
                  placeholder="Ex : Sophie Bernard (DRH), Marc Dupont (Manager)..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Détails, notes ou consignes</label>
                <textarea
                  rows={3}
                  value={newActionContent}
                  onChange={(e) => setNewActionContent(e.target.value)}
                  placeholder="Points clés abordés, questions à poser, préparation..."
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Boutons validation */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newActionAppId || !newActionTitle.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Enregistrer l&apos;action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionCalendarView;
