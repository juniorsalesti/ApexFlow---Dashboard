import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { useCompany } from '../contexts/CompanyContext';
import { addTask, updateTask, deleteTask, generateTasksFromProcess } from '../services/db';
import { Process, Service, ClientService, Task, TaskGenerationResult, Client, Project, TeamMember } from '../types';
import { 
  getTaskDueDate, 
  getTaskTemporalStatus, 
  isTaskCompleted, 
  isTaskInProgress, 
  isTaskInNext7Days, 
  formatTaskDueDisplay, 
  computeOperationalMetrics,
  sortOperationalTasks,
  getTodayISODate,
  TaskTemporalStatus
} from '../lib/taskHelpers';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  CalendarClock, 
  CalendarX, 
  User, 
  Users, 
  Briefcase, 
  Layers, 
  Sparkles, 
  Filter, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  CheckSquare, 
  Square, 
  BarChart2, 
  FolderCheck, 
  ListTodo, 
  Zap, 
  LayoutGrid, 
  List, 
  Building2,
  FileSpreadsheet,
  Copy,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface OperationalSectionProps {
  tasks?: Task[];
  clients?: Client[];
  services?: Service[];
  clientServices?: ClientService[];
  processes?: Process[];
  projects?: Project[];
  leads?: any[];
  teamMembers?: TeamMember[];
}

type OperationalTab = 'focus' | 'all' | 'kanban' | 'clients' | 'services' | 'roles';
type TemporalQuickFilter = 'all' | 'today' | 'overdue' | 'upcoming' | 'in-progress' | 'completed' | 'no_due_date';

export function OperationalSection({
  tasks = [],
  clients = [],
  services = [],
  clientServices = [],
  processes = [],
  projects = [],
  leads = [],
  teamMembers = []
}: OperationalSectionProps) {
  const { selectedCompanyId, companies } = useCompany();

  // Active view tab
  const [activeTab, setActiveTab] = useState<OperationalTab>('focus');

  // Quick filter
  const [quickFilter, setQuickFilter] = useState<TemporalQuickFilter>('all');

  // Granular filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'process' | 'project' | 'manual'>('all');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generator modal state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genClientId, setGenClientId] = useState('');
  const [genProcessId, setGenProcessId] = useState('');
  const [genServiceId, setGenServiceId] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<TaskGenerationResult | null>(null);

  // Expanded client / service cards in grouped views
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});

  // Team Member Map for rapid lookups
  const teamMemberMap = useMemo(() => {
    const map = new Map<string, TeamMember>();
    teamMembers.forEach(m => map.set(m.id, m));
    return map;
  }, [teamMembers]);

  // Task form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    responsible: '',
    responsibleRole: '',
    assigneeId: '',
    priority: 'média',
    status: 'a fazer',
    clientId: '',
    serviceId: '',
    serviceName: '',
    projectId: '',
    dueDate: getTodayISODate(),
    deadline: '',
    companyId: ''
  });

  const todayStr = useMemo(() => getTodayISODate(), []);

  // Compute operational header metrics
  const metrics = useMemo(() => {
    return computeOperationalMetrics(tasks);
  }, [tasks]);

  // Distinct roles for filter dropdown
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    tasks.forEach(t => {
      if (t.responsibleRole?.trim()) roles.add(t.responsibleRole.trim());
      if (t.responsible?.trim()) roles.add(t.responsible.trim());
    });
    return Array.from(roles).sort();
  }, [tasks]);

  // Client lookup map
  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  // Filter tasks based on all active filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const temporalStatus = getTaskTemporalStatus(task, todayStr);
      const isCompleted = isTaskCompleted(task);
      const isInProg = isTaskInProgress(task);

      // Quick filter
      if (quickFilter === 'today') {
        if (temporalStatus !== 'today' || isCompleted) return false;
      } else if (quickFilter === 'overdue') {
        if (temporalStatus !== 'overdue' || isCompleted) return false;
      } else if (quickFilter === 'upcoming') {
        if (!isTaskInNext7Days(task, todayStr) || isCompleted) return false;
      } else if (quickFilter === 'in-progress') {
        if (!isInProg || isCompleted) return false;
      } else if (quickFilter === 'completed') {
        if (!isCompleted) return false;
      } else if (quickFilter === 'no_due_date') {
        if (temporalStatus !== 'no_due_date' || isCompleted) return false;
      }

      // Source filter
      if (filterSource === 'process') {
        if (task.source !== 'process' && !task.processId) return false;
      } else if (filterSource === 'project') {
        if (task.source !== 'project' && !task.projectId) return false;
      } else if (filterSource === 'manual') {
        if (task.source === 'process' || task.processId || task.source === 'project' || task.projectId) return false;
      }

      // Client filter
      if (filterClient !== 'all' && task.clientId !== filterClient) {
        return false;
      }

      // Service filter
      if (filterService !== 'all' && task.serviceId !== filterService && task.serviceName !== filterService) {
        return false;
      }

      // Process filter
      if (filterProcess !== 'all' && task.processId !== filterProcess) {
        return false;
      }

      // Role / Responsible filter
      if (filterRole !== 'all') {
        const matchesRole = task.responsibleRole?.toLowerCase() === filterRole.toLowerCase();
        const matchesResp = task.responsible?.toLowerCase() === filterRole.toLowerCase();
        if (!matchesRole && !matchesResp) return false;
      }

      // Team Member filter
      if (filterMember !== 'all') {
        if (filterMember === 'unassigned') {
          if (task.assigneeId) return false;
        } else if (task.assigneeId !== filterMember) {
          return false;
        }
      }

      // Priority filter
      if (filterPriority !== 'all' && (task.priority || '').toLowerCase() !== filterPriority.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const clientObj = task.clientId ? clientMap.get(task.clientId) : undefined;
        const clientName = (clientObj?.company || clientObj?.name || '').toLowerCase();
        const assignedMember = task.assigneeId ? teamMemberMap.get(task.assigneeId) : undefined;
        const memberName = (assignedMember?.name || '').toLowerCase();
        const memberRole = (assignedMember?.role || '').toLowerCase();

        const match = 
          (task.title || '').toLowerCase().includes(query) ||
          (task.description || '').toLowerCase().includes(query) ||
          (task.responsible || '').toLowerCase().includes(query) ||
          (task.responsibleRole || '').toLowerCase().includes(query) ||
          (task.processTitle || '').toLowerCase().includes(query) ||
          (task.serviceName || '').toLowerCase().includes(query) ||
          memberName.includes(query) ||
          memberRole.includes(query) ||
          clientName.includes(query);

        if (!match) return false;
      }

      return true;
    });
  }, [tasks, quickFilter, filterSource, filterClient, filterService, filterProcess, filterRole, filterMember, filterPriority, searchQuery, todayStr, clientMap, teamMemberMap]);

  // Tasks sorted operationally
  const sortedTasks = useMemo(() => {
    return sortOperationalTasks(filteredTasks);
  }, [filteredTasks]);

  // Today & Critical focus tasks
  const focusTasks = useMemo(() => {
    return sortedTasks.filter(t => {
      const status = getTaskTemporalStatus(t, todayStr);
      // Focus includes overdue, today, or urgent priority that is not completed
      const isUrgent = (t.priority === 'urgente' || t.priority === 'alta') && !isTaskCompleted(t);
      return status === 'overdue' || status === 'today' || isUrgent;
    });
  }, [sortedTasks, todayStr]);

  // Grouped tasks by client
  const clientOperationalGroups = useMemo(() => {
    const map = new Map<string, { client?: Client; tasks: Task[]; overdue: number; today: number; completed: number }>();
    
    // Initialize with all clients that have tasks
    tasks.forEach(task => {
      const cId = task.clientId || 'unassigned';
      if (!map.has(cId)) {
        map.set(cId, {
          client: task.clientId ? clientMap.get(task.clientId) : undefined,
          tasks: [],
          overdue: 0,
          today: 0,
          completed: 0
        });
      }
      const entry = map.get(cId)!;
      entry.tasks.push(task);

      if (isTaskCompleted(task)) {
        entry.completed++;
      } else {
        const temp = getTaskTemporalStatus(task, todayStr);
        if (temp === 'overdue') entry.overdue++;
        if (temp === 'today') entry.today++;
      }
    });

    return Array.from(map.entries()).sort((a, b) => {
      // Prioritize clients with overdue tasks
      if (a[1].overdue !== b[1].overdue) {
        return b[1].overdue - a[1].overdue;
      }
      // Then clients with tasks today
      if (a[1].today !== b[1].today) {
        return b[1].today - a[1].today;
      }
      // Then total open tasks
      return (b[1].tasks.length - b[1].completed) - (a[1].tasks.length - a[1].completed);
    });
  }, [tasks, clientMap, todayStr]);

  // Grouped tasks by service
  const serviceOperationalGroups = useMemo(() => {
    const map = new Map<string, { serviceName: string; serviceId?: string; tasks: Task[]; openCount: number; overdueCount: number }>();
    
    tasks.forEach(task => {
      const sName = task.serviceName || 'Geral / Sem Serviço';
      const key = task.serviceId || sName;

      if (!map.has(key)) {
        map.set(key, {
          serviceName: sName,
          serviceId: task.serviceId,
          tasks: [],
          openCount: 0,
          overdueCount: 0
        });
      }
      const entry = map.get(key)!;
      entry.tasks.push(task);

      if (!isTaskCompleted(task)) {
        entry.openCount++;
        if (getTaskTemporalStatus(task, todayStr) === 'overdue') {
          entry.overdueCount++;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.openCount - a.openCount);
  }, [tasks, todayStr]);

  // Grouped tasks by role / responsible
  const roleOperationalGroups = useMemo(() => {
    const map = new Map<string, { name: string; tasks: Task[]; openCount: number; overdueCount: number; completedCount: number }>();

    tasks.forEach(task => {
      const roleName = task.responsibleRole || task.responsible || 'Sem Responsável';
      if (!map.has(roleName)) {
        map.set(roleName, {
          name: roleName,
          tasks: [],
          openCount: 0,
          overdueCount: 0,
          completedCount: 0
        });
      }
      const entry = map.get(roleName)!;
      entry.tasks.push(task);

      if (isTaskCompleted(task)) {
        entry.completedCount++;
      } else {
        entry.openCount++;
        if (getTaskTemporalStatus(task, todayStr) === 'overdue') {
          entry.overdueCount++;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.overdueCount !== a.overdueCount ? b.overdueCount - a.overdueCount : b.openCount - a.openCount);
  }, [tasks, todayStr]);

  // Grouped tasks by Team Member (assigneeId)
  const teamMemberOperationalGroups = useMemo(() => {
    return teamMembers.map(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.id);
      let openCount = 0;
      let overdueCount = 0;
      let todayCount = 0;
      let completedCount = 0;

      memberTasks.forEach(t => {
        if (isTaskCompleted(t)) {
          completedCount++;
        } else {
          openCount++;
          const temp = getTaskTemporalStatus(t, todayStr);
          if (temp === 'overdue') overdueCount++;
          if (temp === 'today') todayCount++;
        }
      });

      return {
        member,
        tasks: memberTasks,
        openCount,
        overdueCount,
        todayCount,
        completedCount
      };
    }).sort((a, b) => {
      if (a.member.active !== b.member.active) return a.member.active ? -1 : 1;
      if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
      return b.openCount - a.openCount;
    });
  }, [teamMembers, tasks, todayStr]);

  // Handle fast status toggle
  const handleToggleTaskStatus = async (task: Task) => {
    const completed = isTaskCompleted(task);
    const newStatus = completed ? 'a fazer' : 'concluído';
    try {
      await updateTask(task.id, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Erro ao atualizar status da tarefa:', err);
    }
  };

  // Handle status select change
  const handleChangeStatus = async (task: Task, newStatus: string) => {
    try {
      await updateTask(task.id, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Erro ao mudar status:', err);
    }
  };

  // Open edit modal
  const handleOpenEditModal = (task: Task) => {
    setSelectedTask(task);
    const due = getTaskDueDate(task) || '';
    setFormData({
      title: task.title,
      description: task.description || '',
      responsible: task.responsible || '',
      responsibleRole: task.responsibleRole || '',
      assigneeId: task.assigneeId || '',
      priority: task.priority || 'média',
      status: task.status || 'a fazer',
      clientId: task.clientId || '',
      serviceId: task.serviceId || '',
      serviceName: task.serviceName || '',
      projectId: task.projectId || '',
      dueDate: due,
      deadline: task.deadline || due,
      companyId: task.companyId || selectedCompanyId || ''
    });
    setIsTaskModalOpen(true);
  };

  // Open create modal
  const handleOpenCreateModal = () => {
    setSelectedTask(null);
    setFormData({
      title: '',
      description: '',
      responsible: '',
      responsibleRole: '',
      assigneeId: '',
      priority: 'média',
      status: 'a fazer',
      clientId: clients[0]?.id || '',
      serviceId: services[0]?.id || '',
      serviceName: services[0]?.name || '',
      projectId: '',
      dueDate: getTodayISODate(),
      deadline: getTodayISODate(),
      companyId: selectedCompanyId || (companies[0] ? companies[0].id : '')
    });
    setIsTaskModalOpen(true);
  };

  // Save task (preserves process metadata strictly)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    let companyId = selectedCompanyId || formData.companyId;
    if (!companyId && companies.length > 0) {
      companyId = companies[0].id;
    }
    if (!companyId) {
      alert('Selecione uma empresa no seletor superior.');
      return;
    }

    setLoading(true);
    try {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const selectedService = services.find(s => s.id === formData.serviceId);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        responsible: formData.responsible.trim() || formData.responsibleRole.trim() || 'Equipe',
        responsibleRole: formData.responsibleRole.trim(),
        assigneeId: formData.assigneeId || undefined,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || undefined,
        deadline: formData.deadline || formData.dueDate || undefined,
        clientId: formData.clientId || undefined,
        serviceId: formData.serviceId || undefined,
        serviceName: selectedService?.name || formData.serviceName || undefined,
        projectId: formData.projectId || undefined,
        updatedAt: new Date().toISOString()
      };

      if (selectedTask) {
        // PRESERVE ALL ORIGINAL PROCESS METADATA
        await updateTask(selectedTask.id, {
          ...payload,
          ...(selectedTask.source && { source: selectedTask.source }),
          ...(selectedTask.processId && { processId: selectedTask.processId }),
          ...(selectedTask.processTitle && { processTitle: selectedTask.processTitle }),
          ...(selectedTask.processStepId && { processStepId: selectedTask.processStepId }),
          ...(selectedTask.processStepOrder && { processStepOrder: selectedTask.processStepOrder }),
          ...(selectedTask.processStepTitle && { processStepTitle: selectedTask.processStepTitle })
        });
      } else {
        await addTask({
          ...payload,
          source: 'manual',
          createdAt: new Date().toISOString()
        }, companyId);
      }

      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (err) {
      console.error('Erro ao salvar tarefa:', err);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delete
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setLoading(true);
    try {
      await deleteTask(taskToDelete);
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      console.error('Erro ao deletar tarefa:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open generator modal
  const handleOpenGeneratorModal = () => {
    setGenResult(null);
    if (clients.length > 0 && !genClientId) {
      setGenClientId(clients[0].id);
    }
    const activeProcesses = processes.filter(p => (p.active ?? true));
    if (activeProcesses.length > 0 && !genProcessId) {
      setGenProcessId(activeProcesses[0].id);
    }
    setIsGenerateModalOpen(true);
  };

  // Execute generation
  const handleExecuteGeneration = async () => {
    if (!genClientId) {
      alert('Selecione um cliente.');
      return;
    }
    if (!genProcessId) {
      alert('Selecione um processo/SOP.');
      return;
    }

    const companyId = selectedCompanyId || (companies[0] ? companies[0].id : '');
    if (!companyId) {
      alert('Empresa não selecionada.');
      return;
    }

    const proc = processes.find(p => p.id === genProcessId);
    const srv = services.find(s => s.id === genServiceId || s.id === proc?.serviceId);

    setGenLoading(true);
    setGenResult(null);
    try {
      const result = await generateTasksFromProcess({
        clientId: genClientId,
        companyId,
        processId: genProcessId,
        serviceId: genServiceId || proc?.serviceId || '',
        serviceName: srv?.name || proc?.serviceName || ''
      });
      setGenResult(result);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao gerar tarefas do processo.');
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-violet-900/10 via-slate-900/5 to-transparent dark:from-violet-950/40 dark:via-slate-900/20 p-5 rounded-2xl border border-violet-100 dark:border-violet-900/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-600 text-white rounded-lg shadow-md shadow-violet-600/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Central de Operações
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  ApexFlow OS
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Veja tudo que precisa acontecer na operação da ApexFlow.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenGeneratorModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-xl transition-all border border-violet-300 dark:border-violet-800 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Gerar de SOPs</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-violet-600 dark:hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-violet-900/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* KPI CABEÇALHO CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {/* TAREFAS HOJE */}
        <div 
          onClick={() => { setActiveTab('focus'); setQuickFilter('today'); }}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
            quickFilter === 'today' && activeTab === 'focus'
              ? "bg-violet-50/80 border-violet-300 dark:bg-violet-950/40 dark:border-violet-700 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hoje</span>
            <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.todayCount}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Vencem nesta data</p>
        </div>

        {/* ATRASADAS */}
        <div 
          onClick={() => { setActiveTab('all'); setQuickFilter('overdue'); }}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
            metrics.overdueCount > 0 ? "border-rose-200 dark:border-rose-900/50" : "",
            quickFilter === 'overdue'
              ? "bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-700 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Atrasadas</span>
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-2xl font-black tracking-tight", metrics.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")}>
            {metrics.overdueCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            {metrics.overdueCount > 0 ? 'Atenção imediata' : 'Nenhuma atrasada'}
          </p>
        </div>

        {/* EM ANDAMENTO */}
        <div 
          onClick={() => { setActiveTab('all'); setQuickFilter('in-progress'); }}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
            quickFilter === 'in-progress'
              ? "bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Andamento</span>
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.inProgressCount}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Em execução ativa</p>
        </div>

        {/* PRÓXIMOS 7 DIAS */}
        <div 
          onClick={() => { setActiveTab('all'); setQuickFilter('upcoming'); }}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
            quickFilter === 'upcoming'
              ? "bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">7 Dias</span>
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.upcoming7DaysCount}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Vencimento próximo</p>
        </div>

        {/* SEM PRAZO */}
        <div 
          onClick={() => { setActiveTab('all'); setQuickFilter('no_due_date'); }}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
            quickFilter === 'no_due_date'
              ? "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sem Prazo</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
              <CalendarX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{metrics.noDueDateCount}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Requer agendamento</p>
        </div>

        {/* CONCLUÍDAS */}
        <div 
          onClick={() => { setActiveTab('all'); setQuickFilter('completed'); }}
          className={cn(
            "p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
            quickFilter === 'completed'
              ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Entregas</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{metrics.completedCount}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            {metrics.totalCount > 0 ? `${Math.round((metrics.completedCount / metrics.totalCount) * 100)}% de conclusão` : '0%'}
          </p>
        </div>
      </div>

      {/* OPERATIONAL NAVIGATION TABS & FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
        {/* VIEW TABS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setActiveTab('focus')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'focus'
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Hoje & Críticas</span>
              {focusTasks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-violet-800 text-white">
                  {focusTasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'all'
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span>Minha Operação</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {filteredTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('kanban')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'kanban'
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban Operacional</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'clients'
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Por Cliente</span>
              {clientOperationalGroups.some(g => g[1].overdue > 0) && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'services'
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Por Serviço & SOP</span>
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === 'roles'
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Por Papel & Equipe</span>
            </button>
          </div>

          {/* Quick status filter badges */}
          <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-0.5">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'today', label: 'Hoje' },
              { id: 'overdue', label: 'Atrasadas' },
              { id: 'upcoming', label: '7 Dias' },
              { id: 'in-progress', label: 'Em Andamento' },
              { id: 'no_due_date', label: 'Sem Prazo' },
              { id: 'completed', label: 'Concluídas' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setQuickFilter(f.id as TemporalQuickFilter)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap",
                  quickFilter === f.id
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH & DETAILED FILTERS ROW */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tarefa, cliente, responsável, processo ou serviço..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Client selector */}
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="all">Todos os Clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company || c.name}</option>
              ))}
            </select>

            {/* Service selector */}
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="all">Todos os Serviços</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Role / Responsible selector */}
            {availableRoles.length > 0 && (
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="all">Todos os Papéis</option>
                {availableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            )}

            {/* Team Member selector */}
            {teamMembers.length > 0 && (
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="all">Equipe: Todos</option>
                <option value="unassigned">Sem membro atribuído</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role}) {!m.active ? '• Inativo' : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Source selector */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="all">Origem: Todas</option>
              <option value="process">SOPs / Processos</option>
              <option value="project">Projetos</option>
              <option value="manual">Manuais</option>
            </select>

            {/* Priority selector */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="all">Prioridade: Todas</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="média">Média</option>
              <option value="baixa">Baixa</option>
            </select>

            {/* Clear filters button */}
            {(quickFilter !== 'all' || filterClient !== 'all' || filterService !== 'all' || filterRole !== 'all' || filterMember !== 'all' || filterSource !== 'all' || filterPriority !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setQuickFilter('all');
                  setFilterClient('all');
                  setFilterService('all');
                  setFilterProcess('all');
                  setFilterRole('all');
                  setFilterMember('all');
                  setFilterSource('all');
                  setFilterPriority('all');
                  setSearchQuery('');
                }}
                className="text-xs text-rose-600 dark:text-rose-400 font-bold px-2 py-1 hover:underline"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA ACCORDING TO ACTIVE VIEW */}
      {activeTab === 'focus' && (
        <div className="space-y-6">
          {/* FOCUS SECTION HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>O que precisa acontecer hoje</span>
                <span className="text-xs font-normal text-slate-500">
                  (Atrasadas priorizadas, vencimento em {new Date().toLocaleDateString('pt-BR')})
                </span>
              </h3>
            </div>
            <div className="text-xs text-slate-500">
              Total crítico: <span className="font-bold text-slate-900 dark:text-white">{focusTasks.length}</span>
            </div>
          </div>

          {focusTasks.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Operação em dia!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Nenhuma tarefa atrasada ou vencendo hoje. Todas as pendências imediatas foram concluídas com sucesso.
              </p>
              <button
                onClick={() => setActiveTab('all')}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <List className="w-4 h-4" />
                <span>Ver todas as tarefas</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {focusTasks.map(task => (
                <OperationalTaskCard
                  key={task.id}
                  task={task}
                  clientMap={clientMap}
                  teamMemberMap={teamMemberMap}
                  onToggleStatus={() => handleToggleTaskStatus(task)}
                  onChangeStatus={(s) => handleChangeStatus(task, s)}
                  onEdit={() => handleOpenEditModal(task)}
                  onDelete={() => {
                    setTaskToDelete(task.id);
                    setIsDeleteModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Mostrando <strong className="text-slate-900 dark:text-white">{sortedTasks.length}</strong> tarefas operacionais</span>
            <span>Ordenação inteligente por prazo e prioridade</span>
          </div>

          {sortedTasks.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Filter className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Nenhuma tarefa encontrada</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nenhuma tarefa corresponde aos filtros selecionados. Tente ajustar os filtros ou a busca.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedTasks.map(task => (
                <OperationalTaskCard
                  key={task.id}
                  task={task}
                  clientMap={clientMap}
                  teamMemberMap={teamMemberMap}
                  onToggleStatus={() => handleToggleTaskStatus(task)}
                  onChangeStatus={(s) => handleChangeStatus(task, s)}
                  onEdit={() => handleOpenEditModal(task)}
                  onDelete={() => {
                    setTaskToDelete(task.id);
                    setIsDeleteModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'kanban' && (
        <OperationalKanbanBoard
          tasks={filteredTasks}
          clientMap={clientMap}
          teamMemberMap={teamMemberMap}
          onToggleStatus={handleToggleTaskStatus}
          onChangeStatus={handleChangeStatus}
          onEdit={handleOpenEditModal}
          onDelete={(id) => {
            setTaskToDelete(id);
            setIsDeleteModalOpen(true);
          }}
          onQuickAdd={(status) => {
            handleOpenCreateModal();
            setFormData(prev => ({ ...prev, status }));
          }}
        />
      )}

      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Visão operacional consolidada por cliente</span>
            <span>Clientes com pendências em destaque</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {clientOperationalGroups.map(([clientId, group]) => {
              const clientName = group.client?.company || group.client?.name || 'Cliente Não Vinculado';
              const isExpanded = expandedClients[clientId] ?? (group.overdue > 0 || group.today > 0);
              const openCount = group.tasks.length - group.completed;

              return (
                <div 
                  key={clientId}
                  className={cn(
                    "bg-white dark:bg-slate-900 rounded-xl border transition-all overflow-hidden",
                    group.overdue > 0 
                      ? "border-rose-300 dark:border-rose-900/50 shadow-sm" 
                      : "border-slate-200 dark:border-slate-800"
                  )}
                >
                  <div 
                    onClick={() => setExpandedClients(prev => ({ ...prev, [clientId]: !isExpanded }))}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                        group.overdue > 0 
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                          : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                      )}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {clientName}
                          {group.overdue > 0 && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              {group.overdue} Atrasada(s)
                            </span>
                          )}
                          {group.today > 0 && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                              {group.today} Hoje
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {group.tasks.length} tarefas no total • {openCount} abertas • {group.completed} concluídas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="text-slate-400">Progresso:</span>
                        <span className="text-slate-900 dark:text-white">
                          {group.tasks.length > 0 ? `${Math.round((group.completed / group.tasks.length) * 100)}%` : '0%'}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setGenClientId(clientId);
                          setIsGenerateModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-100 transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar SOP</span>
                      </button>

                      <div className="p-1 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
                      {group.tasks.map(task => (
                        <OperationalTaskCard
                          key={task.id}
                          task={task}
                          clientMap={clientMap}
                          onToggleStatus={() => handleToggleTaskStatus(task)}
                          onChangeStatus={(s) => handleChangeStatus(task, s)}
                          onEdit={() => handleOpenEditModal(task)}
                          onDelete={() => {
                            setTaskToDelete(task.id);
                            setIsDeleteModalOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Visão operacional consolidada por serviço & processos ativos</span>
            <span>Identifique gargalos e concentração de demandas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceOperationalGroups.map((group, idx) => {
              const isExpanded = expandedServices[group.serviceName] ?? true;
              return (
                <div 
                  key={idx}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{group.serviceName}</h4>
                        <p className="text-xs text-slate-500">
                          {group.openCount} pendentes • {group.tasks.length} total
                        </p>
                      </div>
                    </div>

                    {group.overdueCount > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                        {group.overdueCount} atrasada(s)
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {group.tasks.slice(0, 6).map(task => (
                      <div 
                        key={task.id}
                        className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className="shrink-0 text-slate-400 hover:text-emerald-500"
                          >
                            {isTaskCompleted(task) ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                          </button>
                          <span className={cn(
                            "text-xs truncate font-medium",
                            isTaskCompleted(task) ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"
                          )}>
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                          {task.responsibleRole && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {task.responsibleRole}
                            </span>
                          )}
                          <span className={cn(
                            "font-bold",
                            getTaskTemporalStatus(task, todayStr) === 'overdue' ? "text-rose-600 dark:text-rose-400" : "text-slate-500"
                          )}>
                            {formatTaskDueDisplay(task).label}
                          </span>
                        </div>
                      </div>
                    ))}
                    {group.tasks.length > 6 && (
                      <p className="text-[11px] text-center text-slate-400 pt-1">
                        + {group.tasks.length - 6} outras tarefas deste serviço
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* SECTION 1: MEMBROS DA EQUIPE (PESSOAS REAIS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-600" />
                  <span>Membros da Equipe (Pessoas Designadas)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Carga de trabalho individual e pendências distribuídas na ApexFlow.
                </p>
              </div>
              <span className="text-xs text-slate-400">
                {teamMembers.length} membro(s) cadastrado(s)
              </span>
            </div>

            {teamMembers.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Nenhum membro da equipe cadastrado ainda. Use a aba <strong>Equipe</strong> para cadastrar membros operacionais.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMemberOperationalGroups.map((g) => (
                  <div
                    key={g.member.id}
                    className={cn(
                      "bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3 shadow-sm transition-all hover:border-violet-300 dark:hover:border-violet-700",
                      g.overdueCount > 0 ? "border-rose-300 dark:border-rose-900/50" : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {g.member.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{g.member.name}</h4>
                          <p className="text-[10px] text-slate-400 truncate">{g.member.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {g.overdueCount > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 animate-pulse">
                            {g.overdueCount} atrasada(s)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Em dia
                          </span>
                        )}
                        {!g.member.active && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Inativo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[10px] text-slate-400 block font-medium">Abertas</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{g.openCount}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[10px] text-violet-500 block font-medium">Hoje</span>
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{g.todayCount}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-[10px] text-emerald-500 block font-medium">Feitas</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{g.completedCount}</span>
                      </div>
                    </div>

                    {/* Tasks list */}
                    <div className="space-y-1.5 pt-1">
                      {g.tasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className="text-xs flex items-center justify-between p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <span className={cn(
                            "truncate max-w-[170px]",
                            isTaskCompleted(task) ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"
                          )}>
                            {task.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatTaskDueDisplay(task).label}
                          </span>
                        </div>
                      ))}
                      {g.tasks.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic text-center py-1">Nenhuma tarefa atribuída</p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setFilterMember(g.member.id);
                        setActiveTab('all');
                      }}
                      className="w-full py-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors text-center"
                    >
                      Ver tarefas deste membro →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: PAPÉIS OPERACIONAIS DOS SOPS */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Papéis Operacionais Definidos nos Processos / SOPs</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Funções necessárias para execução (ex: Gestor de Tráfego, Designer, Desenvolvedor).
                </p>
              </div>
              <span className="text-xs text-slate-400">
                {roleOperationalGroups.length} papel(éis)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roleOperationalGroups.map((group, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3 shadow-sm",
                    group.overdueCount > 0 ? "border-rose-300 dark:border-rose-900/50" : "border-slate-200 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{group.name}</h4>
                        <p className="text-[10px] text-slate-400">{group.openCount} pendências</p>
                      </div>
                    </div>

                    {group.overdueCount > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                        {group.overdueCount} atrasada(s)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Em dia
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {group.tasks.slice(0, 4).map(task => (
                      <div 
                        key={task.id}
                        className="text-xs flex items-center justify-between p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <span className={cn(
                          "truncate max-w-[170px]",
                          isTaskCompleted(task) ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"
                        )}>
                          {task.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTaskDueDisplay(task).label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA TAREFA OPERACIONAL / EDITAR TAREFA */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        title={selectedTask ? "Editar Tarefa Operacional" : "Nova Tarefa Operacional"}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Título da Tarefa *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Subir campanha de Remarketing Google Ads"
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descrição / Checklist
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva detalhes, etapas, links ou checklist..."
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cliente
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Nenhum (Geral)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company || c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Serviço
              </label>
              <select
                value={formData.serviceId}
                onChange={(e) => {
                  const s = services.find(srv => srv.id === e.target.value);
                  setFormData({ ...formData, serviceId: e.target.value, serviceName: s?.name || '' });
                }}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Nenhum</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {teamMembers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Membro da Equipe Designado (Assignee)
              </label>
              <select
                value={formData.assigneeId}
                onChange={(e) => {
                  const mId = e.target.value;
                  const member = teamMembers.find(m => m.id === mId);
                  setFormData(prev => ({
                    ...prev,
                    assigneeId: mId,
                    responsible: member ? member.name : prev.responsible,
                    responsibleRole: (member && !prev.responsibleRole) ? member.role : prev.responsibleRole
                  }));
                }}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Nenhum membro atribuído</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.role} {!m.active ? '(Inativo)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Papel Operacional
              </label>
              <input
                type="text"
                value={formData.responsibleRole}
                onChange={(e) => setFormData({ ...formData, responsibleRole: e.target.value })}
                placeholder="Ex: Gestor de Tráfego, Designer, Copywriter"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Responsável Nominal
              </label>
              <input
                type="text"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                placeholder="Ex: Carlos Silva, Equipe"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prazo Operacional (dueDate) *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value, deadline: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prioridade
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="a fazer">A Fazer</option>
                <option value="em andamento">Em Andamento</option>
                <option value="concluído">Concluído</option>
              </select>
            </div>
          </div>

          {selectedTask?.processTitle && (
            <div className="p-3 bg-violet-50 dark:bg-violet-950/40 rounded-lg border border-violet-200 dark:border-violet-800 text-xs text-violet-700 dark:text-violet-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Vinculado ao Processo/SOP: {selectedTask.processTitle}</span>
              </div>
              {selectedTask.processStepTitle && (
                <p className="text-[11px] text-violet-600 dark:text-violet-400">
                  Etapa #{selectedTask.processStepOrder || 1}: {selectedTask.processStepTitle}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsTaskModalOpen(false);
                setSelectedTask(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-md shadow-violet-900/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : selectedTask ? 'Atualizar Tarefa' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: GERADOR DE TAREFAS DE PROCESSOS / SOPS */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
          setGenResult(null);
        }}
        title="Gerar Tarefas Operacionais a partir de SOPs"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selecione o cliente e o processo/SOP da biblioteca operacional. As etapas ativas serão transformadas em tarefas idempotentes na Central de Operações.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cliente *
              </label>
              <select
                value={genClientId}
                onChange={(e) => setGenClientId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company || c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Processo / SOP *
              </label>
              <select
                value={genProcessId}
                onChange={(e) => {
                  setGenProcessId(e.target.value);
                  const p = processes.find(proc => proc.id === e.target.value);
                  if (p?.serviceId) setGenServiceId(p.serviceId);
                }}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Selecione um processo...</option>
                {processes.filter(p => (p.active ?? true)).map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.steps?.length || 0} etapas)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback banner */}
          {genResult && (
            <div className={cn(
              "p-3 rounded-lg text-xs border font-medium",
              genResult.created > 0 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            )}>
              <p className="font-bold">{genResult.message}</p>
              <p className="text-[11px] mt-0.5 opacity-90">
                Criadas: <strong>{genResult.created}</strong> | Já existentes (ignoradas): <strong>{genResult.skipped}</strong>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsGenerateModalOpen(false);
                setGenResult(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={genLoading || !genClientId || !genProcessId}
              onClick={handleExecuteGeneration}
              className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-md shadow-violet-900/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {genLoading ? (
                <span>Gerando tarefas...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Tarefas Agora</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Tem certeza que deseja excluir esta tarefa operacional? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteTask}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
            >
              {loading ? 'Excluindo...' : 'Excluir Tarefa'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface OperationalTaskCardProps {
  key?: React.Key;
  task: Task;
  clientMap: Map<string, Client>;
  teamMemberMap?: Map<string, TeamMember>;
  onToggleStatus: () => void | Promise<void>;
  onChangeStatus: (s: string) => void | Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Single Operational Task Row / Card Component
 */
function OperationalTaskCard({
  task,
  clientMap,
  teamMemberMap,
  onToggleStatus,
  onChangeStatus,
  onEdit,
  onDelete
}: OperationalTaskCardProps) {
  const completed = isTaskCompleted(task);
  const inProgress = isTaskInProgress(task);
  const dueInfo = formatTaskDueDisplay(task);
  const temporal = getTaskTemporalStatus(task);
  const clientObj = task.clientId ? clientMap.get(task.clientId) : undefined;
  const clientName = clientObj?.company || clientObj?.name;
  const assignedMember = task.assigneeId && teamMemberMap ? teamMemberMap.get(task.assigneeId) : undefined;

  return (
    <div className={cn(
      "p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group",
      completed
        ? "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75"
        : temporal === 'overdue'
          ? "bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-900/60 shadow-sm shadow-rose-900/5 hover:border-rose-400"
          : temporal === 'today'
            ? "bg-white dark:bg-slate-900 border-violet-300 dark:border-violet-900/60 shadow-sm shadow-violet-900/5 hover:border-violet-400"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
    )}>
      {/* LEFT: Checkbox + Title + Description + Metadata */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Quick status toggle button */}
        <button
          onClick={onToggleStatus}
          className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
          title={completed ? "Marcar como pendente" : "Marcar como concluída"}
        >
          {completed ? (
            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>

        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className={cn(
              "text-xs font-bold tracking-tight text-slate-900 dark:text-white cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors",
              completed && "line-through text-slate-400 dark:text-slate-500 font-normal"
            )}
            onClick={onEdit}
            >
              {task.title}
            </h4>

            {/* Origin Badge */}
            {task.source === 'process' || task.processId ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                <Sparkles className="w-2.5 h-2.5" />
                <span>SOP</span>
              </span>
            ) : task.source === 'project' || task.projectId ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <Briefcase className="w-2.5 h-2.5" />
                <span>Projeto</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Manual
              </span>
            )}

            {/* Priority Badge */}
            {task.priority && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase",
                task.priority === 'urgente' ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" :
                task.priority === 'alta' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                task.priority === 'média' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              )}>
                {task.priority}
              </span>
            )}
          </div>

          {/* Operational Context Sub-row: Client, Service, Process, Step, Role */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            {clientName && (
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>{clientName}</span>
              </span>
            )}

            {task.serviceName && (
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>{task.serviceName}</span>
              </span>
            )}

            {task.processTitle && (
              <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
                <FileSpreadsheet className="w-3 h-3" />
                <span>{task.processTitle}</span>
                {task.processStepOrder && (
                  <span className="opacity-75">#{task.processStepOrder}</span>
                )}
              </span>
            )}

            {(task.responsibleRole || task.responsible) && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                <span>{task.responsibleRole || task.responsible}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Status Selector + Due Date Badge + Action Buttons */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
        {/* Due Date Indicator */}
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
            completed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
            dueInfo.isOverdue ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 animate-pulse" :
            dueInfo.isToday ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" :
            dueInfo.hasDate ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" :
            "bg-slate-50 text-slate-400 dark:bg-slate-900/50"
          )}>
            <Clock className="w-3 h-3" />
            <span>{dueInfo.label}</span>
          </span>
        </div>

        {/* Inline Status Dropdown */}
        <select
          value={completed ? 'concluído' : inProgress ? 'em andamento' : 'a fazer'}
          onChange={(e) => onChangeStatus(e.target.value)}
          className={cn(
            "text-[10px] font-bold rounded-lg px-2 py-1 border transition-colors outline-none cursor-pointer",
            completed
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : inProgress
                ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
          )}
        >
          <option value="a fazer">A Fazer</option>
          <option value="em andamento">Em Andamento</option>
          <option value="concluído">Concluído</option>
        </select>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Editar tarefa"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Excluir tarefa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Kanban Board grouped by Operational Status: A Fazer, Em Andamento, Concluído
 */
function OperationalKanbanBoard({
  tasks,
  clientMap,
  onToggleStatus,
  onChangeStatus,
  onEdit,
  onDelete,
  onQuickAdd
}: {
  tasks: Task[];
  clientMap: Map<string, Client>;
  onToggleStatus: (t: Task) => void;
  onChangeStatus: (t: Task, s: string) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onQuickAdd: (status: string) => void;
}) {
  const columns = [
    { id: 'a fazer', title: 'A Fazer', badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
    { id: 'em andamento', title: 'Em Andamento', badgeColor: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
    { id: 'concluído', title: 'Concluído', badgeColor: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(col => {
        const colTasks = tasks.filter(t => {
          if (col.id === 'concluído') return isTaskCompleted(t);
          if (col.id === 'em andamento') return isTaskInProgress(t);
          return !isTaskCompleted(t) && !isTaskInProgress(t);
        });

        return (
          <div 
            key={col.id} 
            className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{col.title}</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", col.badgeColor)}>
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => onQuickAdd(col.id)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title={`Adicionar tarefa em ${col.title}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Column Task Cards */}
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {colTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Nenhuma tarefa nesta etapa
                </div>
              ) : (
                colTasks.map(task => {
                  const clientObj = task.clientId ? clientMap.get(task.clientId) : undefined;
                  const dueInfo = formatTaskDueDisplay(task);

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "p-3 rounded-xl border bg-white dark:bg-slate-900 space-y-2 shadow-sm transition-all hover:shadow hover:border-violet-300 dark:hover:border-violet-700",
                        dueInfo.isOverdue && col.id !== 'concluído' ? "border-rose-300 dark:border-rose-900" : "border-slate-200 dark:border-slate-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 
                          onClick={() => onEdit(task)}
                          className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer hover:text-violet-600 line-clamp-2"
                        >
                          {task.title}
                        </h5>
                        <button
                          onClick={() => onToggleStatus(task)}
                          className="text-slate-400 hover:text-emerald-500 shrink-0 mt-0.5"
                        >
                          {isTaskCompleted(task) ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Client / Service badges */}
                      <div className="flex flex-wrap items-center gap-1 text-[10px]">
                        {clientObj && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]">
                            {clientObj.company || clientObj.name}
                          </span>
                        )}
                        {task.serviceName && (
                          <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 font-medium truncate max-w-[110px]">
                            {task.serviceName}
                          </span>
                        )}
                      </div>

                      {/* Footer: Due date + Role + Move button */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                        <span className={cn(
                          "font-bold",
                          dueInfo.isOverdue && col.id !== 'concluído' ? "text-rose-600 dark:text-rose-400" : "text-slate-500"
                        )}>
                          {dueInfo.label}
                        </span>

                        <div className="flex items-center gap-1">
                          {col.id === 'a fazer' && (
                            <button
                              onClick={() => onChangeStatus(task, 'em andamento')}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                            >
                              Iniciar →
                            </button>
                          )}
                          {col.id === 'em andamento' && (
                            <button
                              onClick={() => onChangeStatus(task, 'concluído')}
                              className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold"
                            >
                              Concluir ✓
                            </button>
                          )}
                          {col.id === 'concluído' && (
                            <button
                              onClick={() => onChangeStatus(task, 'a fazer')}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 font-medium"
                            >
                              Reabrir
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
