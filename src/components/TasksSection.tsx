import React, { useState, useMemo } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { StatCard } from './ui/StatCard';
import { useCompany } from '../contexts/CompanyContext';
import { addTask, updateTask, deleteTask, generateTasksFromProcess } from '../services/db';
import { Process, Service, ClientService, TaskGenerationResult } from '../types';
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Edit2,
  Copy,
  Building2,
  Briefcase,
  Target,
  ChevronRight,
  ChevronLeft,
  Layers,
  Sparkles,
  Filter,
  Search,
  CheckSquare,
  Square,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

const DAYS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

interface TasksSectionProps {
  tasks: any[];
  clients: any[];
  projects: any[];
  leads: any[];
  processes?: Process[];
  services?: Service[];
  clientServices?: ClientService[];
}

export function TasksSection({ 
  tasks, 
  clients, 
  projects, 
  leads,
  processes = [],
  services = [],
  clientServices = []
}: TasksSectionProps) {
  const { selectedCompanyId, companies } = useCompany();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'process' | 'manual' | 'project'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Generator Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genClientId, setGenClientId] = useState('');
  const [genProcessId, setGenProcessId] = useState('');
  const [genServiceId, setGenServiceId] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<TaskGenerationResult | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    responsible: '',
    priority: 'média',
    status: 'a fazer',
    date: DAYS[0],
    clientId: '',
    projectId: '',
    leadId: '',
    deadline: '',
    companyId: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter tasks based on search & filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Source filter
      if (sourceFilter === 'process') {
        if (task.source !== 'process' && !task.processId) return false;
      } else if (sourceFilter === 'manual') {
        if (task.source === 'process' || task.processId || task.source === 'project' || task.projectId) return false;
      } else if (sourceFilter === 'project') {
        if (task.source !== 'project' && !task.projectId) return false;
      }

      // Client filter
      if (clientFilter !== 'all' && task.clientId !== clientFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && (task.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (task.title || '').toLowerCase().includes(query);
        const descMatch = (task.description || '').toLowerCase().includes(query);
        const respMatch = (task.responsible || '').toLowerCase().includes(query);
        const roleMatch = (task.responsibleRole || '').toLowerCase().includes(query);
        const procMatch = (task.processTitle || '').toLowerCase().includes(query);
        const clientObj = clients.find(c => c.id === task.clientId);
        const clientMatch = clientObj && (
          (clientObj.company || '').toLowerCase().includes(query) ||
          (clientObj.name || '').toLowerCase().includes(query)
        );

        if (!titleMatch && !descMatch && !respMatch && !roleMatch && !procMatch && !clientMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, sourceFilter, clientFilter, priorityFilter, searchQuery, clients]);

  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'concluído').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    const today = new Date().toISOString().split('T')[0];
    const delayed = tasks.filter(t => t.status !== 'concluído' && t.deadline && t.deadline < today).length;

    const fromProcesses = tasks.filter(t => t.source === 'process' || t.processId).length;

    const byResponsible = tasks.reduce((acc: any, curr) => {
      if (!curr.responsible) return acc;
      if (!acc[curr.responsible]) acc[curr.responsible] = { total: 0, completed: 0 };
      acc[curr.responsible].total++;
      if (curr.status === 'concluído') acc[curr.responsible].completed++;
      return acc;
    }, {});

    return { total, completed, completionRate, delayed, fromProcesses, byResponsible };
  }, [tasks]);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    let companyId = selectedCompanyId || formData.companyId;
    
    if (!companyId && companies.length > 0) {
      companyId = companies[0].id;
    }

    if (!companyId) {
      alert('Por favor, selecione uma empresa para vincular esta tarefa.');
      return;
    }

    setLoading(true);
    try {
      if (selectedTask) {
        // Preserve process metadata if present
        await updateTask(selectedTask.id, {
          ...formData,
          ...(selectedTask.source && { source: selectedTask.source }),
          ...(selectedTask.processId && { processId: selectedTask.processId }),
          ...(selectedTask.processTitle && { processTitle: selectedTask.processTitle }),
          ...(selectedTask.processStepId && { processStepId: selectedTask.processStepId }),
          ...(selectedTask.processStepOrder && { processStepOrder: selectedTask.processStepOrder }),
          ...(selectedTask.processStepTitle && { processStepTitle: selectedTask.processStepTitle }),
          ...(selectedTask.responsibleRole && { responsibleRole: selectedTask.responsibleRole }),
          ...(selectedTask.serviceId && { serviceId: selectedTask.serviceId }),
          ...(selectedTask.serviceName && { serviceName: selectedTask.serviceName }),
          updatedAt: new Date().toISOString()
        });
      } else {
        await addTask({
          ...formData,
          source: 'manual',
          createdAt: new Date().toISOString()
        }, companyId);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      responsible: '',
      priority: 'média',
      status: 'a fazer',
      date: DAYS[0],
      clientId: '',
      projectId: '',
      leadId: '',
      deadline: '',
      companyId: ''
    });
    setSelectedTask(null);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setLoading(true);
    try {
      await deleteTask(taskToDelete);
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateTask = async (task: any) => {
    setLoading(true);
    try {
      const { id, createdAt, ...taskData } = task;
      await addTask({
        ...taskData,
        title: `${task.title} (Cópia)`
      }, task.companyId || selectedCompanyId || (companies[0] ? companies[0].id : ''));
    } catch (error) {
      console.error('Error duplicating task:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open Task Generator Modal
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

  // Execute Task Generation from Process
  const handleExecuteGeneration = async () => {
    if (!genClientId) {
      alert('Selecione um cliente para gerar as tarefas.');
      return;
    }
    if (!genProcessId) {
      alert('Selecione um processo/SOP para gerar as tarefas.');
      return;
    }

    const companyId = selectedCompanyId || (companies[0] ? companies[0].id : '');
    if (!companyId) {
      alert('Empresa não selecionada.');
      return;
    }

    const chosenProcess = processes.find(p => p.id === genProcessId);
    const chosenService = services.find(s => s.id === genServiceId || s.id === chosenProcess?.serviceId);

    setGenLoading(true);
    setGenResult(null);
    try {
      const result = await generateTasksFromProcess({
        clientId: genClientId,
        companyId,
        processId: genProcessId,
        serviceId: genServiceId || chosenProcess?.serviceId || '',
        serviceName: chosenService?.name || chosenProcess?.serviceName || ''
      });
      setGenResult(result);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao gerar tarefas do processo.');
    } finally {
      setGenLoading(false);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    
    // If hovering over a day column
    if (DAYS.includes(overId)) {
      if (activeTask.date !== overId) {
        updateTask(activeTask.id, { date: overId });
      }
    } else {
      // If hovering over another task
      const overTask = tasks.find(t => t.id === overId);
      if (overTask && activeTask.date !== overTask.date) {
        updateTask(activeTask.id, { date: overTask.date });
      }
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
  };

  // Helper: client active services
  const selectedClientActiveServices = useMemo(() => {
    if (!genClientId) return [];
    const clientSrvs = clientServices.filter(cs => cs.clientId === genClientId && cs.status === 'active');
    return clientSrvs.map(cs => {
      const svc = services.find(s => s.id === cs.serviceId);
      return { clientService: cs, service: svc };
    });
  }, [genClientId, clientServices, services]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">Gestão de Tarefas</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">
            Planejamento semanal, esteira Kanban e tarefas geradas a partir de SOPs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleOpenGeneratorModal}
            className="flex items-center gap-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Gerar de Processo</span>
          </button>

          <button 
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-md shadow-violet-200 dark:shadow-none"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard title="Tarefas na Semana" value={metrics.total} icon={Calendar} />
        <StatCard title="Concluídas (%)" value={metrics.completionRate} icon={CheckCircle2} isPercent />
        <StatCard title="Atrasadas" value={metrics.delayed} icon={AlertCircle} className={metrics.delayed > 0 ? 'border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-900/30' : ''} />
        <StatCard title="De Processos (SOPs)" value={metrics.fromProcesses} icon={Layers} />
        <StatCard title="Responsáveis Ativos" value={Object.keys(metrics.byResponsible).length} icon={User} />
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, responsável, SOP ou cliente..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setSourceFilter('all')}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                sourceFilter === 'all' 
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setSourceFilter('process')}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1",
                sourceFilter === 'process' 
                  ? "bg-violet-600 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Layers className="w-3 h-3" />
              <span>SOPs</span>
            </button>
            <button
              onClick={() => setSourceFilter('manual')}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                sourceFilter === 'manual' 
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Manuais
            </button>
            <button
              onClick={() => setSourceFilter('project')}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                sourceFilter === 'project' 
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Projetos
            </button>
          </div>

          {/* Client Filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="all">Todos os Clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.company || c.name}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="all">Prioridade: Todas</option>
            <option value="alta">Alta</option>
            <option value="média">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          {(sourceFilter !== 'all' || clientFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSourceFilter('all');
                setClientFilter('all');
                setPriorityFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scrollbar-hide">
          {DAYS.map(day => (
            <TaskColumn 
              key={day} 
              id={day} 
              title={day} 
              tasks={filteredTasks.filter(t => t.date === day)}
              clients={clients}
              onQuickAdd={() => {
                setFormData({ ...formData, date: day });
                setIsModalOpen(true);
              }}
              onEdit={(task: any) => {
                setSelectedTask(task);
                setFormData({
                  title: task.title,
                  description: task.description || '',
                  responsible: task.responsible || '',
                  priority: task.priority || 'média',
                  status: task.status || 'a fazer',
                  date: task.date,
                  clientId: task.clientId || '',
                  projectId: task.projectId || '',
                  leadId: task.leadId || '',
                  deadline: task.deadline || task.dueDate || '',
                  companyId: task.companyId || ''
                });
                setIsModalOpen(true);
              }}
              onDelete={(id: string) => {
                setTaskToDelete(id);
                setIsDeleteModalOpen(true);
              }}
              onStatusToggle={async (task: any) => {
                const newStatus = task.status === 'concluído' ? 'a fazer' : 'concluído';
                await updateTask(task.id, { status: newStatus });
              }}
              onDuplicate={handleDuplicateTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <TaskCard 
              task={tasks.find(t => t.id === activeId)} 
              clients={clients}
              isOverlay 
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={selectedTask ? "Editar Tarefa" : "Nova Tarefa"}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          {selectedTask?.source === 'process' && (
            <div className="p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-violet-700 dark:text-violet-300">
                <Layers className="w-4 h-4" />
                <span>Tarefa originada de Processo / SOP</span>
              </div>
              <p className="text-violet-600 dark:text-violet-400">
                Processo: <strong>{selectedTask.processTitle}</strong> {selectedTask.processStepOrder ? `(Etapa ${selectedTask.processStepOrder})` : ''}
              </p>
              {selectedTask.responsibleRole && (
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Papel responsável sugerido: <strong>{selectedTask.responsibleRole}</strong>
                </p>
              )}
            </div>
          )}

          {!selectedCompanyId && !selectedTask && (
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Vincular à Empresa</label>
              <select 
                required
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="">Selecione uma empresa...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Título</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              placeholder="Ex: Criar campanha de tráfego no Google Ads"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Descrição</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors min-h-[100px]"
              placeholder="Detalhes da tarefa..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Responsável</label>
              <input
                type="text"
                value={formData.responsible}
                onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                placeholder="Ex: Gestor de Tráfego / Nome"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Prioridade</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dia da Semana</label>
              <select
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Prazo Final (Due Date)</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Cliente</label>
              <select
                value={formData.clientId}
                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="">Nenhum</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Projeto</label>
              <select
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="">Nenhum</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Lead</label>
              <select
                value={formData.leadId}
                onChange={e => setFormData({ ...formData, leadId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
              >
                <option value="">Nenhum</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company})</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Tarefa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Generator from Process Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
          setGenResult(null);
        }}
        title="Gerar Tarefas a partir de Processo (SOP)"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Conecte cliente, serviços e processos para transformar as etapas de um SOP em tarefas operacionais automaticamente.
          </p>

          {genResult && (
            <div className={cn(
              "p-4 rounded-xl border text-xs space-y-1.5",
              genResult.created > 0 
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
            )}>
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Resultado da Geração</span>
              </div>
              <p>{genResult.message}</p>
              <div className="flex gap-4 text-[11px] pt-1">
                <span>Criadas: <strong>{genResult.created}</strong></span>
                <span>Já existentes (ignoradas): <strong>{genResult.skipped}</strong></span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                1. Selecione o Cliente
              </label>
              <select
                value={genClientId}
                onChange={(e) => setGenClientId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company || c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedClientActiveServices.length > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                  Serviços Ativos do Cliente:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedClientActiveServices.map(({ clientService, service }) => (
                    <span 
                      key={clientService.id}
                      onClick={() => {
                        if (service?.id) {
                          setGenServiceId(service.id);
                          const matchingProc = processes.find(p => p.serviceId === service.id || p.serviceName?.toLowerCase() === service.name.toLowerCase());
                          if (matchingProc) setGenProcessId(matchingProc.id);
                        }
                      }}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-lg border cursor-pointer transition-colors flex items-center gap-1.5",
                        genServiceId === service?.id
                          ? "bg-violet-100 dark:bg-violet-950 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 font-bold"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400"
                      )}
                    >
                      <Briefcase className="w-3 h-3 text-violet-500" />
                      <span>{service?.name || 'Serviço'}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                2. Selecione o Processo / SOP
              </label>
              <select
                value={genProcessId}
                onChange={(e) => setGenProcessId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Selecione um processo...</option>
                {processes.filter(p => (p.active ?? true)).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} [{p.category || 'Geral'}] {p.serviceName ? `• ${p.serviceName}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Process preview */}
          {(() => {
            const proc = processes.find(p => p.id === genProcessId);
            if (!proc) return null;
            const activeSteps = (proc.steps || []).filter(s => (s.active ?? true));

            return (
              <div className="p-3.5 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h6 className="font-bold text-xs text-slate-900 dark:text-white">{proc.title}</h6>
                  <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 rounded">
                    {activeSteps.length} etapas
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                  {activeSteps.map((step, idx) => (
                    <div key={step.id || idx} className="flex items-center justify-between py-0.5 text-slate-600 dark:text-slate-400">
                      <span className="truncate">
                        {idx + 1}. {step.title}
                      </span>
                      {step.responsibleRole && (
                        <span className="text-[10px] text-violet-600 dark:text-violet-400 shrink-0 ml-2 font-medium">
                          {step.responsibleRole}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 pt-1 border-t border-violet-100 dark:border-violet-900/30">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>Idempotente: etapas já geradas anteriormente para este cliente serão ignoradas.</span>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsGenerateModalOpen(false);
                setGenResult(null);
              }}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={genLoading || !genClientId || !genProcessId}
              onClick={handleExecuteGeneration}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{genLoading ? 'Gerando...' : 'Confirmar e Gerar Tarefas'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Tarefa"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
            <p className="text-sm text-rose-800 dark:text-rose-400">
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteTask}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold text-sm hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 dark:shadow-none disabled:opacity-50"
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TaskColumn({ id, title, tasks, clients, onEdit, onDelete, onStatusToggle, onQuickAdd, onDuplicate }: any) {
  const { setNodeRef } = useSortable({ id });
  const dayAbbr = title.split('-')[0].substring(0, 3);

  return (
    <div className="flex-shrink-0 w-[280px] md:w-80 snap-center">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-900 dark:text-white hidden md:block">{title}</h4>
          <h4 className="font-bold text-slate-900 dark:text-white md:hidden">{dayAbbr}</h4>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button 
          onClick={onQuickAdd}
          className="p-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-all"
          title="Adicionar tarefa rápida"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div 
        ref={setNodeRef}
        className="bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl p-3 min-h-[500px] border border-dashed border-slate-200 dark:border-slate-800 space-y-3 transition-colors"
      >
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task: any) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              clients={clients}
              onEdit={onEdit} 
              onDelete={onDelete}
              onStatusToggle={onStatusToggle}
              onDuplicate={onDuplicate}
            />
          ))}
        </SortableContext>
        
        <button
          onClick={onQuickAdd}
          className="w-full py-3 flex items-center justify-center gap-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white dark:hover:bg-slate-900/50 rounded-xl border border-dashed border-transparent hover:border-violet-200 dark:hover:border-violet-900/30 transition-all text-xs font-medium group"
        >
          <Plus className="w-3 h-3 group-hover:scale-110 transition-transform" />
          Adicionar tarefa
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task, clients = [], onEdit, onDelete, onStatusToggle, onDuplicate, isOverlay }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task?.id || 'temp' });

  if (!task) return null;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priorityColors: Record<string, string> = {
    alta: 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30',
    urgente: 'bg-rose-600 text-white border-rose-700',
    média: 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30',
    medium: 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30',
    baixa: 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30',
    low: 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
  };

  const today = new Date().toISOString().split('T')[0];
  const isDelayed = task.status !== 'concluído' && (task.deadline || task.dueDate) && (task.deadline || task.dueDate) < today;

  const clientObj = clients.find((c: any) => c.id === task.clientId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative",
        isOverlay && "shadow-xl border-violet-200 dark:border-violet-800 ring-2 ring-violet-500/20",
        isDelayed && "border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-900/5"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge 
            variant="default" 
            className={cn("text-[9px] uppercase tracking-wider font-bold", priorityColors[task.priority] || priorityColors['média'])}
          >
            {task.priority || 'Média'}
          </Badge>

          {task.status === 'concluído' && (
            <Badge variant="success" className="text-[9px] uppercase tracking-wider font-bold">
              Concluído
            </Badge>
          )}

          {isDelayed && (
            <Badge variant="danger" className="text-[9px] uppercase tracking-wider font-bold animate-pulse">
              Atrasado
            </Badge>
          )}
        </div>

        {!isOverlay && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onDuplicate(task)}
              className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 rounded-md transition-colors"
              title="Duplicar"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onEdit(task)}
              className="p-1 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/50 rounded-md transition-colors"
              title="Editar"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/50 rounded-md transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* SOP / Process Badge */}
      {(task.source === 'process' || task.processTitle) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" />
            <span className="truncate max-w-[150px]" title={task.processTitle}>SOP: {task.processTitle || 'Processo'}</span>
          </span>
          {task.processStepOrder && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Etapa {task.processStepOrder}
            </span>
          )}
        </div>
      )}

      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <h5 className={cn(
          "text-sm font-bold text-slate-900 dark:text-white mb-1",
          task.status === 'concluído' && "line-through text-slate-400 dark:text-slate-500"
        )}>
          {task.title}
        </h5>
        {task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        <div className="space-y-1.5">
          {task.responsibleRole && (
            <div className="flex items-center gap-1.5 text-[10px] text-violet-600 dark:text-violet-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
              <span>{task.responsibleRole}</span>
            </div>
          )}

          {task.responsible && task.responsible !== task.responsibleRole && (
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <User className="w-3 h-3" />
              <span className="font-medium">{task.responsible}</span>
            </div>
          )}

          {(task.deadline || task.dueDate) && (
            <div className={cn(
              "flex items-center gap-2 text-[10px]",
              isDelayed ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500 dark:text-slate-400"
            )}>
              <Clock className="w-3 h-3" />
              <span>Prazo: {new Date(task.deadline || task.dueDate).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {clientObj && (
              <span 
                className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[130px] flex items-center gap-1"
                title={clientObj.company || clientObj.name}
              >
                <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="truncate">{clientObj.company || clientObj.name}</span>
              </span>
            )}
            {!clientObj && task.clientId && (
              <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-full" title="Cliente">
                <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            {task.projectId && (
              <div className="p-1 bg-violet-50 dark:bg-violet-900/20 rounded-full" title="Projeto">
                <Briefcase className="w-3 h-3 text-violet-600 dark:text-violet-400" />
              </div>
            )}
            {task.leadId && (
              <div className="p-1 bg-amber-50 dark:bg-amber-900/20 rounded-full" title="Lead">
                <Target className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              </div>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusToggle(task);
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              task.status === 'concluído' 
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400"
            )}
            title={task.status === 'concluído' ? "Reabrir tarefa" : "Concluir tarefa"}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
