import React, { useState, useMemo, useEffect } from 'react';
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
  Edit3,
  Trash2,
  MapPin,
  Landmark,
  Video,
  AlertCircle,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  ApplicationItem,
  ApplicationInteraction,
  ApplicationInteractionType,
  CustomCalendarEvent,
  CalendarEventType,
  CalendarEventCategory,
} from '../types';
import { localDbClient } from '../services/localDbClient';

export interface CalendarActionItem {
  id: string;
  sourceType: 'custom_event' | 'application_interaction' | 'application_followup' | 'application_applied';
  appId?: string;
  customEventId?: string;
  sourceInteractionId?: string;
  company: string; // Nom de l'organisme, salon ou entreprise
  role: string; // Intitulé de poste ou sujet du rendez-vous
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  type: CalendarEventType | 'applied' | 'follow_up' | 'interview' | 'call' | 'email' | 'feedback' | 'note';
  category: CalendarEventCategory;
  location?: string;
  title: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'past' | 'today' | 'upcoming' | 'overdue' | 'completed';
  isDone?: boolean;
}

interface ActionCalendarViewProps {
  applications: ApplicationItem[];
  setApplications: React.Dispatch<React.SetStateAction<ApplicationItem[]>>;
  onNavigateToTab?: (tab: 'dashboard' | 'calendar' | 'app' | 'tracker' | 'cv-assistant' | 'reports' | 'history' | 'database' | 'settings') => void;
}

export const normalizeDate = (raw: unknown): string => {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.includes('T')) {
    const part = trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const iso = `${year}-${month}-${day}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  }
  return '';
};

export const formatLocalYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

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
  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatLocalYMD(todayDate), [todayDate]);

  // Événements autonomes / personnalisés (France Travail, Salons, etc.)
  const [customEvents, setCustomEvents] = useState<CustomCalendarEvent[]>(() => {
    const list = localDbClient.getLocalCalendarEvents();
    return Array.from(new Map(list.map((e) => [e.id, e])).values());
  });

  // Synchronisation avec la base locale (déduplication stricte par ID)
  useEffect(() => {
    let isMounted = true;
    const fetchEvents = async () => {
      try {
        const events = await localDbClient.getCalendarEvents();
        if (isMounted) {
          const unique = Array.from(new Map(events.map((e) => [e.id, e])).values());
          setCustomEvents(unique);
        }
      } catch (err) {
        console.warn('Erreur chargement des événements du calendrier :', err);
      }
    };
    fetchEvents();

    const handleUpdated = () => {
      const local = localDbClient.getLocalCalendarEvents();
      const unique = Array.from(new Map(local.map((e) => [e.id, e])).values());
      setCustomEvents(unique);
    };
    window.addEventListener('cv_move_calendar_updated', handleUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('cv_move_calendar_updated', handleUpdated);
    };
  }, []);

  // Mois & Année affichés pour la vue grille
  const [currentMonth, setCurrentMonth] = useState<number>(todayDate.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(todayDate.getFullYear());

  // Date sélectionnée (par défaut aujourd'hui)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Vue calendrier : 'month' ou 'timeline'
  const [displayMode, setDisplayMode] = useState<'month' | 'timeline'>('month');

  // Filtre temporel : 'all' | 'upcoming' | 'past' | 'overdue'
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past' | 'overdue'>('all');

  // Filtre par catégorie / type d'action
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'france_travail' | 'salon' | 'interview' | 'follow_up' | 'application'>('all');

  // Recherche textuelle
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notification / Toast
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modal d'ajout ou de modification d'action
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<CalendarActionItem | null>(null);

  // Champs du formulaire (Ajout / Édition)
  const [formCategory, setFormCategory] = useState<CalendarEventCategory>('application');
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<CalendarEventType>('interview');
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formTime, setFormTime] = useState<string>('');
  const [formLocation, setFormLocation] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAppId, setFormAppId] = useState<string>('');
  const [formIsDone, setFormIsDone] = useState(false);

  // Modal de confirmation de suppression
  const [actionToDelete, setActionToDelete] = useState<CalendarActionItem | null>(null);

  // 1. Synthèse de TOUTES les actions : Candidatures + Événements Personnalisés (France Travail, Salons...)
  // DÉDUPLICATION STRICTE ET ROBUSTE : aucun doublon, aucun triplon, dates vérifiées
  const allActions = useMemo<CalendarActionItem[]>(() => {
    const list: CalendarActionItem[] = [];
    const seenEventKeys = new Set<string>();
    // Clés de suppression pour éviter les doublons entre événements personnalisés et candidatures
    const appDateTypeKeys = new Set<string>();

    // A. Événements personnalisés autonomes (France Travail, Salons, Ateliers, Démarches pro...)
    const uniqueCustomEvents = Array.from(new Map(customEvents.map((e) => [e.id, e])).values());

    uniqueCustomEvents.forEach((evt) => {
      const cleanDate = normalizeDate(evt.date);
      if (!cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return;

      const isPast = cleanDate < todayStr;
      const isToday = cleanDate === todayStr;
      const isDone = Boolean(evt.isCompleted);

      let status: CalendarActionItem['status'] = 'upcoming';
      if (isDone) {
        status = 'completed';
      } else if (isToday) {
        status = 'today';
      } else if (isPast) {
        status = 'past';
      } else {
        status = 'upcoming';
      }

      const key = `custom_${evt.id}`;
      if (!seenEventKeys.has(key)) {
        seenEventKeys.add(key);

        if (evt.applicationId) {
          appDateTypeKeys.add(`app_${evt.applicationId}_${cleanDate}`);
          appDateTypeKeys.add(`app_${evt.applicationId}_${cleanDate}_${evt.type}`);
        }

        list.push({
          id: `custom-${evt.id}`,
          sourceType: 'custom_event',
          customEventId: evt.id,
          appId: evt.applicationId,
          company: evt.organizerOrCompany || (evt.category === 'france_travail' ? 'France Travail' : evt.category === 'salon' ? 'Salon / Forum Emploi' : 'Démarche Pro'),
          role: evt.roleOrSubject || (evt.category === 'france_travail' ? 'Rendez-vous Conseiller' : evt.category === 'salon' ? 'Forum Recrutement' : 'Événement'),
          date: cleanDate,
          time: evt.time,
          type: evt.type,
          category: evt.category,
          location: evt.location,
          title: evt.title,
          description: evt.description,
          contactName: evt.contactName,
          contactEmail: evt.contactEmail,
          contactPhone: evt.contactPhone,
          status,
          isDone,
        });
      }
    });

    // B. Actions issues des Candidatures (Candidatures, Relances, Entretiens réels)
    applications.forEach((app) => {
      const appDate = normalizeDate(app.appliedDate);
      const followDate = normalizeDate(app.followUpDate);

      // 1. Candidature envoyée (Date effective d'envoi)
      if (appDate && /^\d{4}-\d{2}-\d{2}$/.test(appDate)) {
        const isPast = appDate < todayStr;
        const isToday = appDate === todayStr;
        const key = `applied_${app.id}_${appDate}`;
        if (!seenEventKeys.has(key)) {
          seenEventKeys.add(key);
          list.push({
            id: `applied-${app.id}`,
            sourceType: 'application_applied',
            appId: app.id,
            company: app.company,
            role: app.role,
            date: appDate,
            type: 'applied',
            category: 'application',
            location: app.location,
            title: `Candidature transmise`,
            description: `Poste : ${app.role} (${app.contractType || 'CDI'}) - Localisation : ${app.location || 'France'}`,
            status: isToday ? 'today' : isPast ? 'past' : 'upcoming',
            isDone: true,
          });
        }
      }

      // 2. Interactions et annotations réelles (Entretiens, Appels, RDV)
      const explicitInterviewDates = new Set<string>();
      if (app.interactions && Array.isArray(app.interactions)) {
        app.interactions.forEach((inter) => {
          const interDate = normalizeDate(inter.date);
          if (!interDate || !/^\d{4}-\d{2}-\d{2}$/.test(interDate)) return;

          // Ignorer les notes techniques initiales ATS pour ne pas polluer l'agenda
          if (inter.type === 'note' && (inter.id === 'i-init' || inter.title?.toLowerCase().includes('initiale') || inter.content?.includes('Score ATS'))) {
            return;
          }

          if (inter.type === 'interview') {
            explicitInterviewDates.add(interDate);
          }

          // Éviter de dupliquer si un custom event existe déjà pour cette app sur cette date et ce type
          if (appDateTypeKeys.has(`app_${app.id}_${interDate}_${inter.type}`)) {
            return;
          }

          const isPast = interDate < todayStr;
          const isToday = interDate === todayStr;
          const key = `inter_${inter.id}`;
          if (!seenEventKeys.has(key)) {
            seenEventKeys.add(key);
            list.push({
              id: `inter-${inter.id}`,
              sourceType: 'application_interaction',
              sourceInteractionId: inter.id,
              appId: app.id,
              company: app.company,
              role: app.role,
              date: interDate,
              type: inter.type as CalendarEventType,
              category: 'application',
              location: app.location,
              title: inter.title || (inter.type === 'interview' ? 'Entretien de recrutement' : 'Contact recruteur'),
              description: inter.content,
              contactName: inter.contactName,
              status: isToday ? 'today' : isPast ? 'past' : 'upcoming',
              isDone: isPast || isToday,
            });
          }
        });
      }

      // 3. Relance planifiée (Afficher uniquement si aucune action ou entretien de l'app sur cette date)
      if (followDate && /^\d{4}-\d{2}-\d{2}$/.test(followDate)) {
        const hasCustomOnSameDate = appDateTypeKeys.has(`app_${app.id}_${followDate}`);
        const hasExplicitInterviewOnSameDate = explicitInterviewDates.has(followDate);

        // Si un entretien ou un custom event existe déjà pour cette candidature à cette date, ne pas dupliquer en relance
        if (!hasCustomOnSameDate && !hasExplicitInterviewOnSameDate) {
          const isDone = Boolean(app.checklist?.followUpDone);
          const isPast = followDate < todayStr;
          const isToday = followDate === todayStr;

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
            title = 'Relance planifiée';
          }

          const key = `followup_${app.id}_${followDate}`;
          if (!seenEventKeys.has(key)) {
            seenEventKeys.add(key);
            list.push({
              id: `followup-${app.id}`,
              sourceType: 'application_followup',
              appId: app.id,
              company: app.company,
              role: app.role,
              date: followDate,
              type: 'follow_up',
              category: 'application',
              location: app.location,
              title,
              description: isDone
                ? `Relance validée pour ${app.company}.`
                : `Vérifier les retours et contacter le recruteur chez ${app.company}.`,
              status,
              isDone,
            });
          }
        }
      }

      // 4. Statut d'entretien sans interaction explicite (afficher UNIQUEMENT s'il y a une date valide et aucun doublon)
      if (app.status === 'interview' && explicitInterviewDates.size === 0) {
        const interviewDate = followDate || appDate;
        if (interviewDate && /^\d{4}-\d{2}-\d{2}$/.test(interviewDate)) {
          const hasCustom = appDateTypeKeys.has(`app_${app.id}_${interviewDate}`);
          const key = `status_interview_${app.id}_${interviewDate}`;
          if (!seenEventKeys.has(key) && !hasCustom && !seenEventKeys.has(`followup_${app.id}_${interviewDate}`)) {
            seenEventKeys.add(key);
            list.push({
              id: `status-interview-${app.id}`,
              sourceType: 'application_interaction',
              appId: app.id,
              company: app.company,
              role: app.role,
              date: interviewDate,
              type: 'interview',
              category: 'application',
              location: app.location,
              title: 'Entretien en cours de process',
              description: `Session d'entretien avec l'équipe ${app.company} pour le poste de ${app.role}`,
              status: interviewDate < todayStr ? 'past' : interviewDate === todayStr ? 'today' : 'upcoming',
              isDone: interviewDate < todayStr,
            });
          }
        }
      }
    });

    // Tri par date chronologique
    return list.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [applications, customEvents, todayStr]);

  // 2. Statistiques clés
  const calendarStats = useMemo(() => {
    const upcoming = allActions.filter((a) => a.status === 'upcoming' || a.status === 'today');
    const overdue = allActions.filter((a) => a.status === 'overdue');
    const past = allActions.filter((a) => a.status === 'past' || a.status === 'completed');
    const interviews = allActions.filter((a) => a.type === 'interview');
    const followUpsPending = allActions.filter((a) => a.type === 'follow_up' && !a.isDone);
    const franceTravail = allActions.filter((a) => a.category === 'france_travail');
    const salons = allActions.filter((a) => a.category === 'salon');

    return {
      total: allActions.length,
      upcomingCount: upcoming.length,
      overdueCount: overdue.length,
      pastCount: past.length,
      interviewsCount: interviews.length,
      followUpsPendingCount: followUpsPending.length,
      franceTravailCount: franceTravail.length,
      salonsCount: salons.length,
    };
  }, [allActions]);

  // 3. Filtrage des actions
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

      // Filtre catégorie
      if (categoryFilter === 'france_travail' && act.category !== 'france_travail') return false;
      if (categoryFilter === 'salon' && act.category !== 'salon') return false;
      if (categoryFilter === 'interview' && act.type !== 'interview') return false;
      if (categoryFilter === 'follow_up' && act.type !== 'follow_up') return false;
      if (categoryFilter === 'application' && act.category !== 'application') return false;

      // Filtre textuel
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          act.company.toLowerCase().includes(q) ||
          act.role.toLowerCase().includes(q) ||
          act.title.toLowerCase().includes(q) ||
          (act.description && act.description.toLowerCase().includes(q)) ||
          (act.location && act.location.toLowerCase().includes(q)) ||
          (act.contactName && act.contactName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [allActions, timeFilter, categoryFilter, searchQuery]);

  // 4. Actions du jour sélectionné (comparaison stricte de dates normalisées)
  const selectedDateActions = useMemo(() => {
    const normSelected = normalizeDate(selectedDate);
    if (!normSelected) return [];
    return allActions.filter((a) => normalizeDate(a.date) === normSelected);
  }, [allActions, selectedDate]);

  // 5. Actions groupées par date pour le calendrier mensuel (clés normalisées YYYY-MM-DD)
  const actionsByDateMap = useMemo(() => {
    const map = new Map<string, CalendarActionItem[]>();
    allActions.forEach((act) => {
      const normDate = normalizeDate(act.date);
      if (!normDate) return;
      const existing = map.get(normDate) || [];
      existing.push(act);
      map.set(normDate, existing);
    });
    return map;
  }, [allActions]);

  // 6. Génération des jours du mois en cours avec dates strictement locales (zéro décalage UTC)
  const calendarGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

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

    const normSelected = normalizeDate(selectedDate);

    // Jours du mois précédent
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatLocalYMD(prevDate);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === normSelected,
        actions: actionsByDateMap.get(dateStr) || [],
      });
    }

    // Jours du mois actuel
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(currentYear, currentMonth, d);
      const dateStr = formatLocalYMD(currDate);
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === normSelected,
        actions: actionsByDateMap.get(dateStr) || [],
      });
    }

    // Jours du mois suivant
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(currentYear, currentMonth + 1, n);
      const dateStr = formatLocalYMD(nextDate);
      days.push({
        dateStr,
        dayNumber: n,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === normSelected,
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

  // =========================================================================
  // GESTION COMPLÈTE DE L'ÉDITION & DE LA CRÉATION
  // =========================================================================
  const handleOpenAddModal = (defaultDate?: string, category: CalendarEventCategory = 'france_travail') => {
    setEditingAction(null);
    setFormCategory(category);
    setFormDate(defaultDate || selectedDate || todayStr);
    setFormTime('10:00');
    setFormLocation('');
    setFormContact('');
    setFormContent('');
    setFormAppId('');
    setFormIsDone(false);

    if (category === 'france_travail') {
      setFormCompany('France Travail');
      setFormRole('Rendez-vous Conseiller');
      setFormTitle('Entretien de suivi mensuel France Travail');
      setFormType('france_travail');
    } else if (category === 'salon') {
      setFormCompany('Salon / Forum de Recrutement');
      setFormRole('Forum Emploi & Carrières');
      setFormTitle('Participation au salon de recrutement');
      setFormType('salon_forum');
    } else {
      setFormCompany(applications[0]?.company || 'Entreprise Cible');
      setFormRole(applications[0]?.role || 'Poste Cible');
      setFormTitle('Entretien de recrutement');
      setFormType('interview');
      setFormAppId(applications[0]?.id || '');
    }

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (act: CalendarActionItem) => {
    setEditingAction(act);
    setFormCategory(act.category || 'personal');
    setFormCompany(act.company || '');
    setFormRole(act.role || '');
    setFormTitle(act.title || '');
    setFormType(act.type as CalendarEventType);
    setFormDate(act.date || todayStr);
    setFormTime(act.time || '');
    setFormLocation(act.location || '');
    setFormContact(act.contactName || '');
    setFormContent(act.description || '');
    setFormAppId(act.appId || '');
    setFormIsDone(Boolean(act.isDone));
    setIsModalOpen(true);
  };

  // Enregistrer (Création OU Modification d'événement)
  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDate = normalizeDate(formDate);
    if (!formTitle.trim() || !cleanDate) return;

    // A. MODIFICATION D'UN ÉVÉNEMENT EXISTANT
    if (editingAction) {
      // 1. Événement personnalisé (France Travail, Salon, etc.)
      if (editingAction.sourceType === 'custom_event' && editingAction.customEventId) {
        const updatedEvt: CustomCalendarEvent = {
          id: editingAction.customEventId,
          title: formTitle.trim(),
          date: cleanDate,
          time: formTime.trim() || undefined,
          type: formType,
          category: formCategory,
          organizerOrCompany: formCompany.trim() || (formCategory === 'france_travail' ? 'France Travail' : formCategory === 'salon' ? 'Salon Recrutement' : 'Personnel'),
          roleOrSubject: formRole.trim() || undefined,
          location: formLocation.trim() || undefined,
          contactName: formContact.trim() || undefined,
          description: formContent.trim() || undefined,
          applicationId: formAppId.trim() || undefined,
          isCompleted: formIsDone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await localDbClient.saveCalendarEvent(updatedEvt);
        setCustomEvents((prev) =>
          prev.map((evt) => (evt.id === updatedEvt.id ? updatedEvt : evt))
        );
      }
      // 2. Interaction sur candidature (Entretien, Appel, etc.)
      else if (editingAction.sourceType === 'application_interaction' && editingAction.appId) {
        const targetApp = applications.find((a) => a.id === editingAction.appId);
        if (targetApp) {
          let updatedInteractions = [...(targetApp.interactions || [])];
          if (editingAction.sourceInteractionId) {
            updatedInteractions = updatedInteractions.map((inter) => {
              if (inter.id === editingAction.sourceInteractionId) {
                return {
                  ...inter,
                  date: cleanDate,
                  title: formTitle.trim(),
                  content: formContent.trim(),
                  type: formType as ApplicationInteractionType,
                  contactName: formContact.trim() || undefined,
                };
              }
              return inter;
            });
          } else {
            // Création explicite si c'était un statut sans id d'interaction
            const newInter: ApplicationInteraction = {
              id: `inter-${Date.now()}`,
              date: cleanDate,
              type: (formType as ApplicationInteractionType) || 'interview',
              title: formTitle.trim(),
              content: formContent.trim() || `Entretien avec ${targetApp.company}`,
              contactName: formContact.trim() || undefined,
            };
            updatedInteractions.unshift(newInter);
          }

          const updatedApp: ApplicationItem = {
            ...targetApp,
            interactions: updatedInteractions,
            status: formType === 'interview' ? 'interview' : targetApp.status,
            updatedAt: new Date().toISOString(),
          };

          setApplications((prev) =>
            prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
          );
          await localDbClient.saveApplication(updatedApp);
        }
      }
      // 3. Relance sur candidature
      else if (editingAction.sourceType === 'application_followup' && editingAction.appId) {
        const targetApp = applications.find((a) => a.id === editingAction.appId);
        if (targetApp) {
          const updatedApp: ApplicationItem = {
            ...targetApp,
            followUpDate: cleanDate,
            checklist: {
              ...targetApp.checklist,
              followUpDone: formIsDone,
            },
            followUpDoneAt: formIsDone ? cleanDate : undefined,
            updatedAt: new Date().toISOString(),
          };

          setApplications((prev) =>
            prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
          );
          await localDbClient.saveApplication(updatedApp);
        }
      }
      // 4. Date de candidature
      else if (editingAction.sourceType === 'application_applied' && editingAction.appId) {
        const targetApp = applications.find((a) => a.id === editingAction.appId);
        if (targetApp) {
          const updatedApp: ApplicationItem = {
            ...targetApp,
            appliedDate: cleanDate,
            updatedAt: new Date().toISOString(),
          };

          setApplications((prev) =>
            prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
          );
          await localDbClient.saveApplication(updatedApp);
        }
      }

      setActionNotice('Rendez-vous / Action mis à jour avec succès !');
      setTimeout(() => setActionNotice(null), 3000);
      setSelectedDate(cleanDate);
    }
    // B. CRÉATION D'UN NOUVEL ÉVÉNEMENT
    else {
      // 1. Si rattaché à une candidature existante avec catégorie application
      if (formCategory === 'application' && formAppId) {
        const targetApp = applications.find((a) => a.id === formAppId);
        if (targetApp) {
          if (formType === 'follow_up') {
            const updatedApp: ApplicationItem = {
              ...targetApp,
              followUpDate: cleanDate,
              checklist: {
                ...targetApp.checklist,
                followUpDone: formIsDone,
              },
              followUpDoneAt: formIsDone ? cleanDate : undefined,
              updatedAt: new Date().toISOString(),
            };
            setApplications((prev) =>
              prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
            );
            await localDbClient.saveApplication(updatedApp);
          } else {
            const newInter: ApplicationInteraction = {
              id: `inter-${Date.now()}`,
              date: cleanDate,
              type: (formType as ApplicationInteractionType) || 'note',
              title: formTitle.trim(),
              content: formContent.trim() || 'Action programmée depuis le calendrier.',
              contactName: formContact.trim() || undefined,
            };

            const updatedApp: ApplicationItem = {
              ...targetApp,
              interactions: [newInter, ...(targetApp.interactions || [])],
              status: formType === 'interview' && targetApp.status === 'to_apply' ? 'interview' : targetApp.status,
              updatedAt: new Date().toISOString(),
            };

            setApplications((prev) =>
              prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
            );
            await localDbClient.saveApplication(updatedApp);
          }
        }
      } else {
        // 2. Événement autonome ou personnalisé (France Travail, Salon, Webinaire, Réseau...)
        const newEvt: CustomCalendarEvent = {
          id: `cal-evt-${Date.now()}`,
          title: formTitle.trim(),
          date: cleanDate,
          time: formTime.trim() || undefined,
          type: formType,
          category: formCategory,
          organizerOrCompany: formCompany.trim() || (formCategory === 'france_travail' ? 'France Travail' : formCategory === 'salon' ? 'Salon Recrutement' : 'Personnel'),
          roleOrSubject: formRole.trim() || undefined,
          location: formLocation.trim() || undefined,
          contactName: formContact.trim() || undefined,
          description: formContent.trim() || undefined,
          applicationId: formAppId.trim() || undefined,
          isCompleted: formIsDone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await localDbClient.saveCalendarEvent(newEvt);
        setCustomEvents((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          map.set(newEvt.id, newEvt);
          return Array.from(map.values());
        });
      }

      confetti({ particleCount: 30, spread: 60 });
      setActionNotice('Rendez-vous programmé et enregistré dans le calendrier !');
      setTimeout(() => setActionNotice(null), 3000);
      setSelectedDate(cleanDate);
    }

    setIsModalOpen(false);
  };

  // =========================================================================
  // SUPPRESSION D'UN ÉVÉNEMENT DU CALENDRIER (100% FONCTIONNELLE)
  // =========================================================================
  const handleConfirmDelete = async () => {
    if (!actionToDelete) return;

    try {
      // 1. Événement personnalisé
      if (actionToDelete.sourceType === 'custom_event' && actionToDelete.customEventId) {
        await localDbClient.deleteCalendarEvent(actionToDelete.customEventId);
        setCustomEvents((prev) => prev.filter((e) => e.id !== actionToDelete.customEventId));
      }
      // 2. Interaction sur candidature
      else if (actionToDelete.sourceType === 'application_interaction' && actionToDelete.appId) {
        const targetApp = applications.find((a) => a.id === actionToDelete.appId);
        if (targetApp) {
          const updatedInteractions = (targetApp.interactions || []).filter(
            (i) => i.id !== actionToDelete.sourceInteractionId
          );
          const updatedApp: ApplicationItem = {
            ...targetApp,
            interactions: updatedInteractions,
            status: actionToDelete.id.startsWith('status-interview') && targetApp.status === 'interview' ? 'applied' : targetApp.status,
            updatedAt: new Date().toISOString(),
          };
          setApplications((prev) =>
            prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
          );
          await localDbClient.saveApplication(updatedApp);
        }
      }
      // 3. Relance planifiée
      else if (actionToDelete.sourceType === 'application_followup' && actionToDelete.appId) {
        const targetApp = applications.find((a) => a.id === actionToDelete.appId);
        if (targetApp) {
          const updatedApp: ApplicationItem = {
            ...targetApp,
            followUpDate: '',
            updatedAt: new Date().toISOString(),
          };
          setApplications((prev) =>
            prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
          );
          await localDbClient.saveApplication(updatedApp);
        }
      }
      // 4. Candidature transmise
      else if (actionToDelete.sourceType === 'application_applied' && actionToDelete.appId) {
        const targetApp = applications.find((a) => a.id === actionToDelete.appId);
        if (targetApp) {
          const updatedApp: ApplicationItem = {
            ...targetApp,
            appliedDate: '',
            updatedAt: new Date().toISOString(),
          };
          setApplications((prev) =>
            prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
          );
          await localDbClient.saveApplication(updatedApp);
        }
      }

      setActionNotice('Action / Rendez-vous supprimé du calendrier.');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      console.error('Erreur suppression calendrier :', err);
    } finally {
      setActionToDelete(null);
    }
  };

  // Bascule rapide Fait / Non Fait
  const handleToggleActionDone = async (act: CalendarActionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (act.sourceType === 'custom_event' && act.customEventId) {
      const target = customEvents.find((evt) => evt.id === act.customEventId);
      if (target) {
        const updated: CustomCalendarEvent = {
          ...target,
          isCompleted: !target.isCompleted,
          updatedAt: new Date().toISOString(),
        };
        await localDbClient.saveCalendarEvent(updated);
        setCustomEvents((prev) =>
          prev.map((evt) => (evt.id === updated.id ? updated : evt))
        );
      }
    } else if (act.appId) {
      const targetApp = applications.find((a) => a.id === act.appId);
      if (targetApp) {
        const currentDone = Boolean(targetApp.checklist?.followUpDone);
        const newDone = !currentDone;

        const updatedApp: ApplicationItem = {
          ...targetApp,
          checklist: {
            ...targetApp.checklist,
            followUpDone: newDone,
          },
          followUpDoneAt: newDone ? todayStr : undefined,
          updatedAt: new Date().toISOString(),
        };

        setApplications((prev) =>
          prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
        );
        await localDbClient.saveApplication(updatedApp);
      }
    }
  };

  // Reprogrammer une action (+3j ou +7j)
  const handleRescheduleAction = async (act: CalendarActionItem, daysToAdd: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const curr = act.date ? new Date(act.date + 'T12:00:00') : new Date();
    curr.setDate(curr.getDate() + daysToAdd);
    const targetDate = formatLocalYMD(curr);

    if (act.sourceType === 'custom_event' && act.customEventId) {
      const target = customEvents.find((evt) => evt.id === act.customEventId);
      if (target) {
        const updated: CustomCalendarEvent = {
          ...target,
          date: targetDate,
          isCompleted: false,
          updatedAt: new Date().toISOString(),
        };
        await localDbClient.saveCalendarEvent(updated);
        setCustomEvents((prev) =>
          prev.map((evt) => (evt.id === updated.id ? updated : evt))
        );
      }
    } else if (act.appId) {
      const targetApp = applications.find((a) => a.id === act.appId);
      if (targetApp) {
        const updatedApp: ApplicationItem = {
          ...targetApp,
          followUpDate: targetDate,
          checklist: {
            ...targetApp.checklist,
            followUpDone: false,
          },
          updatedAt: new Date().toISOString(),
        };
        setApplications((prev) =>
          prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
        );
        await localDbClient.saveApplication(updatedApp);
      }
    }
    setSelectedDate(targetDate);
  };

  // Icône selon type d'événement
  const renderActionIcon = (type: CalendarActionItem['type'], category?: CalendarEventCategory) => {
    if (category === 'france_travail' || type === 'france_travail') {
      return <Landmark className="w-3.5 h-3.5 text-blue-700" />;
    }
    if (category === 'salon' || type === 'salon_forum') {
      return <Sparkles className="w-3.5 h-3.5 text-fuchsia-600" />;
    }
    if (category === 'webinar' || type === 'webinar') {
      return <Video className="w-3.5 h-3.5 text-teal-600" />;
    }
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

  // Style de badge selon catégorie et statut
  const getBadgeStyle = (status: CalendarActionItem['status'], type: CalendarActionItem['type'], category?: CalendarEventCategory) => {
    if (status === 'overdue') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (status === 'completed') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (status === 'today') {
      return 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse';
    }
    if (category === 'france_travail') {
      return 'bg-sky-50 text-sky-800 border-sky-300';
    }
    if (category === 'salon') {
      return 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300';
    }
    if (category === 'webinar') {
      return 'bg-teal-50 text-teal-800 border-teal-300';
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
      {/* Toast d'information */}
      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button type="button" onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            ✕
          </button>
        </div>
      )}

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
                <span>Calendrier des Actions & Rendez-vous</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {calendarStats.total} événements
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Gérez vos entretiens, relances, <strong>rendez-vous France Travail</strong>, <strong>salons de recrutement</strong> et démarches personnalisées.
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

          {/* Bouton ajouter rendez-vous personnalisé */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenAddModal(selectedDate, 'france_travail')}
              className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              title="Ajouter un rendez-vous avec France Travail ou un conseiller"
            >
              <Landmark className="w-3.5 h-3.5 text-blue-700" />
              <span>+ France Travail</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddModal(selectedDate, 'salon')}
              className="px-3 py-2 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              title="Ajouter un salon de recrutement, forum emploi ou job dating"
            >
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-600" />
              <span>+ Salon / Forum</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddModal(selectedDate, 'application')}
              className="px-3.5 py-2 bg-[#0A2540] hover:bg-[#133557] text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-[#00D287]" />
              <span>Autre action</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mini-KPIs du calendrier avec filtres directs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
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
          <div className="text-[10px] text-amber-800">À effectuer en priorité</div>
        </div>

        <div
          onClick={() => setCategoryFilter(categoryFilter === 'france_travail' ? 'all' : 'france_travail')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'france_travail'
              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase text-sky-800 flex items-center gap-1">
            <Landmark className="w-3 h-3 text-blue-700" />
            <span>France Travail</span>
          </div>
          <div className="text-xl font-black text-sky-900">{calendarStats.franceTravailCount}</div>
          <div className="text-[10px] text-sky-700">Rendez-vous conseiller</div>
        </div>

        <div
          onClick={() => setCategoryFilter(categoryFilter === 'salon' ? 'all' : 'salon')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'salon'
              ? 'bg-fuchsia-50 border-fuchsia-400 ring-2 ring-fuchsia-200'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase text-fuchsia-800 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-fuchsia-600" />
            <span>Salons & Forums</span>
          </div>
          <div className="text-xl font-black text-fuchsia-900">{calendarStats.salonsCount}</div>
          <div className="text-[10px] text-fuchsia-700">Job dating & rencontres</div>
        </div>

        <div
          onClick={() => setCategoryFilter(categoryFilter === 'interview' ? 'all' : 'interview')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'interview'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase text-purple-700">Entretiens</div>
          <div className="text-xl font-black text-purple-800">{calendarStats.interviewsCount}</div>
          <div className="text-[10px] text-slate-500">RH & opérationnels</div>
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
          <div className="text-[10px] text-emerald-700">Historique complet</div>
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
              setCategoryFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              timeFilter === 'all' && categoryFilter === 'all'
                ? 'bg-[#0A2540] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({calendarStats.total})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'france_travail' ? 'all' : 'france_travail')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'france_travail'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Landmark className="w-3 h-3" />
            <span>France Travail ({calendarStats.franceTravailCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'salon' ? 'all' : 'salon')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              categoryFilter === 'salon'
                ? 'bg-fuchsia-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Salons ({calendarStats.salonsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'interview' ? 'all' : 'interview')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              categoryFilter === 'interview'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Entretiens ({calendarStats.interviewsCount})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'follow_up' ? 'all' : 'follow_up')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              categoryFilter === 'follow_up'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Relances ({calendarStats.followUpsPendingCount})
          </button>
        </div>

        {/* Recherche rapide */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher organisme, salon, poste..."
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
          {/* Navigation du mois */}
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
              <h3 className="text-sm font-black text-[#0A2540] min-w-[150px] text-center">
                {MONTH_NAMES_FR[currentMonth]} {currentYear}
              </h3>
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
                className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Aujourd&apos;hui
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Grille du calendrier (8 colonnes) */}
            <div className="lg:col-span-8 bg-slate-50 rounded-3xl border border-slate-200 p-3 sm:p-4">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 uppercase pb-2 border-b border-slate-200/80 mb-2">
                {WEEKDAYS_FR.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarGridDays.map((day, idx) => {
                  const isSelected = day.isSelected;
                  const hasOverdue = day.actions.some((a) => a.status === 'overdue');
                  const hasTodayAction = day.actions.some((a) => a.status === 'today');

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`min-h-[75px] sm:min-h-[85px] p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-300 shadow-sm'
                          : day.isToday
                          ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200'
                          : day.isCurrentMonth
                          ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
                          : 'bg-slate-100/50 border-slate-200/50 opacity-40 hover:opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                            day.isToday
                              ? 'bg-amber-500 text-white font-black shadow-2xs'
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
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" title="Relance en retard !" />
                        )}
                        {!hasOverdue && hasTodayAction && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Action aujourd'hui" />
                        )}
                      </div>

                      {/* Aperçu des événements du jour */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {day.actions.slice(0, 2).map((act) => (
                          <div
                            key={act.id}
                            className={`text-[9px] px-1 py-0.5 rounded truncate font-bold border flex items-center gap-1 ${
                              act.category === 'france_travail'
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : act.category === 'salon'
                                ? 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300'
                                : act.type === 'interview'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : act.type === 'follow_up'
                                ? act.isDone
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                            title={`${act.time ? act.time + ' ' : ''}${act.title} - ${act.company}`}
                          >
                            <span className="truncate">
                              {act.time ? `${act.time} ` : ''}{act.company}
                            </span>
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

            {/* Volet Latéral : Détail de la Date Sélectionnée & Actions modifiables/supprimables (4 colonnes) */}
            <div className="lg:col-span-4 bg-slate-50 rounded-3xl border border-slate-200 p-4 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
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
                    onClick={() => handleOpenAddModal(selectedDate, 'france_travail')}
                    className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                    title="Ajouter une action ou un rendez-vous ce jour-là"
                  >
                    <Plus className="w-4 h-4 text-indigo-600" />
                  </button>
                </div>

                {selectedDateActions.length === 0 ? (
                  <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                    <CalendarCheck className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Aucune action ce jour-là</p>
                    <p className="text-[11px] text-slate-500">
                      Ajoutez un rendez-vous France Travail, un salon ou une relance.
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(selectedDate, 'france_travail')}
                        className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Landmark className="w-3 h-3 text-blue-700" />
                        <span>France Travail</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(selectedDate, 'salon')}
                        className="px-2.5 py-1.5 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-fuchsia-600" />
                        <span>Salon / Forum</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {selectedDateActions.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {renderActionIcon(act.type, act.category)}
                            <span className="font-extrabold text-[#0A2540] truncate">{act.company}</span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeStyle(
                              act.status,
                              act.type,
                              act.category
                            )}`}
                          >
                            {act.status === 'overdue' && 'En retard'}
                            {act.status === 'completed' && 'Fait ✓'}
                            {act.status === 'today' && "Aujourd'hui"}
                            {act.status === 'upcoming' && 'À venir'}
                            {act.status === 'past' && 'Passé'}
                          </span>
                        </div>

                        <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between gap-2">
                          <span>{act.title}</span>
                          {act.time && (
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold shrink-0 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{act.time}</span>
                            </span>
                          )}
                        </div>

                        {act.role && <div className="text-[10px] text-slate-500">Sujet / Poste : {act.role}</div>}

                        {act.location && (
                          <div className="text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded-lg flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{act.location}</span>
                          </div>
                        )}

                        {act.description && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl leading-relaxed whitespace-pre-wrap">
                            {act.description}
                          </p>
                        )}

                        {act.contactName && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>Contact : {act.contactName}</span>
                          </div>
                        )}

                        {/* Barre d'actions : MODIFIER, SUPPRIMER, Fait, Repousser */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1">
                            {/* BOUTON MODIFIER */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(act)}
                              className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Modifier cet événement (date, heure, titre, lieu, notes...)"
                            >
                              <Edit3 className="w-3 h-3 text-indigo-600" />
                              <span>Modifier</span>
                            </button>

                            {/* BOUTON SUPPRIMER */}
                            <button
                              type="button"
                              onClick={() => setActionToDelete(act)}
                              className="p-1 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer définitivement cet événement du calendrier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* BOUTON BASCULE FAIT */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleActionDone(act, e)}
                              className={`px-2 py-1 rounded-lg font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer ${
                                act.isDone
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{act.isDone ? 'Déjà fait' : 'Valider ✓'}</span>
                            </button>

                            {/* BOUTON REPOUSSER (+3j) si pas encore fait */}
                            {!act.isDone && (
                              <button
                                type="button"
                                onClick={(e) => handleRescheduleAction(act, 3, e)}
                                className="px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold cursor-pointer"
                                title="Repousser de 3 jours"
                              >
                                +3j
                              </button>
                            )}

                            {act.appId && onNavigateToTab && (
                              <button
                                type="button"
                                onClick={() => onNavigateToTab('tracker')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                                title="Voir la candidature dans le Kanban"
                              >
                                <span>Dossier</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raccourci bas de volet */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Besoin d&apos;un autre rendez-vous ?</span>
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(selectedDate, 'france_travail')}
                  className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Ajouter</span>
                </button>
              </div>
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
            <span className="text-[11px] text-slate-500">Toutes modifiables et supprimables</span>
          </div>

          {filteredActions.length === 0 ? (
            <div className="p-10 bg-slate-50 rounded-3xl text-center space-y-2 border border-slate-200">
              <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Aucune action ne correspond aux critères</h4>
              <p className="text-xs text-slate-500">
                Essayez d&apos;ajuster vos filtres de statut ou d&apos;ajouter un rendez-vous (France Travail, Salon, etc.).
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredActions.map((act) => {
                const dateObj = new Date(act.date + 'T00:00:00');

                return (
                  <div
                    key={act.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      act.status === 'overdue'
                        ? 'bg-rose-50/60 border-rose-200'
                        : act.status === 'today'
                        ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                        : act.category === 'france_travail'
                        ? 'bg-sky-50/50 border-sky-300'
                        : act.category === 'salon'
                        ? 'bg-fuchsia-50/50 border-fuchsia-300'
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
                          {act.time && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                              🕒 {act.time}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                              act.status,
                              act.type,
                              act.category
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
                          {renderActionIcon(act.type, act.category)}
                          <span>{act.title}</span>
                          {act.role && <span className="text-slate-400 font-normal">• {act.role}</span>}
                        </div>

                        {act.location && (
                          <div className="text-[10px] text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>{act.location}</span>
                          </div>
                        )}

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

                    {/* Colonne droite : Actions de Modification & Suppression */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(act)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Modifier cet événement"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Modifier</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActionToDelete(act)}
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                        title="Supprimer cet événement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleActionDone(act, e)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          act.isDone
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{act.isDone ? 'Fait ✓' : 'Marquer fait'}</span>
                      </button>

                      {!act.isDone && (
                        <button
                          type="button"
                          onClick={(e) => handleRescheduleAction(act, 7, e)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer"
                          title="Repousser de 7 jours"
                        >
                          +7j
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
          4. MODAL UNIFIÉ DE CRÉATION & MODIFICATION D'ÉVÉNEMENT
         ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-gray-100 my-6 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  {editingAction ? <Edit3 className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
                </span>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingAction ? "Modifier l'événement / le rendez-vous" : 'Planifier un rendez-vous ou une action'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    France Travail, salons de recrutement, entretiens, relances ou démarches
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* 1. Sélecteur de Catégorie Visuelle */}
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Catégorie du rendez-vous *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'france_travail', label: 'France Travail', icon: Landmark, desc: 'Conseiller & ateliers' },
                    { id: 'salon', label: 'Salon / Forum', icon: Sparkles, desc: 'Job dating & foires' },
                    { id: 'application', label: 'Entreprise / Poste', icon: Building2, desc: 'Candidature ciblée' },
                    { id: 'webinar', label: 'Webinaire', icon: Video, desc: 'Formation & visio' },
                    { id: 'network', label: 'Réseau Pro', icon: Users, desc: 'Afterwork & échange' },
                    { id: 'personal', label: 'Autre démarche', icon: Briefcase, desc: 'Personnel' },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = formCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setFormCategory(cat.id as CalendarEventCategory);
                          if (cat.id === 'france_travail' && !formCompany) {
                            setFormCompany('France Travail');
                            setFormRole('Rendez-vous Conseiller');
                            setFormType('france_travail');
                          } else if (cat.id === 'salon' && !formCompany) {
                            setFormCompany('Salon de recrutement');
                            setFormRole('Job Dating');
                            setFormType('salon_forum');
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs font-extrabold ring-1 ring-indigo-300'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`} />
                          <span className="font-extrabold">{cat.label}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{cat.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Organisme, Salon ou Entreprise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    {formCategory === 'france_travail'
                      ? 'Agence / Organisme *'
                      : formCategory === 'salon'
                      ? 'Nom du Salon / Forum *'
                      : 'Entreprise ou Organisme *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder={
                      formCategory === 'france_travail'
                        ? 'Ex : France Travail Paris 12'
                        : formCategory === 'salon'
                        ? 'Ex : Paris pour l’Emploi, Salon APEC'
                        : 'Ex : Axione, Bip&Go...'
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-hidden focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    {formCategory === 'france_travail' || formCategory === 'salon'
                      ? 'Sujet / Objectif'
                      : 'Poste ciblé'}
                  </label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder={
                      formCategory === 'france_travail'
                        ? 'Ex : Suivi de projet, Bilan'
                        : formCategory === 'salon'
                        ? 'Ex : Rencontre recruteurs Finance/IT'
                        : 'Ex : Responsable Financier'
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 3. Titre / Objet principal */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Titre de l&apos;action / Objet *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex : Entretien mensuel avec ma conseillère référente, Stand Valoria Capital..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-indigo-500 font-bold"
                />
              </div>

              {/* 4. Type d'action */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Type d&apos;action précis</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CalendarEventType)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-800 font-semibold focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="france_travail">🏛️ Rendez-vous France Travail / Conseiller</option>
                  <option value="salon_forum">🎪 Salon de recrutement / Forum Emploi</option>
                  <option value="interview">🎯 Entretien d&apos;embauche (RH / Manager)</option>
                  <option value="follow_up">⏰ Relance téléphonique ou par email</option>
                  <option value="call">📞 Appel téléphonique</option>
                  <option value="email">✉️ Échange par email</option>
                  <option value="webinar">💻 Webinaire / Conférence en ligne</option>
                  <option value="network">🤝 Événement réseau / Afterwork</option>
                  <option value="test_exam">📝 Test technique / Questionnaire</option>
                  <option value="note">📌 Note / Démarche personnelle</option>
                </select>
              </div>

              {/* 5. Date & Heure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Date du rendez-vous *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 font-bold focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Heure du rendez-vous (optionnel)</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* 6. Lieu & Interlocuteur */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Lieu ou Lien visio (optionnel)</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="Ex : 12 rue de Bercy, Visio Teams..."
                      className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Interlocuteur / Contact (optionnel)</label>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formContact}
                      onChange={(e) => setFormContact(e.target.value)}
                      placeholder="Ex : Mme. Martin (Conseillère)..."
                      className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 7. Notes & consignes */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Détails, consignes ou pièces à apporter</label>
                <textarea
                  rows={3}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Ex : Apporter 5 CV imprimés, identifiant France Travail, questions à poser sur les postes..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* 8. Rattachement optionnel à une candidature du Tracker */}
              {applications.length > 0 && (
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Lier à une candidature du Tracker (optionnel)
                  </label>
                  <select
                    value={formAppId}
                    onChange={(e) => setFormAppId(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white text-gray-800 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">-- Aucun lien (Événement autonome / Hors candidature) --</option>
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.company} — {app.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 9. Case à cocher Marqué comme réalisé */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={formIsDone}
                    onChange={(e) => setFormIsDone(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Action / Rendez-vous déjà effectué (Marquer comme réalisé ✓)</span>
                </label>
              </div>

              {/* Boutons validation */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!formTitle.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingAction ? 'Enregistrer les modifications' : 'Programmer le rendez-vous'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. MODAL DE CONFIRMATION DE SUPPRESSION
         ========================================================================= */}
      {actionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2.5 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Supprimer cet événement ?</h3>
                <p className="text-xs text-gray-500">Cette action retirera le rendez-vous du calendrier.</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
              <p><strong>{actionToDelete.title}</strong></p>
              <p className="text-gray-500">{actionToDelete.company} — {actionToDelete.date} {actionToDelete.time ? `à ${actionToDelete.time}` : ''}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionToDelete(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-all"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionCalendarView;
