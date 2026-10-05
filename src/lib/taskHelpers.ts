/**
 * ApexFlow OS - Operational Task Helpers & Date Normalizer
 * 
 * Regra de interpretação de prazos operacionais:
 * 1. `dueDate`: Campo primário oficial de vencimento da tarefa (formato ISO YYYY-MM-DD).
 * 2. `deadline`: Campo secundário de prazo limite (formato ISO YYYY-MM-DD).
 * 3. `date`: Campo legado do Kanban semanal ('Segunda-feira', 'Terça-feira' etc.).
 *    SOMENTE interpretado como data se contiver uma data válida (ex: '2026-10-05') e NÃO o nome do dia.
 * 4. undefined: Quando nenhum prazo válido está configurado.
 */

import { Task } from '../types';

const WEEKDAY_NAMES = [
  'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo',
  'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sabado',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

/**
 * Returns today's local date as YYYY-MM-DD
 */
export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates if a string is a calendar date and not a weekday label
 */
export function isValidDateString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim().toLowerCase();
  if (!trimmed) return false;
  
  // If it's a weekday name, it's not a specific calendar date
  if (WEEKDAY_NAMES.includes(trimmed)) return false;

  // YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    return !isNaN(d.getTime());
  }

  // DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    const parsed = new Date(`${y}-${m}-${d}`);
    return !isNaN(parsed.getTime());
  }

  // General ISO or parseable string
  const d = new Date(str);
  if (!isNaN(d.getTime()) && !/^\d+$/.test(trimmed)) {
    const yr = d.getFullYear();
    return yr >= 2020 && yr <= 2050;
  }

  return false;
}

/**
 * Converts any valid date string or Date to YYYY-MM-DD
 */
export function formatToISODate(input?: string | Date | null): string | undefined {
  if (!input) return undefined;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return undefined;
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const day = String(input.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(input).trim();
  if (!isValidDateString(str)) return undefined;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return undefined;
  }
}

/**
 * Prioritized extraction of operational due date:
 * 1. dueDate (if valid ISO date)
 * 2. deadline (if valid ISO date)
 * 3. date (ONLY if it represents a valid calendar date and not a weekday name)
 * 4. undefined
 */
export function getTaskDueDate(task: Task | any): string | undefined {
  if (!task) return undefined;

  // 1. dueDate
  if (task.dueDate && isValidDateString(task.dueDate)) {
    return formatToISODate(task.dueDate);
  }

  // 2. deadline
  if (task.deadline && isValidDateString(task.deadline)) {
    return formatToISODate(task.deadline);
  }

  // 3. date (only if valid calendar date)
  if (task.date && isValidDateString(task.date)) {
    return formatToISODate(task.date);
  }

  return undefined;
}

/**
 * Checks if task is marked as completed
 */
export function isTaskCompleted(task: Task | any): boolean {
  if (!task || !task.status) return false;
  const s = String(task.status).trim().toLowerCase();
  return s === 'concluído' || s === 'concluido' || s === 'done' || s === 'completed';
}

/**
 * Checks if task is marked as in progress
 */
export function isTaskInProgress(task: Task | any): boolean {
  if (!task || !task.status) return false;
  const s = String(task.status).trim().toLowerCase();
  return s === 'em andamento' || s === 'in-progress' || s === 'progress';
}

/**
 * Checks if task is pending / to-do
 */
export function isTaskPending(task: Task | any): boolean {
  return !isTaskCompleted(task) && !isTaskInProgress(task);
}

export type TaskTemporalStatus = 'completed' | 'overdue' | 'today' | 'upcoming' | 'no_due_date';

/**
 * Computes the derived operational temporal status for interface display.
 * Golden rule: Completed tasks are NEVER overdue.
 */
export function getTaskTemporalStatus(task: Task | any, referenceDateStr?: string): TaskTemporalStatus {
  if (!task) return 'no_due_date';

  if (isTaskCompleted(task)) {
    return 'completed';
  }

  const dueDate = getTaskDueDate(task);
  if (!dueDate) {
    return 'no_due_date';
  }

  const today = referenceDateStr || getTodayISODate();

  if (dueDate < today) {
    return 'overdue';
  }

  if (dueDate === today) {
    return 'today';
  }

  return 'upcoming';
}

/**
 * Check if a task is due in the next 7 days (tomorrow through today + 7 days)
 */
export function isTaskInNext7Days(task: Task | any, referenceDateStr?: string): boolean {
  if (isTaskCompleted(task)) return false;
  const dueDate = getTaskDueDate(task);
  if (!dueDate) return false;

  const today = referenceDateStr || getTodayISODate();
  if (dueDate <= today) return false;

  const todayDate = new Date(`${today}T00:00:00`);
  const taskDate = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.round((taskDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  return diffDays > 0 && diffDays <= 7;
}

/**
 * Human-readable friendly due date label
 */
export function formatTaskDueDisplay(task: Task | any): { label: string; isOverdue: boolean; isToday: boolean; hasDate: boolean } {
  const dueDate = getTaskDueDate(task);
  if (!dueDate) {
    // If it has a weekday name in `date`, show it as reference
    if (task?.date && typeof task.date === 'string' && WEEKDAY_NAMES.includes(task.date.trim().toLowerCase())) {
      return {
        label: task.date,
        isOverdue: false,
        isToday: false,
        hasDate: false
      };
    }
    return {
      label: 'Sem prazo',
      isOverdue: false,
      isToday: false,
      hasDate: false
    };
  }

  const today = getTodayISODate();
  const [y, m, d] = dueDate.split('-');
  const formattedBR = `${d}/${m}`;

  if (dueDate < today) {
    const todayDate = new Date(`${today}T00:00:00`);
    const dueD = new Date(`${dueDate}T00:00:00`);
    const diff = Math.round((todayDate.getTime() - dueD.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: diff === 1 ? `Ontem (${formattedBR})` : `Atrasado há ${diff}d (${formattedBR})`,
      isOverdue: !isTaskCompleted(task),
      isToday: false,
      hasDate: true
    };
  }

  if (dueDate === today) {
    return {
      label: `Hoje (${formattedBR})`,
      isOverdue: false,
      isToday: true,
      hasDate: true
    };
  }

  const todayDate = new Date(`${today}T00:00:00`);
  const dueD = new Date(`${dueDate}T00:00:00`);
  const diff = Math.round((dueD.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 1) {
    return {
      label: `Amanhã (${formattedBR})`,
      isOverdue: false,
      isToday: false,
      hasDate: true
    };
  }

  return {
    label: `${formattedBR} (em ${diff}d)`,
    isOverdue: false,
    isToday: false,
    hasDate: true
  };
}

/**
 * Numeric priority rank for sorting
 */
export function getPriorityWeight(priority?: string): number {
  if (!priority) return 1;
  const p = priority.toLowerCase().trim();
  switch (p) {
    case 'urgente':
    case 'urgent':
      return 4;
    case 'alta':
    case 'high':
      return 3;
    case 'média':
    case 'media':
    case 'medium':
      return 2;
    case 'baixa':
    case 'low':
      return 1;
    default:
      return 1;
  }
}

/**
 * Calculates operational summary metrics for headers
 */
export function computeOperationalMetrics(tasks: (Task | any)[]) {
  const todayStr = getTodayISODate();

  let todayCount = 0;
  let overdueCount = 0;
  let inProgressCount = 0;
  let upcoming7DaysCount = 0;
  let noDueDateCount = 0;
  let completedCount = 0;

  for (const task of tasks) {
    const completed = isTaskCompleted(task);
    if (completed) {
      completedCount++;
      continue;
    }

    if (isTaskInProgress(task)) {
      inProgressCount++;
    }

    const temporalStatus = getTaskTemporalStatus(task, todayStr);
    if (temporalStatus === 'today') {
      todayCount++;
    } else if (temporalStatus === 'overdue') {
      overdueCount++;
    } else if (temporalStatus === 'no_due_date') {
      noDueDateCount++;
    }

    if (isTaskInNext7Days(task, todayStr)) {
      upcoming7DaysCount++;
    }
  }

  return {
    todayCount,
    overdueCount,
    inProgressCount,
    upcoming7DaysCount,
    noDueDateCount,
    completedCount,
    totalCount: tasks.length
  };
}

/**
 * Sorts tasks prioritizing:
 * 1. Atrasadas (overdue)
 * 2. Vencem hoje (today)
 * 3. Alta/Urgente prioridade
 * 4. Demais tarefas (por prazo crescente ou data de criação)
 */
export function sortOperationalTasks(tasks: (Task | any)[]): (Task | any)[] {
  const todayStr = getTodayISODate();

  return [...tasks].sort((a, b) => {
    const aCompleted = isTaskCompleted(a);
    const bCompleted = isTaskCompleted(b);

    // Completed always go to bottom in active operational views
    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1;
    }

    const aTemporal = getTaskTemporalStatus(a, todayStr);
    const bTemporal = getTaskTemporalStatus(b, todayStr);

    const temporalRank: Record<TaskTemporalStatus, number> = {
      overdue: 1,
      today: 2,
      upcoming: 3,
      no_due_date: 4,
      completed: 5
    };

    if (temporalRank[aTemporal] !== temporalRank[bTemporal]) {
      return temporalRank[aTemporal] - temporalRank[bTemporal];
    }

    // Secondary: priority weight descending
    const aPrio = getPriorityWeight(a.priority);
    const bPrio = getPriorityWeight(b.priority);
    if (aPrio !== bPrio) {
      return bPrio - aPrio;
    }

    // Tertiary: due date ascending (earliest first)
    const aDue = getTaskDueDate(a) || '9999-99-99';
    const bDue = getTaskDueDate(b) || '9999-99-99';
    return aDue.localeCompare(bDue);
  });
}
